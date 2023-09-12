/* -------------------- General Utility Types -------------------- */
export type OneOrMany<T> = T | ReadonlyArray<T>;

/* -------------------- Form-related Utility Types -------------------- */
/**
 * The set of `HTMLElement`s that can belong to an `HTMLFormElement`.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements HTMLFormElement.elements}
 */
export type FormField =
  | HTMLButtonElement
  | HTMLFieldSetElement
  | HTMLInputElement
  | HTMLObjectElement
  | HTMLOutputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

// Utility Types relating to `addEventListener`
export type EventType = keyof DocumentEventMap;
export type FormFieldEvent<T extends EventType> = DocumentEventMap[T] & { target: FormField };
export type FormFieldListener<T extends EventType> = (event: FormFieldEvent<T>) => unknown;
export type ListenerOptions = Parameters<typeof document.addEventListener>[2];
export type TypesToListeners<A extends ReadonlyArray<EventType>> = A extends infer U extends ReadonlyArray<EventType>
  ? { [I in keyof U]: FormFieldListener<U[I]> }
  : never;
