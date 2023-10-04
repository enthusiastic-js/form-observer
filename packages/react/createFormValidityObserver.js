import FormValidityObserver from "@form-observer/core/FormValidityObserver.js";

/**
 * Maps the standardized HTML constraint-related attributes to valid React props
 * @satisfies {Record<keyof Omit<import("./types.d.ts").ValidationErrors<string>, "badinput" | "validate">, keyof import("./types.d.ts").ReactFieldProps>}
 */
const constraintsMap = Object.freeze({
  required: "required",
  minlength: "minLength",
  min: "min",
  maxlength: "maxLength",
  max: "max",
  step: "step",
  type: "type",
  pattern: "pattern",
});

/**
 * Creates an enhanced version of the {@link FormValidityObserver} that's more convenient for `React` apps
 *
 * @template {import("./types.d.ts").OneOrMany<import("./types.d.ts").EventType>} T
 * @template [M=string]
 * @param {T} types
 * @param {import("./types.d.ts").FormValidityObserverOptions<M>} [options]
 * @returns {import("./types.d.ts").ReactFormValidityObserver<M>}
 */
export default function createFormValidityObserver(types, options) {
  const observer = /** @type {import("./types.d.ts").ReactFormValidityObserver<M>} */ (
    new FormValidityObserver(types, options)
  );

  /* -------------------- Bindings -------------------- */
  // Form Observer Methods
  observer.observe = observer.observe.bind(observer);
  observer.unobserve = observer.unobserve.bind(observer);
  observer.disconnect = observer.disconnect.bind(observer);

  // Validation Methods
  observer.validateFields = observer.validateFields.bind(observer);
  observer.validateField = observer.validateField.bind(observer);
  observer.setFieldError = observer.setFieldError.bind(observer);
  observer.clearFieldError = observer.clearFieldError.bind(observer);

  /** **Private** reference to the original `FormValidityObserver.configure` method */
  const originalConfigure = /** @type {import("./types.d.ts").FormValidityObserver<M>["configure"]} */ (
    observer.configure.bind(observer)
  );

  /* -------------------- Enhancements -------------------- */
  // Add automatic setup/teardown
  observer.autoObserve = function autoObserve() {
    /** @type {HTMLFormElement | null} */
    let form;

    /** @param {typeof form} reactRef */
    return (reactRef) => {
      if (reactRef) {
        form = reactRef;
        return observer.observe(form);
      }

      observer.unobserve(/** @type {HTMLFormElement} */ (form));
      form = null;
    };
  };

  // Enhanced `configure` method
  observer.configure = function configure(name, errorMessages) {
    const keys = /** @type {Array<keyof import("./types.d.ts").ReactValidationErrors<M>>} */ (
      Object.keys(errorMessages)
    );
    const props = /** @type {import("./types.d.ts").ReactFieldProps} */ ({ name });
    const config = /** @type {import("./types.d.ts").ValidationErrors<M>} */ ({});

    // Build `props` object and error `config` object from `errorMessages`
    for (let i = 0; i < keys.length; i++) {
      const constraint = keys[i];

      // Type narrowing on each individual property would be redundant and increase bundle size. So we're using `any`.
      const constraintValue = /** @type {any} */ (errorMessages[constraint]);

      // Constraint Was Omitted
      if (constraintValue == null) continue;
      if (constraint === "required" && constraintValue === false) continue;

      /* ----- Custom Validation Properties ----- */
      if (constraint === "badinput" || constraint === "validate") {
        config[constraint] = constraintValue;
        continue;
      }

      /* ----- Standrd HTML Attributes ----- */
      // Value Only
      if (typeof constraintValue !== "object") {
        if (constraint === "required" && typeof constraintValue !== "boolean") config[constraint] = constraintValue;
        props[constraintsMap[constraint]] = constraint === "required" ? true : constraintValue;
        continue;
      }

      // Value and Message
      if (constraint === "required" && constraintValue.value === false) continue;
      props[constraintsMap[constraint]] = constraintValue.value;
      config[constraint] = constraintValue;
    }

    originalConfigure(name, config);
    return props;
  };

  return observer;
}