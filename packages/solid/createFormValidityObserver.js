import FormValidityObserver, { defaultErrorRenderer } from "@form-observer/core/FormValidityObserver";
import { onMount, onCleanup } from "solid-js";

/**
 * Creates an enhanced version of the {@link FormValidityObserver} that's more convenient for `Solid` apps
 *
 * @template {import("./index.d.ts").OneOrMany<import("./index.d.ts").EventType>} T
 * @template [M=string | import("solid-js").JSX.Element]
 * @param {T} types
 * @param {import("./index.d.ts").FormValidityObserverOptions<M>} [options]
 * @returns {import("./types.d.ts").SolidFormValidityObserver<M>}
 */
export default function createFormValidityObserver(types, options) {
  const augmentedOptions = /** @type {typeof options} */ ({ renderer: defaultErrorRendererSolid, ...options });

  const observer = /** @type {import("./types.d.ts").SolidFormValidityObserver<M>} */ (
    /** @type {unknown} */ (new FormValidityObserver(types, augmentedOptions))
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
  observer.autoObserve = function autoObserve(form, novalidate) {
    if (novalidate()) form.setAttribute("novalidate", "");
    onMount(() => observer.observe(form));
    onCleanup(() => observer.unobserve(form));
  };

  // Enhanced `configure` method
  observer.configure = function configure(name, errorMessages) {
    const keys = /** @type {Array<keyof import("./types.d.ts").SolidValidationErrors<M>>} */ (
      Object.keys(errorMessages)
    );
    const props = /** @type {import("./types.d.ts").SolidFieldProps} */ ({ name });
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

/**
 * The default render function used for the {@link FormValidityObserver}'s `renderer` option in Solid applications.
 *
 * @param {HTMLElement} errorContainer
 * @param {string | import("solid-js").JSX.Element} errorMessage
 * @returns {void}
 */
export function defaultErrorRendererSolid(errorContainer, errorMessage) {
  if (typeof errorMessage === "string") return defaultErrorRenderer(errorContainer, errorMessage);
  if (errorMessage instanceof Node) return errorContainer.replaceChildren(errorMessage);
  if (errorMessage instanceof Array) {
    const nodes = errorMessage.filter((e) => typeof e === "string" || e instanceof Node);
    return errorContainer.replaceChildren(.../** @type {string | Node[]} */ (nodes));
  }
}
