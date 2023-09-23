import FormObserver from "./FormObserver.js";

const radiogroupSelector = "fieldset[role='radiogroup']";
const attrs = Object.freeze({ "aria-describedby": "aria-describedby", "aria-invalid": "aria-invalid" });

/**
 * @template {import("./types.d.ts").OneOrMany<import("./types.d.ts").EventType>} T
 * @template M
 * @type {import("./types.d.ts").FormValidityObserverConstructor}
 */
const FormValidityObserver = class extends FormObserver {
  /** @type {HTMLFormElement | undefined} The `form` currently being observed by the `FormValidityObserver` */
  #form;

  /** @type {Required<import("./types.d.ts").FormValidityObserverOptions<M>>["scroller"]} */
  #scrollTo;

  /** @type {Required<import("./types.d.ts").FormValidityObserverOptions<M>>["renderer"]} */
  #renderError;

  /**
   * @type {Map<string, import("./types.d.ts").ValidationErrors<M> | undefined>}
   * The {@link configure}d error messages for the various fields belonging to the observed `form`
   */
  #errorMessagesByFieldName = new Map();

  /**
   * @param {T} types
   * @param {import("./types.d.ts").FormValidityObserverOptions<M>} [options]
   */
  constructor(types, options) {
    /**
     * Event listener used to validate form fields in response to user interactions
     *
     * @param {import("./types.d.ts").FormFieldEvent<import("./types.d.ts").EventType>} event
     * @returns {void}
     */
    const eventListener = (event) => {
      const fieldName = event.target.name;
      if (fieldName) this.validateField(fieldName);
    };

    super(types, eventListener, { passive: true, capture: options?.useEventCapturing });
    this.#scrollTo = options?.scroller ?? defaultScroller;
    this.#renderError =
      options?.renderer ??
      /** @type {Required<import("./types.d.ts").FormValidityObserverOptions<M>>["renderer"]} */ (defaultErrorRenderer);
  }

  /**
   * @param {HTMLFormElement} form
   * @returns {boolean}
   */
  observe(form) {
    if (this.#form && form instanceof HTMLFormElement && form !== this.#form) {
      throw new Error(`A single \`${this.constructor.name}\` can only watch 1 form at a time.`);
    }

    const newlyObserved = super.observe(form); // Run assertions and attach handlers before storing `form` locally
    this.#form = form;
    return newlyObserved;
  }

  /**
   * @param {HTMLFormElement} form
   * @returns {boolean}
   */
  unobserve(form) {
    if (form === this.#form) {
      this.#errorMessagesByFieldName.clear();
      this.#form = undefined;
    }

    return super.unobserve(form);
  }

  /** @returns {void} */
  disconnect() {
    if (this.#form) this.unobserve(this.#form);
  }

  /**
   * @param {import("./types.d.ts").ValidateFieldsOptions} [options]
   * @returns {boolean | Promise<boolean>}
   */
  validateFields(options) {
    assertFormExists(this.#form);
    let syncValidationPassed = true;

    /** @type {Promise<boolean>[] | undefined} */
    let pendingValidations;

    /** @type {Set<string>} */
    const validatedRadiogroups = new Set();

    // Validate Each Field
    for (let i = 0; i < this.#form.elements.length; i++) {
      const field = /** @type {import("./types.d.ts").FormField} */ (this.#form.elements[i]);
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
   * @param {{ pass: boolean; validatedRadiogroups: Set<string> }} data The internal data from `validateFields`
   * that needs to be shared with this method
   * @param {import("./types.d.ts").ValidateFieldsOptions | undefined} options The options that were
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
        const field = /** @type {import("./types.d.ts").FormField} */ (controls[i]);
        if (fieldNotValidatable(field)) continue;
        const { name } = field;

        // Avoid looping over the same `radiogroup` more than once
        if (data.validatedRadiogroups.has(name))
          i += /** @type {RadioNodeList} */ (controls.namedItem(name)).length - 1;

        if (getErrorOwningControl(field).getAttribute(attrs["aria-invalid"]) === String(true)) {
          this.#callAttentionTo(field);
          break;
        }
      }
    }

    return false;
  }

  /**
   * @param {string} name
   * @param {import("./types.d.ts").ValidateFieldOptions} [options]
   * @returns {boolean | Promise<boolean>}
   */
  validateField(name, options) {
    const field = this.#getTargetField(name);
    if (!field) return false; // TODO: should we give a warning that the field doesn't exist? Same for other methods.

    field.setCustomValidity(""); // Reset the custom error message in case a default browser error is displayed next.

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
   * @param {import("./types.d.ts").FormField} field The `field` for which the validation was run
   * @param {import("./types.d.ts").ErrorDetails<M> | void} error The error to apply to the `field`, if any
   * @param {import("./types.d.ts").ValidateFieldOptions | undefined} opts The options that were
   * used for the field's validation
   *
   * @returns {boolean} `true` if the field passed validation (indicated by a falsy `error` value) and `false` otherwise.
   */
  #resolveValidation(field, error, opts) {
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
   *
   * @param {import("./types.d.ts").FormField} field
   * @returns {void}
   */
  #callAttentionTo(field) {
    const errorOwner = getErrorOwningControl(field);
    if (!errorOwner.hasAttribute(attrs["aria-describedby"])) {
      field.reportValidity();
      return;
    }

    // Note: Scrolling is done FIRST to avoid bad UX in browsers that don't support `preventScroll`
    this.#scrollTo(errorOwner);
    field.focus({ preventScroll: true }); // TODO: Add `focusVisible: true` when it's supported by Browsers / TypeScript
  }

  /**
   * @param {string} name
   * @param {import("./types.d.ts").ErrorMessage<string> | import("./types.d.ts").ErrorMessage<M>} message
   * @param {boolean} [render]
   * @returns {void}
   */
  setFieldError(name, message, render) {
    const field = this.#getTargetField(name);
    if (!field) return;

    const error = messageIsErrorFunction(message) ? message(field) : message;
    if (!error) return;

    const errorOwner = getErrorOwningControl(field);
    errorOwner.setAttribute(attrs["aria-invalid"], String(true));
    const errorElement = document.getElementById(
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Support Web Components lacking method
    field.setCustomValidity?.(error);
  }

  /**
   * @param {string} name
   * @returns {void}
   */
  clearFieldError(name) {
    const field = this.#getTargetField(name);
    if (!field) return;

    const errorOwner = getErrorOwningControl(field);
    errorOwner.setAttribute(attrs["aria-invalid"], String(false));
    const errorElement = document.getElementById(
      /** @type {string} */ (errorOwner.getAttribute(attrs["aria-describedby"])),
    );

    if (errorElement) errorElement.textContent = "";
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Support Web Components lacking method
    field.setCustomValidity?.("");
  }

  /**
   * @param {string} name
   * @param {import("./types.d.ts").ValidationErrors<M>} errorMessages
   * @returns {void}
   */
  configure(name, errorMessages) {
    if (typeof window === "undefined") return;
    this.#errorMessagesByFieldName.set(name, errorMessages);
  }

  /**
   * **Internal** helper (shared). Returns the correct form field to use for a validation or error-handling action.
   *
   * @param {string} name
   * @returns {import("./types.d.ts").FormField | null}
   */
  #getTargetField(name) {
    assertFormExists(this.#form);
    const field = /** @type {import("./types.d.ts").FormField | RadioNodeList | null} */ (
      this.#form.elements.namedItem(name)
    );
    return field instanceof RadioNodeList ? /** @type {HTMLInputElement} */ (field[0]) : field;
  }
};

export default FormValidityObserver;

/* -------------------- Utility Functions -------------------- */
/**
 * The default scrolling function used for the {@link FormValidityObserver}'s `scroller` option
 *
 * @param {import("./types.d.ts").FormField} fieldOrRadiogroup
 * @returns {void}
 */
export function defaultScroller(fieldOrRadiogroup) {
  fieldOrRadiogroup.scrollIntoView({ behavior: "smooth" });
}

/**
 * The default render function for {@link FormValidityObserver}'s `renderer` option
 *
 * @param {HTMLElement} errorContainer
 * @param {string} error
 * @returns {void}
 */
export function defaultErrorRenderer(errorContainer, error) {
  if ("setHTML" in errorContainer && typeof errorContainer.setHTML === "function") errorContainer.setHTML(error);
  else errorContainer.innerHTML = error; // eslint-disable-line no-param-reassign -- Required to update the DOM
}

/**
 * @param {import("./types.d.ts").FormField} field
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
 * @returns {value is (field: import("./types.d.ts").FormField) => unknown}
 */
function messageIsErrorFunction(value) {
  return typeof value === "function";
}

/**
 * Returns the **prioritized** field constraint that failed validation
 *
 * @param {ValidityState} validity
 * @return {keyof Omit<import("./types.d.ts").ValidationErrors<unknown>, "validate"> | undefined}
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
 * @param {import("./types.d.ts").FormField} field
 * @returns {import("./types.d.ts").FormField}
 */
function getErrorOwningControl(field) {
  const fieldOrRadiogroup = field.type === "radio" ? field.closest(radiogroupSelector) : field;
  if (fieldOrRadiogroup) return /** @type {import("./types.d.ts").FormField} */ (fieldOrRadiogroup);

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
