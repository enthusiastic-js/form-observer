import FormValidityObserver from "@form-observer/core/FormValidityObserver";

/**
 * Creates an enhanced version of the {@link FormValidityObserver} that's more convenient for `Svelte` apps
 *
 * @template {import("./index.d.ts").OneOrMany<import("./index.d.ts").EventType>} T
 * @template [M=string]
 * @param {T} types
 * @param {import("./index.d.ts").FormValidityObserverOptions<M>} [options]
 * @returns {import("./types.d.ts").SvelteFormValidityObserver<M>}
 */
export default function createFormValidityObserver(types, options) {
  const observer = /** @type {import("./types.d.ts").SvelteFormValidityObserver<M>} */ (
    /** @type {unknown} */ (new FormValidityObserver(types, options))
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

  /** **Private** reference to the original {@link FormValidityObserver.configure} method */
  const originalConfigure = /** @type {FormValidityObserver<M>["configure"]} */ (observer.configure.bind(observer));

  /* -------------------- Enhancements -------------------- */
  // Add automatic setup/teardown
  observer.autoObserve = function autoObserve(form, novalidate = true) {
    observer.observe(form);
    if (novalidate) form.setAttribute("novalidate", "");

    return {
      destroy() {
        observer.unobserve(form);
      },
    };
  };

  // Enhanced `configure` method
  observer.configure = function configure(name, errorMessages) {
    const keys = /** @type {Array<keyof import("./types.d.ts").SvelteValidationErrors<M>>} */ (
      Object.keys(errorMessages)
    );
    const props = /** @type {import("./types.d.ts").SvelteFieldProps} */ ({ name });
    const config = /** @type {import("./index.d.ts").ValidationErrors<M>} */ ({});

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
        props[constraint] = constraint === "required" ? true : constraintValue;
        continue;
      }

      // Value and Message
      if (constraint === "required" && constraintValue.value === false) continue;
      props[constraint] = constraintValue.value;
      config[constraint] = constraintValue;
    }

    originalConfigure(name, config);
    return props;
  };

  return observer;
}
