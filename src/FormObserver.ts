type OneOrMany<T> = T | readonly T[];

/**
 * The set of `HTMLElements` that can belong to an `HTMLFormElement`.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements HTMLFormElement.elements}
 */
type FormField =
  | HTMLButtonElement
  | HTMLFieldSetElement
  | HTMLInputElement
  | HTMLObjectElement
  | HTMLOutputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

type EventType = keyof DocumentEventMap;
type FormFieldEvent<T extends EventType> = DocumentEventMap[T] & { target: FormField };
type FormFieldListener<T extends EventType> = (event: FormFieldEvent<T>) => unknown;
type Options = Parameters<typeof document.addEventListener>[2];

type TypesToListeners<A extends readonly EventType[]> = {
  [Index in keyof A]: FormFieldListener<A[Index]>;
};

interface FormObserverConstructor {
  /**
   * Provides a way to respond to events emitted by the fields belonging to an `HTMLFormElement`.
   *
   * @param type The type of event to respond to
   * @param listener The function to call when a form field emits an event matching the provided `type`
   * @param options The `addEventListener` options for the provided `listener`.
   *
   * See {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener addEventListener}.
   */
  new <T extends EventType>(type: T, listener: FormFieldListener<T>, options?: Options): FormObserver<T>;
  /**
   * Provides a way to respond to events emitted by the fields belonging to an `HTMLFormElement`.
   *
   * @param types An array containing the types of events to respond to
   * @param listener The function to call when a form field emits an event specified in the list of `types`
   * @param options The `addEventListener` options for the provided `listener`.
   *
   * See {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener addEventListener}.
   */
  new <T extends readonly EventType[]>(
    types: T,
    listener: FormFieldListener<T[number]>,
    options?: Options
  ): FormObserver<T>;
  /**
   * Provides a way to respond to events emitted by the fields belonging to an `HTMLFormElement`.
   *
   * @param types An array containing the types of events to respond to
   * @param listeners An array of event listeners corresponding to the provided list of `types`. When an event
   * matching one of the `types` is emitted by a form field, its corresponding function will be called.
   *
   * For example, when a field emits an event matching the 2nd type in `types`, the 2nd listener will be called.
   * @param options An array of `addEventListener` options corresponding to the provided list of `listeners`.
   * When a listener is attached to a form's `Document`, its corresponding options value will be used to
   * configure it.
   *
   * For example, when the 2nd listener in `listeners` is attached to the `Document`, it will use the 2nd options
   * value for its configuration. (If `options` is a single value instead of an array, then that value will
   * be used for all of the listeners.)
   *
   * See {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener addEventListener}.
   */
  new <T extends readonly EventType[]>(
    types: T,
    listeners: TypesToListeners<T>,
    options?: OneOrMany<Options>
  ): FormObserver<T>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This actually does relate to its corresponding class
interface FormObserver<T extends OneOrMany<EventType>> {
  observe(form: HTMLFormElement): void;
  unobserve(form: HTMLFormElement): void;
  disconnect(): void;
}

// TODO: Is `ReadonlyArray<T>` better than `readonly T[]` for readability? I feel like it's more clear...
const FormObserver: FormObserverConstructor = class<T extends OneOrMany<EventType>> {
  // Constructor-related Fields. Must be compatible with `document.addEventListener`
  #types: readonly EventType[];
  #listeners: readonly FormFieldListener<EventType>[];
  #options?: readonly Options[];

  // Other Fields
  #watchedElements = new Set<HTMLFormElement>();

  constructor(types: T, listeners: OneOrMany<FormFieldListener<EventType>>, options?: OneOrMany<Options>) {
    /* -------------------- Internal Helpers -------------------- */
    const enhanceListeners = (originalListeners: typeof listeners): readonly FormFieldListener<EventType>[] => {
      const array = originalListeners instanceof Array ? originalListeners : [originalListeners];

      return array.map((listener) => {
        return (event) => {
          if (!this.#watchedElements.has(event.target.form as HTMLFormElement)) return;
          return listener(event);
        };
      });
    };

    /* -------------------- Constructor Logic -------------------- */
    if (!(types instanceof Array)) {
      this.#types = [types];
      this.#listeners = enhanceListeners(listeners);
      if (options) this.#options = [options as Options];
      return;
    }

    if (!(listeners instanceof Array)) {
      this.#types = types;
      this.#listeners = enhanceListeners(listeners);
      if (options) this.#options = [options as Options];
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

    if (this.#watchedElements.has(form)) return; // Nothing to do
    this.#watchedElements.add(form);

    if (this.#watchedElements.size > 1) return; // Listeners have already been attached

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

    if (!this.#watchedElements.has(form)) return; // Nothing to do
    this.#watchedElements.delete(form);

    if (this.#watchedElements.size !== 0) return; // Some `form`s still need the attached listeners

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
    this.#watchedElements.forEach((form) => this.unobserve(form));
  }
};

export default FormObserver;

// TODO: Delete this code. These are just checks to make sure the types work as expected.
const typeArg = ["input", "cancel"] as const;
const satisfied = ["change", "submit"] satisfies (keyof DocumentEventMap)[];
const singleVal = ["input"];
const nani = new FormObserver("beforeinput", (event) => {}, {});
const halb2 = new FormObserver(["input", "cancel"] as const, (event) => {}, {});
const halb3 = new FormObserver(["input", "cancel"] as const, [() => {}, () => {}], []); // Options as array
const halb4 = new FormObserver(["input", "cancel"] as const, [() => {}, () => {}], {}); // Options as object
const jeep = new FormObserver(["input", "cancel"], () => {}, {});
const jeep2 = new FormObserver(["input", "cancel"], [() => {}, () => {}], []); // Options as array
const jeep3 = new FormObserver(["input", "cancel"], [() => {}, () => {}], {}); // Options as object
