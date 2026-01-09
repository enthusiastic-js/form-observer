/* ---------------------------------------- General Utility Types ---------------------------------------- */
export type OneOrMany<T> = T | ReadonlyArray<T>;

/* ---------------------------------------- Form-related Utility Types ---------------------------------------- */
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

/** An `HTMLElement` that participates in form validation */
export interface ValidatableField
  extends
    HTMLElement,
    Pick<HTMLInputElement, "name" | "form" | "validity" | "validationMessage" | "willValidate">,
    Partial<Pick<HTMLInputElement, "type" | "setCustomValidity">>,
    Partial<Pick<ElementInternals, "reportValidity">> {
  /**
   * Returns a NodeList of all the label elements that are associated with the form control.
   *
   * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/labels)
   */
  labels?: ElementInternals["labels"] | null;
}

// Utility Types relating to `addEventListener`
export type EventType = keyof DocumentEventMap;
export type FormFieldEvent<T extends EventType> = DocumentEventMap[T] & { target: FormField };
export type FormFieldListener<T extends EventType> = (event: FormFieldEvent<T>) => unknown;
export type ListenerOptions = Parameters<typeof document.addEventListener>[2];
export type TypesToListeners<A extends ReadonlyArray<EventType>> = A extends infer U extends ReadonlyArray<EventType>
  ? { [I in keyof U]: FormFieldListener<U[I]> }
  : never;
