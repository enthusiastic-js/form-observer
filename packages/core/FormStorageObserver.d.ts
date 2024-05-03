/*
 * Manually maintained `.d.ts` file until TypeScript supports Generic Constructors in JSDocs.
 * See:
 * - https://github.com/microsoft/TypeScript/issues/55919 (generic constructors)
 * - https://github.com/microsoft/TypeScript/issues/40451 (generic constructors)
 *
 * Note: Although the `FormStorageObserver` doesn't necessarily need a generic constructor, we can't
 * rely on the JS file just yet. The reason for this is that we're still dependent on `FormObserver.d.ts`
 * to provide type information that consumers can use (until _true_ generic constructors are _hopefully_ supported in
 * the future). And since the `FormObserver` name is being exposed in 2 ways (as an `interface` _and_ a `constructor`),
 * TypeScript gets confused when it sees something like `FormStorageObserver extends FormObserver`. (For clarity,
 * TypeScript's confusion happens for the `.d.ts` file that it generates. It has no problem with the JS file itself.)
 * So... We're stuck doing some extra TypeScript dancing for the `FormStorageObserver`. And sadly, that will more or
 * less be the case until generic constructors are figured out by the TypeScript team. At least, that's our
 * current understanding.
 *
 * Note that even if we remove generic constructors from the `FormStorageObserver` and the `FormValidityObserver`,
 * TypeScript will still get confused. This is because having a single name (`FormObserver`) for 2 entities is
 * still confusing for TypeScript when the `extends` keyword comes into play.
 *
 * So DON'T run off and try to replace this file with the pure JS file. That won't work because TypeScript gets confused
 * when it generates the `.d.ts` files from the JS files. If TypeScript ever allows JS files to be a source of types,
 * that might be another thing that could help us here besides TypeScript supporting generic constructors...
 */
import type FormObserver from "./FormObserver.js";
import type { EventType, OneOrMany } from "./types.d.ts";

interface FormStorageObserverConstructor {
  /**
   * Provides a way to store an `HTMLFormElement`'s data in `localStorage` automatically in response to
   * the events emitted from its fields.
   *
   * @param types The type(s) of event(s) that trigger(s) updates to `localStorage`.
   * @param options
   */
  new <T extends OneOrMany<EventType>>(types: T, options?: FormStorageObserverOptions): FormStorageObserver;

  /** Loads all of the data in `localStorage` related to the provided `form`. */
  load(form: HTMLFormElement): void;
  /**
   * Loads the data in `localStorage` for the field that has the provided `name` and belongs to
   * the provided `form`.
   */
  load(form: HTMLFormElement, name: string): void;

  /** Clears all of the data in `localStorage` related to the provided `form`. */
  clear(form: HTMLFormElement): void;

  /**
   * Clears the data in `localStorage` for the field that has the provided `name` and belongs to
   * the provided `form`.
   */
  clear(form: HTMLFormElement, name: string): void;
}

export interface FormStorageObserverOptions {
  /**
   * Indicates whether or not the observer should automate the loading/removal of a form's `localStorage` data.
   * - `loading` (Default): A form's data will automatically be loaded from `localStorage` when it is observed.
   * - `deletion`: A form's data will automatically be removed from `localStorage` when it is unobserved.
   * - `both`: Behaves as if `loading` and `deletion` were specified simultaneously.
   * - `neither`: The observer will not automate any data loading or data removal.
   */
  automate?: "loading" | "deletion" | "both" | "neither";

  /**
   * Indicates that the observer's event listener should be called during the event capturing phase instead of
   * the event bubbling phase. Defaults to `false`.
   * See {@link https://www.w3.org/TR/DOM-Level-3-Events/#event-flow DOM Event Flow}
   */
  useEventCapturing?: boolean;
}

interface FormStorageObserver extends FormObserver {}

declare const FormStorageObserver: FormStorageObserverConstructor;
export default FormStorageObserver;
