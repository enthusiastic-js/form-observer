import FormObserver from "./FormObserver.js";

const radiogroupSelector = "fieldset[role='radiogroup']";
const attrs = Object.freeze({
  "aria-describedby": "aria-describedby",
  "aria-invalid": "aria-invalid",
  "data-fvo-revalidate": "data-fvo-revalidate",
});

// NOTE: Generic `T` = Event TYPE. Generic `M` = Error MESSAGE. Generic `E` = ELEMENT. Generic `R` = RENDER by default.

/**
 * @template M
 * @template {import("./types.d.ts").ValidatableField} [E=import("./types.d.ts").ValidatableField]
 * @typedef {M | ((field: E) => M)} ErrorMessage
 */

/**
 * @template M 
 * @template {import("./types.d.ts").ValidatableField} [E=import("./types.d.ts").ValidatableField]
 * @template {boolean} [R=false]
 * @typedef {R extends true
     ?
       | ErrorMessage<M, E>
       | { render?: true; message: ErrorMessage<M, E> }
       | { render: false; message: ErrorMessage<string, E> }
     :
       | ErrorMessage<string, E>
       | { render: true; message: ErrorMessage<M, E> }
       | { render?: false; message: ErrorMessage<string, E> }
   } ErrorDetails
 */

/**
 * The errors to display to the user in the various situations where a field fails validation.
 * @template M
 * @template {import("./types.d.ts").ValidatableField} [E=import("./types.d.ts").ValidatableField]
 * @template {boolean} [R=false]
 * @typedef {Object} ValidationErrors
 *
 * 
 * @property {ErrorDetails<M, E, R>} [required]
 * @property {ErrorDetails<M, E, R>} [minlength]
 * @property {ErrorDetails<M, E, R>} [min]
 * @property {ErrorDetails<M, E, R>} [maxlength]
 * @property {ErrorDetails<M, E, R>} [max]
 * @property {ErrorDetails<M, E, R>} [step]
 * @property {ErrorDetails<M, E, R>} [type]
 * @property {ErrorDetails<M, E, R>} [pattern]
 *
 * 
 * @property {ErrorDetails<M, E, R>} [badinput] The error to display when the user's input is malformed, such as an
 * incomplete date.
 * See {@link https://developer.mozilla.org/en-US/docs/Web/API/ValidityState/badInput ValidityState.badInput}
 *
 * @property {
     (field: E) => void | ErrorDetails<M, E, R> | Promise<void | ErrorDetails<M, E, R>>
   } [validate] A function that runs custom validation logic for a field. This validation is always run _last_.
 */

/**
 * @template M
 * @template {import("./types.d.ts").ValidatableField} [E=import("./types.d.ts").ValidatableField]
 * @template {boolean} [R=false]
 * @typedef {Object} FormValidityObserverOptions
 *
 * @property {boolean} [useEventCapturing] Indicates that the observer's event listener should be called during
 * the event capturing phase instead of the event bubbling phase. Defaults to `false`.
 * See {@link https://www.w3.org/TR/DOM-Level-3-Events/#event-flow DOM Event Flow}
 *
 * @property {(fieldOrRadiogroup: import("./types.d.ts").ValidatableField) => void} [scroller] The function used to
 * scroll a `field` (or `radiogroup`) that has failed validation into view. Defaults to a function that calls
 * `fieldOrRadiogroup.scrollIntoView()`.
 *
 * @property {import("./types.d.ts").EventType} [revalidateOn] The type of event that will cause a form field to be
 * revalidated. (Revalidation for a form field is enabled after it is validated at least once -- whether manually or
 * automatically).
 *
 * @property {(errorContainer: HTMLElement, errorMessage: M | null) => void} [renderer] The function used to render
 * error messages to the DOM when a validation constraint's `render` option is `true`. (It will be called with `null`
 * when a field passes validation.) Defaults to a function that accepts a string and renders it to the DOM as raw HTML.
 *
 * You can replace the default function with your own `renderer` that renders other types of error messages
 * (e.g., DOM Nodes, React Elements, etc.) to the DOM instead.
 *
 * @property {R} [renderByDefault] Determines the default value for every validation constraint's `render` option.
 * (Also sets the default value for {@link FormValidityObserver.setFieldError setFieldError}'s `render` option.)
 *
 * @property {ValidationErrors<M, E, R>} [defaultErrors] The default errors to display for the field constraints.
 * (The `validate` option configures the default _custom validation function_ used for all form fields.)
 */

