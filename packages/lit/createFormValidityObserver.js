import FormValidityObserver from "@form-observer/core/FormValidityObserver";

/**
 * Creates a version of the {@link FormValidityObserver} that's more convenient for `Lit` apps
 *
 * @template {import("./index.d.ts").EventType | null} T
 * @template [M=string]
 * @template {import("./index.d.ts").ValidatableField} [E=import("./index.d.ts").ValidatableField]
 * @template {boolean} [R=false]
 * @param {T} type
 * @param {import("./index.d.ts").FormValidityObserverOptions<M, E, R>} [options]
 * @returns {FormValidityObserver<M, R>}
 */
export default function createFormValidityObserver(type, options) {
  const observer = new FormValidityObserver(type, options);

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
