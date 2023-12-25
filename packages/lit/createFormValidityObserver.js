import FormValidityObserver from "@form-observer/core/FormValidityObserver";
import { render } from "lit";

/**
 * Creates an enhanced version of the {@link FormValidityObserver} that's more convenient for `Lit` apps
 *
 * @template {import("./index.d.ts").OneOrMany<import("./index.d.ts").EventType>} T
 * @template [M=RenderableLitValue | RenderableLitValue[]]
 * @param {T} types
 * @param {import("./index.d.ts").FormValidityObserverOptions<M>} [options]
 * @returns {FormValidityObserver<M>}
 */
export default function createFormValidityObserver(types, options) {
  const augmentedOptions = /** @type {typeof options} */ ({ renderer: defaultErrorRendererLit, ...options });
  const observer = new FormValidityObserver(types, augmentedOptions);

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

/** @typedef {
      | string 
      | number
      | boolean
      | Node
      | import("lit").HTMLTemplateResult
      | import("lit").SVGTemplateResult
      | import("lit").noChange
      | import("lit").nothing
    } RenderableLitValue
*/

/**
 * The default render function used for the {@link FormValidityObserver}'s `renderer` option in Lit applications.
 * It uses Lit's [`render`](https://lit.dev/docs/api/templates/#render) function to render an `errorMessage` into
 * the proper `errorContainer`.
 *
 * @param {HTMLElement} errorContainer
 * @param {RenderableLitValue | RenderableLitValue[] | null} errorMessage
 * @returns {void}
 */
export function defaultErrorRendererLit(errorContainer, errorMessage) {
  render(errorMessage, errorContainer);
}
