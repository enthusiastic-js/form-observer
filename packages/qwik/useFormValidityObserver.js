import FormValidityObserver from "@form-observer/core/FormValidityObserver";
import { useSignal, useComputed$, noSerialize, useVisibleTask$ } from "@builder.io/qwik";

/**
 * Maps the standardized HTML constraint-related attributes to valid Qwik props
 * @satisfies {Record<
     keyof Omit<import("./index.d.ts").ValidationErrors<string>, 
     "badinput" | "validate">, keyof import("./types.d.ts").QwikFieldProps
   >}
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
 * Creates an enhanced version of the {@link FormValidityObserver} that's more convenient for `Qwik` apps
 *
 * @template {import("./index.d.ts").OneOrMany<import("./index.d.ts").EventType>} T
 * @template [M=string]
 * @param {T} types
 * @param {import("./index.d.ts").FormValidityObserverOptions<M>} [options]
 * @returns {import("./types.d.ts").QwikFormValidityObserver<M>}
 */
export default function useFormValidityObserver(types, options) {
  // TODO: We still have to figure out `useComputed`.
  const observer = /** @type {import("./types.d.ts").QwikFormValidityObserver<M>} */ (
    /** @type {unknown} */ (noSerialize(new FormValidityObserver(types, options)))
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
  const originalConfigure = /** @type {FormValidityObserver<M>["configure"]} */ (observer.configure.bind(observer));

  /* -------------------- Enhancements -------------------- */
  // Add automatic setup/teardown
  // TODO: We need automatic teardown.
  // const teardown = useSignal(false);
  // useVisibleTask$(({ cleanup }) => cleanup(() => (teardown.value ? observer.disconnect() : undefined)));

  observer.autoObserve = function autoObserve(novalidate = true) {
    /** @param {HTMLFormElement} qwikRef @returns {void} */
    return (qwikRef) => {
      observer.observe(qwikRef);
      if (novalidate) qwikRef.setAttribute("novalidate", "");
    };
  };

  // Enhanced `configure` method
  observer.configure = function configure(name, errorMessages) {
    const keys = /** @type {Array<keyof import("./types.d.ts").QwikValidationErrors<M>>} */ (
      Object.keys(errorMessages)
    );
    const props = /** @type {import("./types.d.ts").QwikFieldProps} */ ({
      name,
    });
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
