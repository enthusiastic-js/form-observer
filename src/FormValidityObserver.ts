import FormObserver from "./FormObserver";
import type { OneOrMany, EventType, FormFieldEvent, ListenerOptions, FormField } from "./types";

const radiogroupSelector = "fieldset[role='radiogroup']";
const attrs = { "aria-describedby": "aria-describedby", "aria-invalid": "aria-invalid" } as const;

// TODO: Should we make `ErrorMessage`/`ErrorDetails` Generic so that we can also render JSX (instead of just strings)?
type ErrorMessage = string | ((field: FormField) => string);
type ErrorDetails = ErrorMessage | { render?: boolean; message: ErrorMessage };

/** The errors to display to the user in the various situations where a field fails validation. */
interface ValidationErrors {
  // Standard HTML Attributes
  required?: ErrorDetails;
  minlength?: ErrorDetails;
  min?: ErrorDetails;
  maxlength?: ErrorDetails;
  max?: ErrorDetails;
  step?: ErrorDetails;
  type?: ErrorDetails;
  pattern?: ErrorDetails;

  // Custom Validation Properties
  /**
   * The error to display when the user's input is malformed, such as an incomplete date.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ValidityState/badInput ValidityState.badInput}
   */
  badinput?: ErrorDetails;

  /** A function that runs custom validation logic for a field. This validation is always run _last_. */
  validate?(field: FormField): void | ErrorDetails | Promise<void | ErrorDetails>;
}

interface FormValidityObserverConstructor {
  /**
   * Provides a way to validate an `HTMLFormElement`'s fields (and to display accessible errors for those fields)
   * in response to the events that the fields emit.
   *
   * @param types The type(s) of event(s) that trigger(s) form field validation.
   * @param options
   */
  new <T extends OneOrMany<EventType>>(types: T, options?: FormValidityObserverOptions): FormValidityObserver;
}

interface FormValidityObserverOptions {
  /**
   * The `addEventListener` options to use for the observer's event listener.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener addEventListener}.
   */
  eventListenerOpts?: ListenerOptions;
}

interface FormValidityObserver extends FormObserver {
  // PARENT METHODS (for JSDoc overrides)
  /**
   * Instructs the observer to watch the validity state of the provided `form`'s fields,
   * and connects the `form` to the observer's validation functions.
   *
   * (Automated field validation will only occur when a field emits an event having a type
   * that was specified during the observer's instantiation.)
   *
   * **Note: A `FormValidityObserver` can only watch 1 form at a time.**
   *
   * @returns `true` if the `form` was not already being observed, and `false` otherwise.
   */
  observe(form: HTMLFormElement): boolean;

  /**
   * Stops the observer from watching the validity state of the provided `form`'s fields, and
   * disconnects the `form` from the observer's validation functions.
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
   * Specifies the error messages to display for a form field's validation constraints. If an error message
   * is not provided for a validation constraint, then the browser's default error message for that constraint
   * will be used instead.
   *
   * Note: If the field is _only_ using the browser's default error messages, it does _not_ need to be `register`ed.
   *
   * @param name The `name` of the form field
   * @param errorMessages A `key`-`value` pair of validation constraints (key) and their corresponding
   * error messages (value)
   *
   * @example
   * // If the field is empty, the error will display: "You must provide a credit card number".
   * // If the field is too long, the error will display the browser's `tooLong` error string.
   * // If the field passes all of its validation constraints, no error message will be shown.
   * register("credit-card", { required: "You must provide a credit card number". })
   */
  register(name: string, errorMessages: ValidationErrors): void;

  /**
   * Validates the form fields specified in the list of field `names`. If no list is provided,
   * then _all_ of the observed form's fields will be validated.
   *
   * Runs asynchronously if _any_ of the _validated_ fields uses an asynchronous function for the
   * {@link ValidationErrors.validate validate} constraint. Runs synchronously otherwise.
   * @param names
   *
   * @returns `true` if _all_ of the _validated_ fields pass validation and `false` otherwise.
   */
  validateFields(names?: string[]): boolean | Promise<boolean>;

  /**
   * Validates the form field with the specified `name`.
   *
   * Runs asynchronously for fields whose {@link ValidationErrors.validate validate} constraint is
   * an asynchronous function. Runs synchronously otherwise.
   *
   * @param name
   * @returns `true` if the field passes validation and `false` otherwise.
   */
  validateField(name: string): boolean | Promise<boolean>;

