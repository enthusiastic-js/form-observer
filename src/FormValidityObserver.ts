import FormObserver from "./FormObserver";
import type { OneOrMany, EventType, FormFieldEvent, ListenerOptions, FormField } from "./types";

const radiogroupSelector = "fieldset[role='radiogroup']";
const attrs = Object.freeze({ "aria-describedby": "aria-describedby", "aria-invalid": "aria-invalid" });

type ErrorMessage<M> = M | ((field: FormField) => M);
type ErrorDetails<M> =
  | ErrorMessage<string>
  | { render: true; message: ErrorMessage<M> }
  | { render?: false; message: ErrorMessage<string> };

/** The errors to display to the user in the various situations where a field fails validation. */
interface ValidationErrors<M> {
  // Standard HTML Attributes
  required?: ErrorDetails<M>;
  minlength?: ErrorDetails<M>;
  min?: ErrorDetails<M>;
  maxlength?: ErrorDetails<M>;
  max?: ErrorDetails<M>;
  step?: ErrorDetails<M>;
  type?: ErrorDetails<M>;
  pattern?: ErrorDetails<M>;

  // Custom Validation Properties
  /**
   * The error to display when the user's input is malformed, such as an incomplete date.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ValidityState/badInput ValidityState.badInput}
   */
  badinput?: ErrorDetails<M>;

  /** A function that runs custom validation logic for a field. This validation is always run _last_. */
  validate?(field: FormField): void | ErrorDetails<M> | Promise<void | ErrorDetails<M>>;
}

// NOTE: `T` = "Event Type" and `M` = "[Error] Message Type"
interface FormValidityObserverConstructor {
  /**
   * Provides a way to validate an `HTMLFormElement`'s fields (and to display _accessible_ errors for those fields)
   * in response to the events that the fields emit.
   *
   * @param types The type(s) of event(s) that trigger(s) form field validation.
   * @param options
   */
  new <T extends OneOrMany<EventType>, M = string>(
    types: T,
    options?: FormValidityObserverOptions<M>,
  ): FormValidityObserver<M>;
}

interface FormValidityObserverOptions<M> {
  /**
   * The `addEventListener` options to use for the observer's event listener.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener addEventListener}.
   */
  eventListenerOpts?: ListenerOptions;

  /**
   * The function used to scroll a `field` (or `radiogroup`) that has failed validation into view. Defaults
   * to a function that calls `fieldOrRadiogroup.scrollIntoView()`.
   */
  scroller?(fieldOrRadiogroup: FormField): void;

  /**
   * The function used to render error messages to the DOM when a validation constraint's `render` option is `true`.
   * Defaults to a function that accepts a string and renders it to the DOM as raw HTML.
   *
   * You can replace the default function with your own `renderer` that renders other types of error messages
   * (e.g., DOM Nodes, React Elements, etc.) to the DOM instead.
   */
  renderer?(errorContainer: HTMLElement, errorMessage: M): void;
}

interface FormValidityObserver<M = string> extends FormObserver {
  // PARENT METHODS (for JSDoc overrides)
  /**
   * Instructs the observer to watch the validity state of the provided `form`'s fields.
   * Also connects the `form` to the observer's validation functions.
   *
   * (_Automated_ field validation will only occur when a field emits an event having a type
   * that was specified during the observer's instantiation.)
   *
   * **Note: A `FormValidityObserver` can only watch 1 form at a time.**
   *
   * @returns `true` if the `form` was not already being observed, and `false` otherwise.
   */
  observe(form: HTMLFormElement): boolean;

  /**
   * Stops the observer from watching the validity state of the provided `form`'s fields.
   * Also disconnects the `form` from the observer's validation functions.
   *
   * @returns `true` if the `form` was originally being observed, and `false` otherwise.
   */
  unobserve(form: HTMLFormElement): boolean;

  /**
   * Behaves the same way as `unobserve`, but without the need to provide the currently-observed
   * `form` as an argument.
   */
  disconnect(): void;