/**
 * @typedef {Object} ValidateFieldOptions
 * @property {boolean} [focus] Indicates that the field should be focused and scrolled into view if it fails validation.
 * Defaults to `false`.
 *
 * @property {boolean} [enableRevalidation] Enables revalidation for the validated field. Defaults to `true`.
 * (This option is only relevant if a value was provided for the observer's
 * {@link FormValidityObserverOptions.revalidateOn `revalidateOn`} option.)
 */

/**
 * @typedef {Object} ValidateFieldsOptions
 * @property {boolean} [focus] Indicates that the _first_ field in the DOM that fails validation should be focused and
 * scrolled into view. Defaults to `false`.
 *
 * @property {boolean} [enableRevalidation] Enables revalidation for **all** of the form's fields. Defaults to `true`.
 * (This option is only relevant if a value was provided for the observer's
 * {@link FormValidityObserverOptions.revalidateOn `revalidateOn`} option.)
 */

/** @template [M=string] @template {boolean} [R=false] */
class FormValidityObserver extends FormObserver {
  /** @type {HTMLFormElement | undefined} The `form` currently being observed by the `FormValidityObserver` */ #form;
  /** @type {Document | ShadowRoot | undefined} The Root Node for the currently observed `form`. */ #root;

  /** @readonly @type {Required<FormValidityObserverOptions<M>>["scroller"]} */ #scrollTo;
  /** @readonly @type {Required<FormValidityObserverOptions<M>>["renderer"]} */ #renderError;
  /** @readonly @type {FormValidityObserverOptions<M, any, R>["renderByDefault"]} */ #renderByDefault;
  /** @readonly @type {FormValidityObserverOptions<M>["defaultErrors"]} */ #defaultErrors;

  /**
   * @readonly
   * @type {Map<string, ValidationErrors<M, any, R> | undefined>}
   * The {@link configure}d error messages for the various fields belonging to the observed `form`
   */
  #errorMessagesByFieldName = new Map();

  /*
   * TODO: It's a little weird that we have to declare `M`/`R` twice for things to work. Maybe it's related to
   * illegal generic constructors?
   */
  /**
   * @template {import("./types.d.ts").EventType | null} T
   * @template [M=string]
   * @template {import("./types.d.ts").ValidatableField} [E=import("./types.d.ts").ValidatableField]
   * @template {boolean} [R=false]
   * @overload
   *
   * Provides a way to validate an `HTMLFormElement`'s fields (and to display _accessible_ errors for those fields)
   * in response to the events that the fields emit.
   *
   * @param {T} type The type of event that triggers form field validation. (If you _only_ want to validate fields
   * manually, you can specify `null` instead of an event type.)
   * @param {FormValidityObserverOptions<M, E, R>} [options]
   * @returns {FormValidityObserver<M, R>}
   */

  /**
   * @param {import("./types.d.ts").EventType | null} type
   * @param {FormValidityObserverOptions<M, import("./types.d.ts").ValidatableField, R>} [options]
   */
  constructor(type, options) {
    /** @type {import("./types.d.ts").EventType[]} */ const types = [];
    /** @type {((event: Event & {target: import("./types.d.ts").ValidatableField }) => void)[]} */ const listeners = [];

    if (typeof type === "string") {
      types.push(type);
      listeners.push((event) => {
        const fieldName = event.target.name;
        if (fieldName) this.validateField(fieldName);
      });
    }

    if (typeof options?.revalidateOn === "string") {
      types.push(options.revalidateOn);
      listeners.push((event) => {
        const field = event.target;
        if (field.hasAttribute(attrs["data-fvo-revalidate"])) this.validateField(field.name);
      });
    }

    super(types, listeners, { passive: true, capture: options?.useEventCapturing });
    this.#scrollTo = options?.scroller ?? defaultScroller;
    this.#renderError = /** @type {any} Necessary because of double `M`s */ (options?.renderer ?? defaultErrorRenderer);
    this.#renderByDefault = /** @type {any} Necessary because of double `R`s */ (options?.renderByDefault);
    this.#defaultErrors = /** @type {any} Necessary because of double `M`s */ (options?.defaultErrors);
  }

