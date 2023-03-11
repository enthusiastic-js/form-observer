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
  /**
   * Instructs the observer to listen for events emitted from the provided `form`'s fields.
   * The observer will only listen for events which match the types that were specified
   * during its instantiation.
   *
   * @returns `true` if the `form` was not already being observed, and `false` otherwise.
   */
  observe(form: HTMLFormElement): boolean;

  /**
   * Stops the observer from listening for any events emitted from the provided `form`'s fields.
   * @returns `true` if the `form` was originally being observed, and `false` otherwise.
   */
  unobserve(form: HTMLFormElement): boolean;

  /** Stops the observer from listening for any events emitted from all `form` fields. */
  disconnect(): void;
}

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
    assertEventTypesAreValid(types);
    if (!(types instanceof Array)) {
      assertValidListenerForSingleEventType(listeners);

      this.#types = [types];
      this.#listeners = enhanceListeners(listeners);
      if (options) this.#options = [options as ListenerOptions];
      return;
    }

    assertValidListenersForMultipleEventTypes(types, listeners);
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

  observe(form: HTMLFormElement): boolean {
    if (!(form instanceof HTMLFormElement)) {
      throw new TypeError(`Expected argument to be an instance of \`HTMLFormElement\`. Instead, received ${form}.`);
    }

    if (this.#observedForms.has(form)) return false; // Nothing to do
    this.#observedForms.add(form);

    if (this.#observedForms.size > 1) return true; // Listeners have already been attached

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

    return true;
  }

  unobserve(form: HTMLFormElement): boolean {
    if (!(form instanceof HTMLFormElement)) {
      throw new TypeError(`Expected argument to be an instance of \`HTMLFormElement\`. Instead, received ${form}.`);
    }

    if (!this.#observedForms.has(form)) return false; // Nothing to do
    this.#observedForms.delete(form);

    if (this.#observedForms.size !== 0) return true; // Some `form`s still need the attached listeners

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

    return true;
  }

  disconnect(): void {
    this.#observedForms.forEach((form) => this.unobserve(form));
  }
};

function assertEventTypesAreValid(types: unknown): asserts types is OneOrMany<EventType> {
  if (typeof types === "string") return;
  if (types instanceof Array && types.every((t) => typeof t === "string")) return;

  throw new TypeError("You must provide a `string` or an `array` of strings for the event `types`.");
}

function assertValidListenerForSingleEventType(listener: unknown): asserts listener is FormFieldListener<EventType> {
  if (typeof listener === "function") return;
  throw new TypeError("The `listener` must be a `function` when `types` is a `string`.");
}

function assertValidListenersForMultipleEventTypes(
  types: ReadonlyArray<EventType>,
  listeners: unknown
): asserts listeners is OneOrMany<FormFieldListener<EventType>> {
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
