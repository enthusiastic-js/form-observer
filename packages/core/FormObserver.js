import { assertElementIsForm } from "./utils/assertions.js";

/**
 * @template {import("./types.d.ts").OneOrMany<import("./types.d.ts").EventType>} T
 * @type {import("./types.d.ts").FormObserverConstructor}
 */
const FormObserver = class {
  /* ---------- Constructor-related Fields. (Must be compatible with `document.addEventListener`.) ---------- */
  /** @readonly @type {ReadonlyArray<import("./types.d.ts").EventType>} */
  #types;

  /** @readonly @type {ReadonlyArray<import("./types.d.ts").FormFieldListener<import("./types.d.ts").EventType>>} */
  #listeners;

  /** @readonly @type {ReadonlyArray<import("./types.d.ts").ListenerOptions> | undefined} */
  #options;

  /* ---------------------------------------- Other Fields ---------------------------------------- */
  /**
   * @readonly @type {Set<HTMLFormElement>}
   * Contains references to all of the `HTMLFormElement`s which are currently being observed.
   */
  #observedForms = new Set();

  /**
   * @param {T} types
   * @param {import("./types.d.ts").OneOrMany<import("./types.d.ts").FormFieldListener<import("./types.d.ts").EventType>>} listeners
   * @param {import("./types.d.ts").OneOrMany<import("./types.d.ts").ListenerOptions>} options
   */
  constructor(types, listeners, options) {
    /* -------------------- Internal Helpers -------------------- */
    /**
     * @param {typeof listeners} originalListeners
     * @returns {ReadonlyArray<import("./types.d.ts").FormFieldListener<import("./types.js").EventType>>}
     */
    const enhanceListeners = (originalListeners) => {
      const array = originalListeners instanceof Array ? originalListeners : [originalListeners];

      return array.map((listener) => {
        return (event) => {
          if (!this.#observedForms.has(/** @type {HTMLFormElement} */ (event.target.form))) return;
          return listener(event);
        };
      });
    };

    /* -------------------- Constructor Logic -------------------- */
    assertEventTypesAreValid(types);
    if (!(types instanceof Array)) {
      assertValidListenerForSingleEventType(listeners);

      this.#types = [types];
      this.#listeners = enhanceListeners(listeners);
      if (options) this.#options = [/** @type {import("./types.d.ts").ListenerOptions} */ (options)];
      return;
    }

    assertValidListenersForMultipleEventTypes(types, listeners);
    if (!(listeners instanceof Array)) {
      this.#types = types;
      this.#listeners = enhanceListeners(listeners);
      if (options) this.#options = [/** @type {import("./types.d.ts").ListenerOptions} */ (options)];
      return;
    }

    this.#types = types;
    this.#listeners = enhanceListeners(listeners);
    if (options instanceof Array) this.#options = options;
    else this.#options = Array.from({ length: types.length }, () => options);
  }

  /**
   * @param {HTMLFormElement} form
   * @returns {boolean}
   */
  observe(form) {
    assertElementIsForm(form);
    if (this.#observedForms.has(form)) return false; // Nothing to do
    this.#observedForms.add(form);

    if (this.#observedForms.size > 1) return true; // Listeners have already been attached

    // First OR Second constructor overload was used
    if (this.#listeners.length === 1) {
      const listener = /** @type {EventListener} */ (this.#listeners[0]);
      const options = this.#options?.[0];

      this.#types.forEach((t) => form.ownerDocument.addEventListener(t, listener, options));
    }
    // Third constructor overload was used
    else {
      this.#types.forEach((t, i) => {
        form.ownerDocument.addEventListener(t, /** @type {EventListener} */ (this.#listeners[i]), this.#options?.[i]);
      });
    }

    return true;
  }

  /**
   * @param {HTMLFormElement} form
   * @returns {boolean}
   */
  unobserve(form) {
    assertElementIsForm(form);
    if (!this.#observedForms.has(form)) return false; // Nothing to do
    this.#observedForms.delete(form);

    if (this.#observedForms.size !== 0) return true; // Some `form`s still need the attached listeners

    // First OR Second constructor overload was used
    if (this.#listeners.length === 1) {
      const listener = /** @type {EventListener} */ (this.#listeners[0]);
      const options = this.#options?.[0];

      this.#types.forEach((t) => form.ownerDocument.removeEventListener(t, listener, options));
    }
    // Third constructor overload was used
    else {
      this.#types.forEach((t, i) => {
        form.ownerDocument.removeEventListener(
          t,
          /** @type {EventListener} */ (this.#listeners[i]),
          this.#options?.[i],
        );
      });
    }

    return true;
  }

  /** @returns {void} */
  disconnect() {
    this.#observedForms.forEach((form) => this.unobserve(form));
  }
};

/**
 * @param {unknown} types
 * @returns {asserts types is import("./types.d.ts").OneOrMany<import("./types.d.ts").EventType>}
 */
function assertEventTypesAreValid(types) {
  if (typeof types === "string") return;
  if (types instanceof Array && types.every((t) => typeof t === "string")) return;

  throw new TypeError("You must provide a `string` or an `array` of strings for the event `types`.");
}

/**
 * @param {unknown} listener
 * @returns {asserts listener is import("./types.d.ts").FormFieldListener<import("./types.d.ts").EventType>}
 */
function assertValidListenerForSingleEventType(listener) {
  if (typeof listener === "function") return;
  throw new TypeError("The `listener` must be a `function` when `types` is a `string`.");
}

/**
 * @param {ReadonlyArray<import("./types.d.ts").EventType>} types
 * @param {unknown} listeners
 * @returns {asserts listeners is import("./types.d.ts").OneOrMany<import("./types.d.ts").FormFieldListener<import("./types.d.ts").EventType>>}
 */
function assertValidListenersForMultipleEventTypes(types, listeners) {
  if (!(listeners instanceof Array)) {
    if (typeof listeners === "function") return;
    throw new TypeError("The `listeners` must be a `function` or an `array` of functions when `types` is an `array`.");
  }

  if (listeners.some((l) => typeof l !== "function")) {
    throw new TypeError("The `listeners` must be a `function` or an `array` of functions when `types` is an `array`.");
  }

  if (listeners.length === types.length) return;
  throw new TypeError("The `listeners` array must have the same length as the `types` array.");
}

export default FormObserver;