  /**
   * Instructs the observer to watch the validity state of the provided `form`'s fields.
   * Also connects the `form` to the observer's validation methods.
   *
   * (_Automated_ field validation will only occur when a field emits an event having a type
   * that was specified during the observer's instantiation.)
   *
   * **Note: A `FormValidityObserver` can only watch 1 form at a time.**
   *
   * @param {HTMLFormElement} form
   * @returns {boolean} `true` if the `form` was not already being observed, and `false` otherwise.
   */
  observe(form) {
    if (this.#form && form instanceof HTMLFormElement && form !== this.#form) {
      throw new Error(`A single \`${this.constructor.name}\` can only watch 1 form at a time.`);
    }

    const newlyObserved = super.observe(form); // Run assertions and attach handlers before storing `form` locally
    this.#form = form;
    if (newlyObserved) this.#root = /** @type {Document | ShadowRoot} */ (this.#form.getRootNode());
    return newlyObserved;
  }

  /**
   * Stops the observer from watching the validity state of the provided `form`'s fields.
   * Also disconnects the `form` from the observer's validation methods.
   *
   * @param {HTMLFormElement} form
   * @returns {boolean} `true` if the `form` was originally being observed, and `false` otherwise.
   */
  unobserve(form) {
    if (form === this.#form) {
      this.#errorMessagesByFieldName.clear();
      this.#form = undefined;
      this.#root = undefined;
    }

    return super.unobserve(form);
  }

