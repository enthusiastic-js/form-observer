/*
 * Manually maintained `.d.ts` file until TypeScript supports Generic Constructors in JSDocs.
 * See:
 * - https://github.com/microsoft/TypeScript/issues/55919 (generic constructors)
 * - https://github.com/microsoft/TypeScript/issues/40451 (generic constructors)
 */
import type { EventType, FormFieldListener, ListenerOptions, TypesToListeners, OneOrMany } from "./types.d.ts";

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
    options?: ListenerOptions,
  ): FormObserver;

  /**
   * Provides a way to respond to events emitted by the fields belonging to an `HTMLFormElement`.
   *
   * @param types An array containing the types of events to respond to.
   * @param listeners An array of event listeners corresponding to the provided list of `types`.
   * When an event matching one of the `types` is emitted by a form field, its corresponding
   * listener function will be called.
   *
   * For example, when a field emits an event matching the 2nd type in `types`, the 2nd listener will be called.
   * @param options An array of `addEventListener` options corresponding to the provided list of `listeners`.
   * When a listener is attached to a form's `Document`, the listener's corresponding set of options
   * will be used to configure it.
   *
   * For example, when the 2nd listener in `listeners` is attached to the `Document`, it will use the 2nd value
   * in the `options` array for its configuration.
   *
   * If `options` is a single value instead of an array, then that value will be used to configure all of
   * the listeners.
   *
   * See {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener addEventListener}.
   */
  new <T extends ReadonlyArray<EventType>>(
    types: T,
    listeners: TypesToListeners<T>,
    options?: OneOrMany<ListenerOptions>,
  ): FormObserver;
}

interface FormObserver {
  /**
   * Instructs the observer to listen for events emitted from the provided `form`'s fields.
   * The observer will only listen for events which match the types that were specified
   * during its instantiation.
   *
   * @param form
   * @returns `true` if the `form` was not already being observed, and `false` otherwise.
   */
  observe(form: HTMLFormElement): boolean;

  /**
   * Stops the observer from listening for any events emitted from the provided `form`'s fields.
   *
   * @param form
   * @returns `true` if the `form` was originally being observed, and `false` otherwise.
   */
  unobserve(form: HTMLFormElement): boolean;

  /** Stops the observer from listening for any events emitted from all `form` fields. */
  disconnect(): void;
}

declare const FormObserver: FormObserverConstructor;
export default FormObserver;
