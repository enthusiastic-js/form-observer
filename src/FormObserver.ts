import type { EventType, FormFieldListener, ListenerOptions, TypesToListeners, OneOrMany } from "./types";

interface FormObserverConstructor {
  /**
   * Provides a way to respond to events emitted by the fields belonging to an `HTMLFormElement`.
   *
   * @param type The type of event to respond to.
   * @param listener The function to call when a form field emits an event matching the provided `type`.
   * @param options The `addEventListener` options for the provided `listener`.
   *
   * See {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener addEventListener}.
   */
  new <T extends EventType>(type: T, listener: FormFieldListener<T>, options?: ListenerOptions): FormObserver;

  /**
   * Provides a way to respond to events emitted by the fields belonging to an `HTMLFormElement`.
   *
   * @param types An array containing the types of events to respond to.
   * @param listener The function to call when a form field emits an event specified in the list of `types`.
   * @param options The `addEventListener` options for the provided `listener`.
   *
   * See {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener addEventListener}.
   */
  new <T extends ReadonlyArray<EventType>>(
    types: T,
    listener: FormFieldListener<T[number]>,
    options?: ListenerOptions
  ): FormObserver;

  /**
   * Provides a way to respond to events emitted by the fields belonging to an `HTMLFormElement`.
   *
   * @param types An array containing the types of events to respond to.
   * @param listeners An array of event listeners corresponding to the provided list of `types`. When an event
   * matching one of the `types` is emitted by a form field, its corresponding listener function will be called.
   *
   * For example, when a field emits an event matching the 2nd type in `types`, the 2nd listener will be called.
   * @param options An array of `addEventListener` options corresponding to the provided list of `listeners`.
   * When a listener is attached to a form's `Document`, the listener's corresponding set of options will be
   * used to configure it.
   *
   * For example, when the 2nd listener in `listeners` is attached to the `Document`, it will use the 2nd value
   * in the `options` array for its configuration.
   *
   * If `options` is a single value instead of an array, then that value will be used to configure all of
   * the listeners.)
   *
   * See {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener addEventListener}.
   */
  new <T extends ReadonlyArray<EventType>>(
    types: T,
    listeners: TypesToListeners<T>,
    options?: OneOrMany<ListenerOptions>
  ): FormObserver;
}

interface FormObserver {
  observe(form: HTMLFormElement): void;
  unobserve(form: HTMLFormElement): void;
  disconnect(): void;
}

/*
 * TODO: Generally survey the code to make sure it looks clean/clear/"finalized" before addressing these
 * next 2 TODOs.
 *
 * UPDATE: From what we can tell from this file so far, this code seems reasonable and manageable.
 * Hopefully readers of the code will be able to understand it pretty easily as well.
 */

// (1) TODO: Add `TypeError`s for invalid arguments to the various constructor overloads (ADD TESTS)

/*
 * (2) TODO: Update `observe`/`unobserve` to return a `boolean` indicating whether or not the `form` truly
 * needed to be observed/unobserved. ALSO ADD A WRITEUP ON WHY WE DID THIS. Do NOT return a `boolean`
 * for the `disconnect` method; that would be unnecessary. (ADD TESTS)
 */
const FormObserver: FormObserverConstructor = class<T extends OneOrMany<EventType>> implements FormObserver {
  // Constructor-related Fields. Must be compatible with `document.addEventListener`
  #types: ReadonlyArray<EventType>;
  #listeners: ReadonlyArray<FormFieldListener<EventType>>;
  #options?: ReadonlyArray<ListenerOptions>;

  // Other Fields
  /** Contains references to all of the `HTMLFormElement`s which are currently being observed. */
  #observedForms = new Set<HTMLFormElement>();

  constructor(types: T, listeners: OneOrMany<FormFieldListener<EventType>>, options?: OneOrMany<ListenerOptions>) {
    /* -------------------- Internal Helpers -------------------- */
    const enhanceListeners = (originalListeners: typeof listeners): ReadonlyArray<FormFieldListener<EventType>> => {
      const array = originalListeners instanceof Array ? originalListeners : [originalListeners];

      return array.map((listener) => {
        return (event) => {
          if (!this.#observedForms.has(event.target.form as HTMLFormElement)) return;
          return listener(event);
        };
      });
    };

    /* -------------------- Constructor Logic -------------------- */
    if (!(types instanceof Array)) {
      this.#types = [types];
      this.#listeners = enhanceListeners(listeners);
      if (options) this.#options = [options as ListenerOptions];
      return;
    }

    if (!(listeners instanceof Array)) {
      this.#types = types;
      this.#listeners = enhanceListeners(listeners);
      if (options) this.#options = [options as ListenerOptions];
      return;
    }

    this.#types = types;
    this.#listeners = enhanceListeners(listeners);
    if (options instanceof Array) this.#options = options;
    else this.#options = Array.from({ length: types.length }, () => options);
  }

  observe(form: HTMLFormElement): void {
    if (!(form instanceof HTMLFormElement)) {
      throw new TypeError(`Expected argument to be an instance of \`HTMLFormElement\`. Instead, received ${form}.`);
    }

    if (this.#observedForms.has(form)) return; // Nothing to do
    this.#observedForms.add(form);

    if (this.#observedForms.size > 1) return; // Listeners have already been attached

    // First OR Second constructor overload was used
    if (this.#listeners.length === 1) {
      const listener = this.#listeners[0] as EventListener;
      const options = this.#options?.[0];

      this.#types.forEach((t) => form.ownerDocument.addEventListener(t, listener, options));
    }
    // Third constructor overload was used
    else {
      this.#types.forEach((t, i) => {
        form.ownerDocument.addEventListener(t, this.#listeners[i] as EventListener, this.#options?.[i]);
      });
    }
  }

  unobserve(form: HTMLFormElement): void {
    if (!(form instanceof HTMLFormElement)) {
      throw new TypeError(`Expected argument to be an instance of \`HTMLFormElement\`. Instead, received ${form}.`);
    }

    if (!this.#observedForms.has(form)) return; // Nothing to do
    this.#observedForms.delete(form);

    if (this.#observedForms.size !== 0) return; // Some `form`s still need the attached listeners

    // First OR Second constructor overload was used
    if (this.#listeners.length === 1) {
      const listener = this.#listeners[0] as EventListener;
      const options = this.#options?.[0];

      this.#types.forEach((t) => form.ownerDocument.removeEventListener(t, listener, options));
    }
    // Third constructor overload was used
    else {
      this.#types.forEach((t, i) => {
        form.ownerDocument.removeEventListener(t, this.#listeners[i] as EventListener, this.#options?.[i]);
      });
    }
  }

  disconnect(): void {
    this.#observedForms.forEach((form) => this.unobserve(form));
  }
};

export default FormObserver;