  // NEW METHODS
  /**
   * Configures the error messages that will be displayed for a form field's validation constraints.
   * If an error message is not configured for a validation constraint, then the browser's default error message
   * for that constraint will be used instead.
   *
   * Note: If the field is _only_ using the browser's default error messages, it does _not_ need to be `configure`d.
   *
   * @param name The `name` of the form field
   * @param errorMessages A `key`-`value` pair of validation constraints (key) and their corresponding
   * error messages (value)
   *
   * @example
   * // If the field is empty, the error will display: "You must provide a credit card number".
   * // If the field is too long, the error will display the browser's `tooLong` error string.
   * // If the field passes all of its validation constraints, no error message will be shown.
   * observer.configure("credit-card", { required: "You must provide a credit card number". })
   */
  configure(name: string, errorMessages: ValidationErrors<M>): void;

  /**
   * Validates all of the observed form's fields.
   *
   * Runs asynchronously if _any_ of the validated fields use an asynchronous function for the
   * {@link ValidationErrors.validate validate} constraint. Runs synchronously otherwise.
   *
   * @param options
   * @returns `true` if _all_ of the validated fields pass validation and `false` otherwise.
   */
  validateFields(options?: ValidateFieldsOptions): boolean | Promise<boolean>;

  /**
   * Validates the form field with the specified `name`.
   *
   * Runs asynchronously for fields whose {@link ValidationErrors.validate validate} constraint is
   * an asynchronous function. Runs synchronously otherwise.
   *
   * @param name
   * @param options
   * @returns `true` if the field passes validation and `false` otherwise.
   */
  validateField(name: string, options?: ValidateFieldOptions): boolean | Promise<boolean>;

  /**
   * Marks the form field with the specified `name` as invalid (`[aria-invalid="true"]`)
   * and applies the provided error `message` to it.
   *
   * @param name The name of the invalid form field
   * @param message The error message to apply to the invalid form field
   * @param render When `true`, the error `message` will be rendered to the DOM using the observer's
   * {@link FormValidityObserverOptions.renderer `renderer`} function.
   */
  // NOTE: Interface's Overloads MUST be kept in sync with the `ErrorDetails` type
  setFieldError(name: string, message: ErrorMessage<M>, render: true): void;
  setFieldError(name: string, message: ErrorMessage<string>, render?: false): void;

  /**
   * Marks the form field with the specified `name` as valid (`[aria-invalid="false"]`) and clears its error message.
   * @param name
   */
  clearFieldError(name: string): void;
}

interface ValidateFieldOptions {
  /** Indicates that the field should be focused if it fails validation. Defaults to `false`. */
  focus?: boolean;
}

interface ValidateFieldsOptions {
  /** Indicates that the _first_ field in the DOM that fails validation should be focused. Defaults to `false`. */
  focus?: boolean;
}

