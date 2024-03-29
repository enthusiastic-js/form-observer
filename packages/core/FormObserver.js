import { assertElementIsForm } from "./utils/assertions.js";

class FormObserver {
  /* ---------- Constructor-related Fields. (Must be compatible with `Node.addEventListener`.) ---------- */
  /** @readonly @type {ReadonlyArray<import("./types.d.ts").EventType>} */
  #types;

  /** @readonly @type {ReadonlyArray<import("./types.d.ts").FormFieldListener<import("./types.d.ts").EventType>>} */
  #listeners;

  /** @readonly @type {ReadonlyArray<import("./types.d.ts").ListenerOptions> | undefined} */
  #options;

  /* ---------------------------------------- Other Fields ---------------------------------------- */
  /**
   * @type {Map<Node, Set<HTMLFormElement>>} @readonly Retrieves the collection of observed `HTMLFormElement`s
   * that belong to a given [Root Node](https://developer.mozilla.org/en-US/docs/Web/API/Node/getRootNode).
   */
  #formsCollections = new Map();

  /**
   * @type {Map<HTMLFormElement, Node>} @readonly Retrieves the
   * [Root Node](https://developer.mozilla.org/en-US/docs/Web/API/Node/getRootNode) that owned
   * the provided `HTMLFormElement` when it was originally observed.
   */
  #roots = new Map();

  /* ---------------------------------------- Constructor Setup ---------------------------------------- */
  /**
   * Provides a way to respond to events emitted by the fields belonging to an `HTMLFormElement`.
   *
   * @template {import("./types.d.ts").EventType} T1
   * @overload
   *
   * @param {T1} type The type of event to respond to.
   * @param {import("./types.d.ts").FormFieldListener<T1>} listener The function to call when a form field
   * emits an event matching the provided `type`.
   * @param {import("./types.d.ts").ListenerOptions} [options] The `addEventListener` options for the provided
   * `listener`.
   *
   * See {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener addEventListener}.
   * @returns {FormObserver}
   */

  /**
   * Provides a way to respond to events emitted by the fields belonging to an `HTMLFormElement`.
   *
   * @template {ReadonlyArray<import("./types.d.ts").EventType>} T2
   * @overload
   *
   * @param {T2} types An array containing the types of events to respond to.
   * @param {import("./types.d.ts").FormFieldListener<T2[number]>} listener The function to call when a form field emits
   * an event specified in the list of `types`.
   * @param {import("./types.d.ts").ListenerOptions} [options] The `addEventListener` options for the provided
   * `listener`.
   *
   * See {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener addEventListener}.
   * @returns {FormObserver}
   */

  /**
   * Provides a way to respond to events emitted by the fields belonging to an `HTMLFormElement`.
   *
   * @template {ReadonlyArray<import("./types.d.ts").EventType>} T3
   * @overload
   *
   * @param {T3} types An array containing the types of events to respond to.
   * @param {import("./types.d.ts").TypesToListeners<T3>} listeners An array of event listeners corresponding
   * to the provided list of `types`. When an event matching one of the `types` is emitted by a form field, its
   * corresponding listener function will be called.
   *
   * For example, when a field emits an event matching the 2nd type in `types`, the 2nd listener will be called.
   * @param {import("./types.d.ts").OneOrMany<import("./types.d.ts").ListenerOptions>} [options] An array of
   * `addEventListener` options corresponding to the provided list of `listeners`. When a listener is attached
   * to a form's `Document`, the listener's corresponding set of options will be used to configure it.
   *
   * For example, when the 2nd listener in `listeners` is attached to the `Document`, it will use the 2nd value
   * in the `options` array for its configuration.
   *
   * If `options` is a single value instead of an array, then that value will be used to configure all of
   * the listeners.
   *
   * See {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener addEventListener}.
   * @returns {FormObserver}
   */

  /**
   * @param {import("./types.d.ts").OneOrMany<import("./types.d.ts").EventType>} types
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
          // Only invoke the `listener` if the field's `<form>` was already being observed
          if (!this.#roots.has(/** @type {HTMLFormElement} */ (event.target.form))) return;
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

  /* ---------------------------------------- Class Methods ---------------------------------------- */
  /**
   * Instructs the observer to listen for events emitted from the provided `form`'s fields.
   * The observer will only listen for events which match the types that were specified
   * during its instantiation.
   *
   * @param {HTMLFormElement} form
   * @returns {boolean} `true` if the `form` was not already being observed, and `false` otherwise.
   */
  observe(form) {
    assertElementIsForm(form);
    if (this.#roots.has(form)) return false; // This `<form>` is already being observed

    const root = form.getRootNode();
    let observedForms = this.#formsCollections.get(root);

    // Track the new form
    if (observedForms) {
      observedForms.add(form);
      this.#roots.set(form, root);
    } else {
      observedForms = new Set();
      observedForms.add(form);
      this.#formsCollections.set(root, observedForms);
      this.#roots.set(form, root);
    }

    if (observedForms.size > 1) return true; // Listeners have already been attached to the form's root

    // First OR Second constructor overload was used
    if (this.#listeners.length === 1) {
      const listener = /** @type {EventListener} */ (this.#listeners[0]);
      const options = this.#options?.[0];

      this.#types.forEach((t) => root.addEventListener(t, listener, options));
    }
    // Third constructor overload was used
    else {
      this.#types.forEach((t, i) => {
        root.addEventListener(t, /** @type {EventListener} */ (this.#listeners[i]), this.#options?.[i]);
      });
    }

    return true;
  }

  /**
   * Stops the observer from listening for any events emitted from the provided `form`'s fields.
   *
   * @param {HTMLFormElement} form
   * @returns {boolean} `true` if the `form` was originally being observed, and `false` otherwise.
   */
  unobserve(form) {
    assertElementIsForm(form);
    const root = this.#roots.get(form);
    if (!root) return false; // This `<form>` is NOT being observed. Nothing to do.

    // Stop tracking the form
    this.#roots.delete(form);

    const observedForms = /** @type {Set<HTMLFormElement>} */ (this.#formsCollections.get(root));
    observedForms.delete(form);
    if (observedForms.size !== 0) return true; // Some `form`s still need the listeners attached to this root

    this.#formsCollections.delete(root); // Remove obsolete root

    // First OR Second constructor overload was used
    if (this.#listeners.length === 1) {
      const listener = /** @type {EventListener} */ (this.#listeners[0]);
      const options = this.#options?.[0];

      this.#types.forEach((t) => root.removeEventListener(t, listener, options));
    }
    // Third constructor overload was used
    else {
      this.#types.forEach((t, i) => {
        root.removeEventListener(t, /** @type {EventListener} */ (this.#listeners[i]), this.#options?.[i]);
      });
    }

    return true;
  }

  /** Stops the observer from listening for any events emitted from all `form` fields. @returns {void} */
  disconnect() {
    const iterator = this.#roots.keys();
    for (let form = iterator.next().value; form; form = iterator.next().value) this.unobserve(form);
  }
}

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
