import FormValidityObserver from "@form-observer/core/FormValidityObserver";

/**
 * Creates a version of the {@link FormValidityObserver} that's more convenient for `Lit` apps
 *
 * @template {import("./index.d.ts").OneOrMany<import("./index.d.ts").EventType>} T
 * @template [M=string]
 * @param {T} types
 * @param {import("./index.d.ts").FormValidityObserverOptions<M>} [options]
 * @returns {FormValidityObserver<M>}
 */
export default function createFormValidityObserver(types, options) {
  const observer = new FormValidityObserver(types, options);

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
  observer.configure = observer.configure.bind(observer);

  return observer;
}
