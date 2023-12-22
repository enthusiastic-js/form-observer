import { noChange } from "lit";
import { AsyncDirective, directive } from "lit/async-directive.js";

class AutomateDirective extends AsyncDirective {
  #initialized = false;
  /** @type {HTMLFormElement | undefined} */ #form;
  /** @type {import("@form-observer/core").FormObserver | undefined} */ #observer;

  /**
   * @param {import("@form-observer/core").FormObserver} observer
   * @returns {typeof noChange}
   */
  /* istanbul ignore next -- This method is only here to ensure that the Directive is correctly typed */
  // eslint-disable-next-line -- Ignore the problems that stem solely from how Lit requires us to type Directives
  render(observer) {
    return noChange;
  }

  /**
   * @param {import("lit").ElementPart} partInfo
   * @param {[import("@form-observer/core").FormObserver]} data
   */
  async update(partInfo, [observer]) {
    if (this.#initialized) return noChange;
    await /** @type {import("lit").LitElement} */ (partInfo.options?.host)?.updateComplete;

    observer.observe(/** @type {HTMLFormElement} */ (partInfo.element));
    this.#form = /** @type {HTMLFormElement} */ (partInfo.element);
    this.#observer = observer;
    this.#initialized = true;
    return noChange;
  }

  disconnected() {
    this.#observer?.disconnect();
  }

  reconnected() {
    /* istanbul ignore if -- This is a safety precaution, not something that we really care to test. */
    if (!this.isConnected || !this.#form) return;
    this.#observer?.observe(this.#form);
  }
}

/** Automates the setup and teardown for the provided `FormObserver` */
const automate = directive(AutomateDirective);
export default automate;