const FormValidityObserver: FormValidityObserverConstructor = class<T extends OneOrMany<EventType>, M>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Necessary due to a restriction in TS
  extends FormObserver<any>
  implements FormValidityObserver<M>
{
  /** The `form` currently being observed by the `FormValidityObserver` */
  #form?: HTMLFormElement;
  #scrollTo: Required<FormValidityObserverOptions<M>>["scroller"];
  #renderError: Required<FormValidityObserverOptions<M>>["renderer"];

  /** The {@link configure}d error messages for the various fields belonging to the observed `form` */
  #errorMessagesByFieldName: Map<string, ValidationErrors<M> | undefined> = new Map();

  constructor(types: T, { eventListenerOpts, scroller, renderer }: FormValidityObserverOptions<M> = {}) {
    /** Event listener used to validate form fields in response to user interactions */
    const eventListener = (event: FormFieldEvent<EventType>): void => {
      const fieldName = event.target.name;
      if (fieldName) this.validateField(fieldName);
    };

    super(types, eventListener, eventListenerOpts);
    this.#scrollTo = scroller ?? defaultScroller;
    this.#renderError = renderer ?? (defaultErrorRenderer as Required<FormValidityObserverOptions<M>>["renderer"]);
  }

  observe(form: HTMLFormElement): boolean {
    if (this.#form && form instanceof HTMLFormElement && form !== this.#form) {
      // TODO: Figure out why `this.constructor.name` WRONGLY resolves to `_a`. Once fixed, use `name` instead.
      throw new Error("A single `FormValidityObserver` can only watch 1 form at a time.");
    }

    const newlyObserved = super.observe(form); // Run assertions and attach handlers before storing `form` locally
    this.#form = form;
    return newlyObserved;
  }

  unobserve(form: HTMLFormElement): boolean {
    if (form === this.#form) {
      this.#errorMessagesByFieldName.clear();
      this.#form = undefined;
    }

    return super.unobserve(form);
  }

  disconnect(): void {
    if (this.#form) this.unobserve(this.#form);
  }

  validateFields(options?: ValidateFieldsOptions): boolean | Promise<boolean> {
    assertFormExists(this.#form);
    let syncValidationPassed = true;
    let pendingValidations: Promise<boolean>[] | undefined;
    const validatedRadiogroups = new Set<string>();

    // Validate Each Field
    for (let i = 0; i < this.#form.elements.length; i++) {
      const field = this.#form.elements[i] as FormField;
      if (fieldNotValidatable(field)) continue;
      const { name } = field;

      // Avoid validating the same `radiogroup` more than once
      if (validatedRadiogroups.has(name)) {
        const radiogroup = this.#form.elements.namedItem(name) as RadioNodeList;
        i += radiogroup.length - 2; // Skip all remaining radio buttons
        continue;
      }

      // Keep track of radio buttons that get validated
      if (field.type === "radio") validatedRadiogroups.add(name);

      // Validate Field and Update Internal State
      const result = this.validateField(name);
      if (result === true) continue;
      if (result === false) {
        syncValidationPassed = false;
        continue;
      }

      if (pendingValidations) pendingValidations.push(result);
      else pendingValidations = [result];
    }

    if (!pendingValidations) {
      return this.#resolveGroupedValidation({ pass: syncValidationPassed, validatedRadiogroups }, options);
    }

    return Promise.allSettled(pendingValidations).then((results) => {
      const pass = syncValidationPassed && results.every((r) => r.status === "fulfilled" && r.value === true);
      return this.#resolveGroupedValidation({ pass, validatedRadiogroups }, options);
    });
  }

  /**
   * **Internal** helper for {@link validateFields}. Used _strictly_ as a reusable way to handle the result
   * of a _form-wide_ validation attempt.
   *
   * @param data The internal data from `validateFields` that needs to be shared with this method
   * @param options The options that were used for the form's validation
   *
   * @returns `true` if the form passed validation (indicated by a truthy `data.pass` value) and `false` otherwise.
   */
  #resolveGroupedValidation(
    data: { pass: boolean; validatedRadiogroups: Set<string> },
    options: ValidateFieldsOptions | undefined,
  ): boolean {
    if (data.pass) return true;

    // Focus the first invalid field (if requested)
    if (options?.focus) {
      const controls = (this.#form as HTMLFormElement).elements;

      for (let i = 0; i < controls.length; i++) {
        const field = controls[i] as FormField;
        if (fieldNotValidatable(field)) continue;
        const { name } = field;

        // Avoid looping over the same `radiogroup` more than once
        if (data.validatedRadiogroups.has(name)) i += (controls.namedItem(name) as RadioNodeList).length - 1;

        if (getErrorOwningControl(field).getAttribute(attrs["aria-invalid"]) === String(true)) {
          this.#callAttentionTo(field);
          break;
        }
      }
    }

    return false;
  }

  validateField(name: string, options?: ValidateFieldOptions): boolean | Promise<boolean> {
    const field = this.#getTargetField(name);
    if (!field) return false; // TODO: should we give a warning that the field doesn't exist? Same for other methods.

    field.setCustomValidity(""); // Reset the custom error message in case a default browser error is displayed next.

    /*
     * TODO: The errors should be prioritized based on how the browser naturally prioritizes them.
     * Edit: This is actually impossible because browsers are inconsistent with this. So we must warn users instead.
     */

    const constraint = getBrokenConstraint(field.validity);
    if (constraint) {
      const error = this.#errorMessagesByFieldName.get(name)?.[constraint];

      if (typeof error === "object") return this.#resolveValidation(field, error, options);
      return this.#resolveValidation(field, error || field.validationMessage, options);
    }

    // User-driven Validation (MUST BE DONE LAST)
    const errOrPromise = this.#errorMessagesByFieldName.get(name)?.validate?.(field);
    if (errOrPromise instanceof Promise) return errOrPromise.then((e) => this.#resolveValidation(field, e, options));
    return this.#resolveValidation(field, errOrPromise, options);
  }

  /**
   * **Internal** helper for {@link validateField}. Used _strictly_ as a reusable way to handle the result of
   * a field validation attempt.
   *
   * @param field The `field` for which the validation was run
   * @param error The error to apply to the `field`, if any
   * @param options The options that were used for the field's validation
   *
   * @returns `true` if the field passed validation (indicated by a falsy `error` value) and `false` otherwise.
   */
  #resolveValidation(field: FormField, error: ErrorDetails<M> | void, opts: ValidateFieldOptions | undefined): boolean {
    if (!error) {
      this.clearFieldError(field.name);
      return true;
    }

    if (typeof error === "object") this.setFieldError(field.name, error.message, error.render);
    else this.setFieldError(field.name, error);

    if (opts?.focus) this.#callAttentionTo(field);
    return false;
  }

  /**
   * **Internal** helper (shared). Focuses the specified `field` and scrolls it (or its owning `radiogroup`) into view
   * so that its error message is visible.
   */
  #callAttentionTo(field: FormField): void {
    const errorOwner = getErrorOwningControl(field);
    if (!errorOwner.hasAttribute(attrs["aria-describedby"])) {
      field.reportValidity();
      return;
    }

    // Note: Scrolling is done FIRST to avoid bad UX in browsers that don't support `preventScroll`
    this.#scrollTo(errorOwner);
    field.focus({ preventScroll: true }); // TODO: Add `focusVisible: true` when it's supported by Browsers / TypeScript
  }

  setFieldError(name: string, message: ErrorMessage<string> | ErrorMessage<M>, render?: boolean): void {
    const field = this.#getTargetField(name);
    if (!field) return;

    const error = messageIsErrorFunction(message) ? message(field) : message;
    if (!error) return;

    const errorOwner = getErrorOwningControl(field);
    errorOwner.setAttribute(attrs["aria-invalid"], String(true));
    const errorElement = document.getElementById(errorOwner.getAttribute(attrs["aria-describedby"]) as string);

    // Raw HTML Variant
    if (render) {
      // TODO: Should we mark a field as `aria-invalid` if there's nowhere to render the error?
      if (!errorElement) return;
      return this.#renderError(errorElement, error as M);
    }

    if (typeof error !== "string") {
      throw new TypeError("A field's error message must be a `string` when the `render` option is not `true`");
    }

    /*
     * TODO: Maybe explain why we do support BOTH accessible errors AND native browser errors SIMULTANEOUSLY
     * (it's because the native browser behavior will automatically cause an experience like this one)
     */
    // Raw String Variant
    if (errorElement) errorElement.textContent = error;

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Support Web Components without Method
    field.setCustomValidity?.(error);
  }

  clearFieldError(name: string): void {
    const field = this.#getTargetField(name);
    if (!field) return;

    const errorOwner = getErrorOwningControl(field);
    errorOwner.setAttribute(attrs["aria-invalid"], String(false));
    const errorElement = document.getElementById(errorOwner.getAttribute(attrs["aria-describedby"]) as string);

    if (errorElement) errorElement.textContent = "";
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Support Web Components without Method
    field.setCustomValidity?.("");
  }

  configure(name: string, errorMessages: ValidationErrors<M>): void {
    if (typeof window === "undefined") return;
    this.#errorMessagesByFieldName.set(name, errorMessages);
  }

  /** **Internal** helper (shared). Returns the correct form field to use for a validation or error-handling action. */
  #getTargetField(name: string): FormField | null {
    assertFormExists(this.#form);
    const field = this.#form.elements.namedItem(name) as FormField | RadioNodeList | null;
    return field instanceof RadioNodeList ? (field[0] as HTMLInputElement) : field;
  }
};

export default FormValidityObserver;

/* -------------------- Utility Functions -------------------- */
/** The default scrolling function used for {@link FormValidityObserverOptions.scroller} */
export function defaultScroller(fieldOrRadiogroup: FormField): void {
  fieldOrRadiogroup.scrollIntoView({ behavior: "smooth" });
}

/** The default render function for {@link FormValidityObserverOptions.renderer} */
export function defaultErrorRenderer(errorContainer: HTMLElement, error: string): void {
  if ("setHTML" in errorContainer && typeof errorContainer.setHTML === "function") errorContainer.setHTML(error);
  else errorContainer.innerHTML = error; // eslint-disable-line no-param-reassign -- Required to update the DOM
}

function fieldNotValidatable(field: FormField): field is HTMLOutputElement | HTMLObjectElement | HTMLFieldSetElement {
  if (!field.name || field instanceof HTMLOutputElement || field instanceof HTMLObjectElement) return true;
  if (field instanceof HTMLFieldSetElement) return true; // See: https://github.com/whatwg/html/issues/6870
  return false;
}

/**
 * The typeguard used to determine if an error message is a function or a regular value. Note that the `typeof` operator
 * cannot be used directly (i.e., inlined) until https://github.com/microsoft/TypeScript/issues/37663 is resolved.
 */
function messageIsErrorFunction(value: unknown): value is (field: FormField) => unknown {
  return typeof value === "function";
}

/** Returns the **prioritized** field constraint that failed validation */
function getBrokenConstraint(validity: ValidityState): keyof Omit<ValidationErrors<unknown>, "validate"> | undefined {
  // Malformed Inputs
  if (validity.badInput) return "badinput";

  // Omission Errors
  if (validity.valueMissing) return "required";

  // Length / Magnitude Errors
  if (validity.tooShort) return "minlength";
  if (validity.rangeUnderflow) return "min";
  if (validity.tooLong) return "maxlength";
  if (validity.rangeOverflow) return "max";

  // Formatting Errors
  if (validity.stepMismatch) return "step";
  if (validity.typeMismatch) return "type";
  if (validity.patternMismatch) return "pattern";
  return undefined;
}

/**
 * Retrieves the form control that owns a `field`'s error message. If the `field` is a radio button,
 * the error owner is the `radiogroup` to which that `field` belongs. Otherwise, the error owner is
 * the `field` itself.
 */
function getErrorOwningControl(field: FormField): FormField {
  const fieldOrRadiogroup = field.type === "radio" ? field.closest<HTMLFieldSetElement>(radiogroupSelector) : field;
  if (fieldOrRadiogroup) return fieldOrRadiogroup;

  throw new Error("Validated radio buttons must be placed inside a `<fieldset>` with role `radiogroup`");
}

/* -------------------- Local Assertion Utilities -------------------- */
function assertFormExists(form: unknown): asserts form is HTMLFormElement {
  if (form instanceof HTMLFormElement) return;
  throw new Error("This action cannot be performed on a form field before its owning form is `observe`d.");
}

/*
 * TODO: Make a `FUTURE_DOCS` note about how to handle events that fire directly on the element only,
 * like the `invalid` event. In these situations, event delegation would only work if the _capture_
 * phase is leveraged instead of the bubbling phase
 */

/*
 * TODO: Maybe somewhere in our notes we can comment on how `validateField` is like `field.reportValidity`
 * and `validateFields` is like `form.reportValidity` -- conceptually. This is helpful for framing how
 * we should go about designing the API. `form.reportValidity` can't capture everything on its own because
 * of the possibility of custom validation functions (especially considering the possibility of asynchronicity).
 * However, `validateFields` can supply everything that `form.reportValidity` would have otherwise tried to
 * do on its own -- validate each field, return a boolean, etc. ... The only thing we probably won't do is
 * support activating the browser's error popup with `*.reportValidity`. The user can do that on their own
 * if they wish... though we can revisit supporting this sometime in the future.
 *
 * WE SHOULD PROBABLY ADD THIS TO `DEVELOPTMENT_NOTES`
 *
 * On that note ... somewhere in our docs maybe we can do a side by side example.
 *  > "Typically, during a submit event, we would call `form.reportValidity`. However, this is limited because
 *     ... So instead, we use `observer.validateFields`, which means ... "
 *
 *  > "The `HTMLFormElement` doesn't keep track of error states... Why should we?"
 *  Or
 *  > "If the `HTMLFormElement` doesn't keep track of some abstract error state, do we really need to?
 *     after all, we just use the error state to render errors to the DOM don't, we? What we really need is ... "
 */