  /**
   * Marks the form field with the specified `name` as invalid (`[aria-invalid="true"]`)
   * and applies the provided error `message` to it.
   *
   * @param name The name of the invalid form field
   * @param message The error message to apply to the invalid form field
   * @param render When `true`, the error `message` will be rendered to the DOM as HTML instead of a raw string
   */
  setFieldError(name: string, message: ErrorMessage, render?: boolean): void;

  /**
   * Marks the form field with the specified `name` as valid (`[aria-invalid="false"]`) and clears its error message.
   * @param name
   */
  clearFieldError(name: string): void;
}

const FormValidityObserver: FormValidityObserverConstructor = class<T extends OneOrMany<EventType>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Necessary due to a restriction in TS
  extends FormObserver<any>
  implements FormValidityObserver
{
  /** The `form` currently being observed by the `FormValidityObserver` */
  #form?: HTMLFormElement;

  /** The {@link register}ed error messages for the various fields belonging to the observed `form` */
  #errorMessagesByFieldName: Map<string, ValidationErrors | undefined> = new Map();

  constructor(types: T, { eventListenerOpts }: FormValidityObserverOptions = {}) {
    /** Event listener used to validate form fields in response to user interactions */
    const eventListener = (event: FormFieldEvent<EventType>): void => {
      const fieldName = event.target.name;
      if (fieldName) this.validateField(fieldName);
    };

    super(types, eventListener, eventListenerOpts);
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

  validateFields(names?: string[]): boolean | Promise<boolean> {
    assertFormExists(this.#form);
    let syncValidationPassed = true as boolean; // eslint-disable-line prefer-const -- This value is mutated
    let pendingValidations: Promise<boolean>[] | undefined;

    // Validate SPECIFIC fields
    if (names) {
      for (let i = 0; names.length; i++) this.#iterateField(names[i], syncValidationPassed, pendingValidations);
    }
    // Validate ALL fields
    else {
      const validatedFields = new Set<string>();

      for (let i = 0; this.#form.elements.length; i++) {
        const field = this.#form.elements[i] as FormField;
        const { name } = field;

        // Only `name`d fields that can participate in form validation are validated
        if (!name || field instanceof HTMLOutputElement || field instanceof HTMLObjectElement) continue;
        if (field instanceof HTMLFieldSetElement) continue; // See: https://github.com/whatwg/html/issues/6870

        // Avoid validating the same `radiogroup` more than once
        if (validatedFields.has(name)) {
          const radiogroup = this.#form.elements.namedItem(name) as RadioNodeList;
          i += radiogroup.length - 2; // Skip all remaining radio buttons
          continue;
        }

        this.#iterateField(name, syncValidationPassed, pendingValidations);
        validatedFields.add(name);
      }
    }

    if (!pendingValidations) return syncValidationPassed;

    return Promise.allSettled(pendingValidations).then((results) => {
      return syncValidationPassed && results.every((r) => r.status === "fulfilled" && r.value === true);
    });
  }

  /**
   * **Internal** helper for {@link validateFields}. Acts as a _reusable_ way to validate form
   * fields iteratively while **updating the internal state** of {@link validateFields}
   * (i.e., `syncValidationPassed` and `pendingValidations`).
   *
   * @param name The `name` of the form field currently being iterated
   * @param syncValidationPassed The internal `syncValidationPassed` state of {@link validateFields}
   * @param pendingValidations The internal `pendingValidations` state of {@link validateFields}
   */
  #iterateField(name: string, syncValidationPassed: boolean, pendingValidations: Promise<boolean>[] | undefined): void {
    const result = this.validateField(name);
    if (result === true) return;
    if (result === false) {
      syncValidationPassed = false; // eslint-disable-line no-param-reassign -- Mutation is needed here
      return;
    }

    if (pendingValidations) pendingValidations.push(result);
    else pendingValidations = [result]; // eslint-disable-line no-param-reassign -- Mutation is needed here
  }

  validateField(name: string): boolean | Promise<boolean> {
    const field = this.#getTargetField(name);
    if (!field) return false; // TODO: should we give a warning that the field doesn't exist? Same for other methods.

    const { validity } = field;
    field.setCustomValidity(""); // Reset the custom error message in case a default browser error is displayed next.

    /*
     * TODO: The errors should be prioritized based on how the browser naturally prioritizes them.
     * Edit: This is actually impossible because browsers are inconsistent with this. So we must warn users instead.
     */

    // Omission Errors
    if (validity.valueMissing) return Boolean(this.setFieldError(name, ...this.#getErrorDetailsFor(field, "required")));

    // Length / Magnitude Errors
    if (validity.tooShort) return Boolean(this.setFieldError(name, ...this.#getErrorDetailsFor(field, "minlength")));
    if (validity.rangeUnderflow) return Boolean(this.setFieldError(name, ...this.#getErrorDetailsFor(field, "min")));
    if (validity.tooLong) return Boolean(this.setFieldError(name, ...this.#getErrorDetailsFor(field, "maxlength")));
    if (validity.rangeOverflow) return Boolean(this.setFieldError(name, ...this.#getErrorDetailsFor(field, "max")));

    // Pattern Errors
    if (validity.stepMismatch) return Boolean(this.setFieldError(name, ...this.#getErrorDetailsFor(field, "step")));
    if (validity.typeMismatch) return Boolean(this.setFieldError(name, ...this.#getErrorDetailsFor(field, "type")));
    if (validity.patternMismatch)
      return Boolean(this.setFieldError(name, ...this.#getErrorDetailsFor(field, "pattern")));

    // Attribute-independent Errors
    if (validity.badInput) return Boolean(this.setFieldError(name, ...this.#getErrorDetailsFor(field, "badinput")));

    // User-driven Validation (MUST BE DONE LAST)
    const errorOrPromise = this.#errorMessagesByFieldName.get(name)?.validate?.(field);
    if (errorOrPromise instanceof Promise) return errorOrPromise.then((e) => this.#resolveCustomValidation(name, e));
    return this.#resolveCustomValidation(name, errorOrPromise);
  }

  /**
   * **Internal** helper for {@link validateField}. Extracts the error message settings related to a
   * field's constraint (`rule`) into a manageable tuple. Used _strictly_ as a simple, reusable way
   * to pass data to {@link setFieldError}.
   *
   * @param field
   * @param rule The constraint for which the error message details should be retrieved
   */
  #getErrorDetailsFor(field: FormField, rule: Exclude<keyof ValidationErrors, "validate">): [ErrorMessage, boolean] {
    const err = this.#errorMessagesByFieldName.get(field.name)?.[rule];
    return typeof err === "object" ? [err.message, err.render ?? false] : [err || field.validationMessage, false];
  }

  /**
   * **Internal** helper for {@link validateField}. Used _strictly_ as a reusable way to handle the result of
   * a custom validation function.
   *
   * @param fieldName The `name` of the `field` for which the custom validation was run
   * @param error The error returned from the custom validation function, if any
   *
   * @returns `true` if the field passed validation (indicated by a falsy `error` value) and `false` otherwise.
   */
  #resolveCustomValidation(fieldName: string, error: ErrorDetails | void): boolean {
    if (!error) {
      this.clearFieldError(fieldName);
      return true;
    }

    if (typeof error === "object") this.setFieldError(fieldName, error.message, error.render);
    else this.setFieldError(fieldName, error);
    return false;
  }

  setFieldError(name: string, message: ErrorMessage, render?: boolean): void {
    const field = this.#getTargetField(name);
    if (!field) return;
    if (!message) return;

    const radiogroupOrField = field.type === "radio" ? field.closest(radiogroupSelector) : field;
    // TODO: Maybe we should give devs a warning on this instead of failing silently. SAME FOR `clearFieldError`.
    if (!radiogroupOrField) return; // Bail out if a `radio` button does not have a containing `radiogroup`

    radiogroupOrField.setAttribute(attrs["aria-invalid"], String(true));
    const error = typeof message === "function" ? message(field) : message;
    const errorElement = document.getElementById(radiogroupOrField.getAttribute(attrs["aria-describedby"]) as string);

    // Custom HTML Variant
    if (render) {
      if (!errorElement) return;
      if ("setHTML" in errorElement && typeof errorElement.setHTML === "function") errorElement.setHTML(error);
      else errorElement.innerHTML = error;
      return;
    }

    /*
     * TODO: Maybe explain why we do support BOTH accessible errors AND native browser errors SIMULTANEOUSLY
     * (it's because the native browser behavior will automatically cause an experience like this one)
     */
    // Raw String Variant
    if (errorElement) errorElement.textContent = error;
    field.setCustomValidity(error);
  }

  clearFieldError(name: string): void {
    const field = this.#getTargetField(name);
    if (!field) return;

    const radiogroupOrField = field.type === "radio" ? field.closest(radiogroupSelector) : field;
    if (!radiogroupOrField) return; // Bail out if a `radio` button does not have a containing `radiogroup`

    radiogroupOrField.setAttribute(attrs["aria-invalid"], String(false));
    const errorElement = document.getElementById(radiogroupOrField.getAttribute(attrs["aria-describedby"]) as string);

    if (errorElement) errorElement.textContent = "";
    field.setCustomValidity("");
  }

  register(name: string, errorMessages: ValidationErrors): void {
    if (typeof window === "undefined") return;
    this.#errorMessagesByFieldName.set(name, errorMessages);

    // Exit early if no `form` has been observed yet. (This is mainly done for JS-framework implementations.)
    if (!this.#form) return;

    // Verify that a valid field was registered
    const field = this.#getTargetField(name);
    if (!field) throw new Error(`No form field with the name "${name}" was found for registration.`);

    // Warn devs about fields whose attributes are out of sync with their corresponding rules (constraints)
    const rules = Object.keys(errorMessages) as Array<keyof ValidationErrors>;

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (rule === "badinput" || rule === "validate") continue; // Only check standard HTML field attributes
      if (errorMessages[rule] === undefined) continue;

      if (field.hasAttribute(rule)) continue;
      const err = `A field named "${name}" was registered with rule "${rule}" but lacks a corresponding attribute.`;
      throw new Error(err);
    }
  }

  /** **Internal** helper. Returns the correct form field to use for a validation or error-handling action. */
  #getTargetField(name: string): FormField | null {
    assertFormExists(this.#form);
    const field = this.#form.elements.namedItem(name) as FormField | RadioNodeList | null;
    return field instanceof RadioNodeList ? (field[0] as HTMLInputElement) : field;
  }
};

/* -------------------- Local Assertion Utilities -------------------- */
function assertFormExists(form: unknown): asserts form is HTMLFormElement {
  if (form instanceof HTMLFormElement) return;
  throw new Error("This action cannot be performed on a form field before its owning form is `observe`d.");
}

export default FormValidityObserver;

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

/*
 * TODO: Today we realized that once a user registers a form field for validation, ALL of the field's constraints
 * are used in the `validateField` method. This would hold true even if the user supplied `true` for one
 * validation constraint, but `false`/`undefined` for a different constraint on the same field. Of course,
 * it wouldn't make sense for a developer to only warn users of what they do wrong in some scenarios and
 * not others; the browser doesn't allow this either. But this makes it clear that we don't need to support
 * `boolean`s for our `ValidationRules` interface. Once the field is registered, ALL of its constraints
 * will be checked. Technically speaking, the `ValidationRules` could be omitted altogether. Thus, the
 * `ValidationRules` interface defined for the core `FormValidityObserver` is really a `ValidationMessages`
 * interface ... though the `validate()` function is a real validation rule, technically.
 *
 * When we get to the JS Framework implementations of the `FormValidityObserver`, a "ValidationRule"
 * will automatically be accompanied by the appropriate constraint value. So this isn't really something
 * to be concerned with at the JS Framework level; it's something to consider on the core, Pure JS level.
 *
 * Now we have to rethink what `FormValidityObserver.register` really means... Now, we understand that
 * what `register()` really saying is, "Hey, FormValidityObserver, I want you to take FULL RESPONSIBILITY for the
 * validation of this form field!" The constraints passed are just a way of saying, "And by the way, I want you to
 * use these kinds of error messages for these kinds of scenarios, instead of relying on what the browser
 * natively has." The special exception to this reasoning, of course, is the `validate()` property, which
 * technically does its own thing.
 *  --> EDIT: Perhaps more accurately... `register` is just saying, "Please register THESE error messages as
 *      overrides for what the browser will already do automatically..."
 */

/*
 * TODO: Calling `FormValidityObserver.register` implies that the user has custom error messages that they
 * want to display _instead of_ the browser's custom error messages. Therefore, the `errorMessages` argument
 * is now required.
 */