  /**
   * Behaves the same way as `unobserve`, but without the need to provide the currently-observed
   * `form` as an argument. @returns {void}
   */
  disconnect() {
    if (this.#form) this.unobserve(this.#form);
  }

  /**
   * Validates all of the observed form's fields.
   *
   * Runs asynchronously if _any_ of the validated fields use an asynchronous function for the
   * {@link ValidationErrors.validate validate} constraint. Runs synchronously otherwise.
   *
   * @param {ValidateFieldsOptions} [options]
   * @returns {boolean | Promise<boolean>} `true` if all of the validated fields pass validation and `false` otherwise.
   */
  validateFields(options) {
    assertFormExists(this.#form);
    let syncValidationPassed = true;
    /** @type {ValidateFieldOptions} */ const validatorOptions = { enableRevalidation: options?.enableRevalidation };

    /** @type {Promise<boolean>[] | undefined} */
    let pendingValidations;

    /** @type {Set<string>} */
    const validatedRadiogroups = new Set();

    // Validate Each Field
    for (let i = 0; i < this.#form.elements.length; i++) {
      const field = /** @type {import("./types.d.ts").ValidatableField} */ (this.#form.elements[i]);
      if (fieldNotValidatable(field)) continue;
      const { name } = field;

      // Avoid validating the same `radiogroup` more than once
      if (validatedRadiogroups.has(name)) {
        const radiogroup = /** @type {RadioNodeList} */ (this.#form.elements.namedItem(name));
        i += radiogroup.length - 2; // Skip all remaining radio buttons
        continue;
      }

      // Keep track of radio buttons that get validated
      if (field.type === "radio") validatedRadiogroups.add(name);

      // Validate Field and Update Internal State
      const result = this.validateField(name, validatorOptions);
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
   * @param {{ pass: boolean; validatedRadiogroups: Set<string> }} data The internal data from `validateFields`
   * that needs to be shared with this method
   * @param {ValidateFieldsOptions | undefined} options The options that were
   * used for the form's validation
   *
   * @returns {boolean} `true` if the form passed validation (indicated by a truthy `data.pass` value)
   * and `false` otherwise.
   */
  #resolveGroupedValidation(data, options) {
    if (data.pass) return true;

    // Focus the first invalid field (if requested)
    if (options?.focus) {
      const controls = /** @type {HTMLFormElement} */ (this.#form).elements;

      for (let i = 0; i < controls.length; i++) {
        const field = /** @type {import("./types.d.ts").ValidatableField} */ (controls[i]);
        if (fieldNotValidatable(field)) continue;
        const { name } = field;

        // Avoid looping over the same `radiogroup` more than once
        if (data.validatedRadiogroups.has(name)) {
          i += /** @type {RadioNodeList} */ (controls.namedItem(name)).length - 1;
        }

        /* istanbul ignore else -- The structure of our code makes the `else` case impossible */
        if (getErrorOwningControl(field).getAttribute(attrs["aria-invalid"]) === String(true)) {
          this.#callAttentionTo(field);
          break;
        }
      }
    }

    return false;
  }

  /**
   * Validates the form field with the specified `name`.
   *
   * Runs asynchronously for fields whose {@link ValidationErrors.validate validate} constraint is
   * an asynchronous function. Runs synchronously otherwise.
   *
   * @param {string} name
   * @param {ValidateFieldOptions} [options]
   * @returns {boolean | Promise<boolean>} `true` if the field passes validation and `false` otherwise.
   */
  validateField(name, options) {
    const field = this.#getTargetField(name);
    if (!field) return false; // TODO: should we give a warning that the field doesn't exist? Same for other methods.
    if (!field.willValidate) return true;
    if (options?.enableRevalidation ?? true) field.setAttribute(attrs["data-fvo-revalidate"], "");

    field.setCustomValidity?.(""); // Reset the custom error message in case a default browser error is displayed next.

    const constraint = getBrokenConstraint(field.validity);
    if (constraint) {
      const error = this.#errorMessagesByFieldName.get(name)?.[constraint] ?? this.#defaultErrors?.[constraint];

      if (typeof error === "object") return this.#resolveValidation(field, error, options);
      return this.#resolveValidation(field, error || field.validationMessage, options);
    }

    // User-driven Validation (MUST BE DONE LAST)
    const customValidator = this.#errorMessagesByFieldName.get(name)?.validate ?? this.#defaultErrors?.validate;
    const errOrPromise = customValidator?.(field);
    if (errOrPromise instanceof Promise) return errOrPromise.then((e) => this.#resolveValidation(field, e, options));
    return this.#resolveValidation(field, errOrPromise, options);
  }

  /**
   * **Internal** helper for {@link validateField}. Used _strictly_ as a reusable way to handle the result of
   * a field validation attempt.
   *
   * @param {import("./types.d.ts").ValidatableField} field The `field` for which the validation was run
   * @param {ErrorDetails<M, import("./types.d.ts").ValidatableField, boolean> | void} error The error to apply
   * to the `field`, if any
   * @param {ValidateFieldOptions | undefined} options The options that were used for the field's validation
   *
   * @returns {boolean} `true` if the field passed validation (indicated by a falsy `error` value) and `false` otherwise.
   */
  #resolveValidation(field, error, options) {
    if (!error) {
      this.clearFieldError(field.name);
      return true;
    }

    if (typeof error === "object" && "message" in error) {
      this.setFieldError(field.name, /** @type {any} */ (error).message, /** @type {any} */ (error).render);
    } else this.setFieldError(field.name, /** @type {any} */ (error));

    if (options?.focus) this.#callAttentionTo(field);
    return false;
  }

  /**
   * **Internal** helper (shared). Focuses the specified `field` and scrolls it (or its owning `radiogroup`) into view
   * so that its error message is visible.
   *
   * @param {import("./types.d.ts").ValidatableField} field
   * @returns {void}
   */
  #callAttentionTo(field) {
    const errorOwner = getErrorOwningControl(field);
    if (!errorOwner.hasAttribute(attrs["aria-describedby"])) {
      field.reportValidity?.();
      return;
    }

    // Note: Scrolling is done FIRST to avoid bad UX in browsers that don't support `preventScroll`
    this.#scrollTo(errorOwner);
    field.focus({ preventScroll: true }); // TODO: Add `focusVisible: true` when it's supported by Browsers / TypeScript
  }

  // TODO: Do we need to duplicate the documenation for these overloads? (Must wait until GitHub bug is resolved.)
  /**
   * @template {import("./types.d.ts").ValidatableField} E
   * @overload Marks the form field with the specified `name` as invalid (`[aria-invalid="true"]`)
   * and applies the provided error `message` to it.
   *
   * @param {string} name The name of the invalid form field
   * @param {R extends true ? ErrorMessage<string, E> : ErrorMessage<M, E>} message The error message to apply
   * to the invalid form field
   * @param {R extends true ? false : true} render When `true`, the error `message` will be rendered to the DOM
   * using the observer's {@link FormValidityObserverOptions.renderer `renderer`} function.
   * @returns {void}
   */

  /**
   * @template {import("./types.d.ts").ValidatableField} E
   * @overload Marks the form field with the specified `name` as invalid (`[aria-invalid="true"]`)
   * and applies the provided error `message` to it.
   *
   * @param {string} name The name of the invalid form field
   * @param {R extends true ? ErrorMessage<M, E> : ErrorMessage<string, E>} message The error message to apply
   * to the invalid form field
   * @param {R} [render] When `true`, the error `message` will be rendered to the DOM using the observer's
   * {@link FormValidityObserverOptions.renderer `renderer`} function.
   * @returns {void}
   */

  /**
   * @template {import("./types.d.ts").ValidatableField} E
   * @param {string} name
   * @param {ErrorMessage<string, E> | ErrorMessage<M, E>} message
   * @param {boolean} [render]
   * @returns {void}
   */
  setFieldError(name, message, render = this.#renderByDefault) {
    const field = this.#getTargetField(name);
    if (!field) return;

    const error = messageIsErrorFunction(message) ? message(field) : message;
    if (!error) return;

    const errorOwner = getErrorOwningControl(field);
    errorOwner.setAttribute(attrs["aria-invalid"], String(true));

    const errorElement = this.#root?.getElementById(
      /** @type {string} */ (errorOwner.getAttribute(attrs["aria-describedby"])),
    );

    // Raw HTML Variant
    if (render) {
      // TODO: Should we mark a field as `aria-invalid` if there's nowhere to render the error?
      if (!errorElement) return;
      return this.#renderError(errorElement, /** @type {M} */ (error));
    }

    if (typeof error !== "string") {
      throw new TypeError("A field's error message must be a `string` when the `render` option is not `true`");
    }

    // Raw String Variant
    if (errorElement) errorElement.textContent = error;
    field.setCustomValidity?.(error);
  }

  /**
   * Marks the form field with the specified `name` as valid (`[aria-invalid="false"]`) and clears its error message.
   * @param {string} name
   * @returns {void}
   */
  clearFieldError(name) {
    const field = this.#getTargetField(name);
    if (!field) return;

    const errorOwner = getErrorOwningControl(field);
    errorOwner.setAttribute(attrs["aria-invalid"], String(false));

    const errorElement = this.#root?.getElementById(
      /** @type {string} */ (errorOwner.getAttribute(attrs["aria-describedby"])),
    );

    // TODO: Would using a `Symbol("empty")` be better than `null`?
    if (errorElement) this.#renderError(errorElement, null);
    field.setCustomValidity?.("");
  }

  /**
   * Configures the error messages that will be displayed for a form field's validation constraints.
   * If an error message is not configured for a validation constraint and there is no corresponding
   * {@link FormValidityObserverOptions.defaultErrors default configuration}, then the browser's
   * default error message for that constraint will be used instead.
   *
   * Note: If the field is _only_ using the configured {@link FormValidityObserverOptions.defaultErrors `defaultErrors`}
   * and/or the browser's default error messages, it _does not_ need to be `configure`d.
   *
   * @template {import("./types.d.ts").ValidatableField} E
   * @param {string} name The `name` of the form field
   * @param {ValidationErrors<M, E, R>} errorMessages A `key`-`value` pair of validation constraints (key)
   * and their corresponding error messages (value)
   * @returns {void}
   *
   * @example
   * // If the field is empty, the error will display: "You must provide a credit card number".
   * // If the field is too long, the error will display the browser's `tooLong` error string.
   * // If the field passes all of its validation constraints, no error message will be shown.
   * observer.configure("credit-card", { required: "You must provide a credit card number" })
   */
  configure(name, errorMessages) {
    if (typeof window === "undefined") return;
    this.#errorMessagesByFieldName.set(name, errorMessages);
  }

  /**
   * **Internal** helper (shared). Returns the correct form field to use for a validation or error-handling action.
   *
   * @param {string} name
   * @returns {import("./types.d.ts").ValidatableField | null}
   */
  #getTargetField(name) {
    assertFormExists(this.#form);
    const field = /** @type {import("./types.d.ts").ValidatableField | RadioNodeList | null} */ (
      this.#form.elements.namedItem(name)
    );
    return field instanceof RadioNodeList ? /** @type {HTMLInputElement} */ (field[0]) : field;
  }
}

export default FormValidityObserver;

/* -------------------- Utility Functions -------------------- */
/**
 * The default scrolling function used for the {@link FormValidityObserver}'s `scroller` option
 *
 * @param {import("./types.d.ts").ValidatableField} fieldOrRadiogroup
 * @returns {void}
 */
export function defaultScroller(fieldOrRadiogroup) {
  fieldOrRadiogroup.scrollIntoView({ behavior: "smooth" });
}

/**
 * The default render function for {@link FormValidityObserver}'s `renderer` option
 *
 * @param {HTMLElement} errorContainer
 * @param {string | null} errorMessage
 * @returns {void}
 */
export function defaultErrorRenderer(errorContainer, errorMessage) {
  if (errorMessage === null) return errorContainer.replaceChildren();
  // TODO: Try using `setHTML` when it has better browser support.
  errorContainer.innerHTML = errorMessage; // eslint-disable-line no-param-reassign -- Required to update the DOM
}

/**
 * @param {import("./types.d.ts").ValidatableField} field
 * @returns {field is HTMLOutputElement | HTMLObjectElement | HTMLFieldSetElement}
 */
function fieldNotValidatable(field) {
  if (!field.name || field instanceof HTMLOutputElement || field instanceof HTMLObjectElement) return true;
  if (field instanceof HTMLFieldSetElement) return true; // See: https://github.com/whatwg/html/issues/6870
  return false;
}

/**
 * The typeguard used to determine if an error message is a function or a regular value. Note that the `typeof` operator
 * cannot be used directly (i.e., inlined) until https://github.com/microsoft/TypeScript/issues/37663 is resolved.
 *
 * @param {unknown} value
 * @returns {value is (field: import("./types.d.ts").ValidatableField) => unknown}
 */
function messageIsErrorFunction(value) {
  return typeof value === "function";
}

/**
 * Returns the **prioritized** field constraint that failed validation
 *
 * @param {ValidityState} validity
 * @return {keyof Omit<ValidationErrors<unknown>, "validate"> | undefined}
 */
function getBrokenConstraint(validity) {
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
 *
 * @param {import("./types.d.ts").ValidatableField} field
 * @returns {import("./types.d.ts").ValidatableField}
 */
function getErrorOwningControl(field) {
  const fieldOrRadiogroup = field.type === "radio" ? field.closest(radiogroupSelector) : field;
  if (fieldOrRadiogroup) return /** @type {import("./types.d.ts").ValidatableField} */ (fieldOrRadiogroup);

  throw new Error("Validated radio buttons must be placed inside a `<fieldset>` with role `radiogroup`");
}

/* -------------------- Local Assertion Utilities -------------------- */
/**
 * @param {unknown} form
 * @returns {asserts form is HTMLFormElement}
 */
function assertFormExists(form) {
  if (form instanceof HTMLFormElement) return;
  throw new Error("This action cannot be performed on a form field before its owning form is `observe`d.");
}
