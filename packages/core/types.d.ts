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

// Utility Types relating to `addEventListener`
export type EventType = keyof DocumentEventMap;
export type FormFieldEvent<T extends EventType> = DocumentEventMap[T] & { target: FormField };
export type FormFieldListener<T extends EventType> = (event: FormFieldEvent<T>) => unknown;
export type ListenerOptions = Parameters<typeof document.addEventListener>[2];
export type TypesToListeners<A extends ReadonlyArray<EventType>> = A extends infer U extends ReadonlyArray<EventType>
  ? { [I in keyof U]: FormFieldListener<U[I]> }
  : never;

/* ---------------------------------------- Form Observer Types ---------------------------------------- */
export interface FormObserverConstructor {
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
    options?: OneOrMany<ListenerOptions>,
  ): FormObserver;
}

export interface FormObserver {
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

/* ---------------------------------------- Form Storage Observer Types ---------------------------------------- */
/*
 * NOTE: Watch GitHub Issue for Static Methods on Interfaces: https://github.com/microsoft/TypeScript/issues/33892.
 * If this gets supported, then we can enforce these `static` method types on our physical `class expression`.
 */
export interface FormStorageObserverConstructor {
  /**
   * Provides a way to store an `HTMLFormElement`'s data in `localStorage` automatically in response to
   * the events emitted from its fields.
   *
   * @param types The type(s) of event(s) that trigger(s) updates to `localStorage`.
   * @param options
   */
  new <T extends OneOrMany<EventType>>(types: T, options?: FormStorageObserverOptions): FormObserver;

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
   * Indicates that the observer's event listener should be called during the event capturing phase
   * instead of the event bubbling phase. Defaults to `false`.
   * @see {@link https://www.w3.org/TR/DOM-Level-3-Events/#event-flow DOM Event Flow}
   */
  useEventCapturing?: boolean;
}

/* ---------------------------------------- Form Validity Observer Types ---------------------------------------- */
export type ErrorMessage<M> = M | ((field: FormField) => M);
export type ErrorDetails<M> =
  | ErrorMessage<string>
  | { render: true; message: ErrorMessage<M> }
  | { render?: false; message: ErrorMessage<string> };

/** The errors to display to the user in the various situations where a field fails validation. */
export interface ValidationErrors<M> {
  // Standard HTML Attributes
  required?: ErrorDetails<M>;
  minlength?: ErrorDetails<M>;
  min?: ErrorDetails<M>;
  maxlength?: ErrorDetails<M>;
  max?: ErrorDetails<M>;
  step?: ErrorDetails<M>;
  type?: ErrorDetails<M>;
  pattern?: ErrorDetails<M>;

  // Custom Validation Properties
  /**
   * The error to display when the user's input is malformed, such as an incomplete date.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ValidityState/badInput ValidityState.badInput}
   */
  badinput?: ErrorDetails<M>;

  /** A function that runs custom validation logic for a field. This validation is always run _last_. */
  validate?(field: FormField): void | ErrorDetails<M> | Promise<void | ErrorDetails<M>>;
}

// NOTE: `T` = "Event Type" and `M` = "[Error] Message Type"
export interface FormValidityObserverConstructor {
  /**
   * Provides a way to validate an `HTMLFormElement`'s fields (and to display _accessible_ errors for those fields)
   * in response to the events that the fields emit.
   *
   * @param types The type(s) of event(s) that trigger(s) form field validation.
   * @param options
   */
  new <T extends OneOrMany<EventType>, M = string>(
    types: T,
    options?: FormValidityObserverOptions<M>,
  ): FormValidityObserver<M>;
}

export interface FormValidityObserverOptions<M> {
  /**
   * Indicates that the observer's event listener should be called during the event capturing phase
   * instead of the event bubbling phase. Defaults to `false`.
   * @see {@link https://www.w3.org/TR/DOM-Level-3-Events/#event-flow DOM Event Flow}
   */
  useEventCapturing?: boolean;

  /**
   * The function used to scroll a `field` (or `radiogroup`) that has failed validation into view. Defaults
   * to a function that calls `fieldOrRadiogroup.scrollIntoView()`.
   */
  scroller?(fieldOrRadiogroup: FormField): void;

  /**
   * The function used to render error messages to the DOM when a validation constraint's `render` option is `true`.
   * Defaults to a function that accepts a string and renders it to the DOM as raw HTML.
   *
   * You can replace the default function with your own `renderer` that renders other types of error messages
   * (e.g., DOM Nodes, React Elements, etc.) to the DOM instead.
   */
  renderer?(errorContainer: HTMLElement, errorMessage: M): void;
}

export interface FormValidityObserver<M = string> extends FormObserver {
  // PARENT METHODS (for JSDoc overrides)
  /**
   * Instructs the observer to watch the validity state of the provided `form`'s fields.
   * Also connects the `form` to the observer's validation functions.
   *
   * (_Automated_ field validation will only occur when a field emits an event having a type
   * that was specified during the observer's instantiation.)
   *
   * **Note: A `FormValidityObserver` can only watch 1 form at a time.**
   *
   * @returns `true` if the `form` was not already being observed, and `false` otherwise.
   */
  observe(form: HTMLFormElement): boolean;

  /**
   * Stops the observer from watching the validity state of the provided `form`'s fields.
   * Also disconnects the `form` from the observer's validation functions.
   *
   * @returns `true` if the `form` was originally being observed, and `false` otherwise.
   */
  unobserve(form: HTMLFormElement): boolean;

  /**
   * Behaves the same way as `unobserve`, but without the need to provide the currently-observed
   * `form` as an argument.
   */
  disconnect(): void;

  // NEW METHODS
  /**
   * Configures the error messages that will be displayed for a form field's validation constraints.
   * If an error message is not configured for a validation constraint, then the browser's default error message
   * for that constraint will be used instead.
   *
   * Note: If the field is _only_ using the browser's default error messages, it does _not_ need to be `configure`d.
   *
   * @param name The `name` of the form field
   * @param errorMessages A `key`-`value` pair of validation constraints (key) and their corresponding
   * error messages (value)
   *
   * @example
   * // If the field is empty, the error will display: "You must provide a credit card number".
   * // If the field is too long, the error will display the browser's `tooLong` error string.
   * // If the field passes all of its validation constraints, no error message will be shown.
   * observer.configure("credit-card", { required: "You must provide a credit card number". })
   */
  configure(name: string, errorMessages: ValidationErrors<M>): void;

  /**
   * Validates all of the observed form's fields.
   *
   * Runs asynchronously if _any_ of the validated fields use an asynchronous function for the
   * {@link ValidationErrors.validate validate} constraint. Runs synchronously otherwise.
   *
   * @param options
   * @returns `true` if _all_ of the validated fields pass validation and `false` otherwise.
   */
  validateFields(options?: ValidateFieldsOptions): boolean | Promise<boolean>;

  /**
   * Validates the form field with the specified `name`.
   *
   * Runs asynchronously for fields whose {@link ValidationErrors.validate validate} constraint is
   * an asynchronous function. Runs synchronously otherwise.
   *
   * @param name
   * @param options
   * @returns `true` if the field passes validation and `false` otherwise.
   */
  validateField(name: string, options?: ValidateFieldOptions): boolean | Promise<boolean>;

  /**
   * Marks the form field with the specified `name` as invalid (`[aria-invalid="true"]`)
   * and applies the provided error `message` to it.
   *
   * @param name The name of the invalid form field
   * @param message The error message to apply to the invalid form field
   * @param render When `true`, the error `message` will be rendered to the DOM using the observer's
   * {@link FormValidityObserverOptions.renderer `renderer`} function.
   */
  // NOTE: Interface's Overloads MUST be kept in sync with the `ErrorDetails` type
  setFieldError(name: string, message: ErrorMessage<M>, render: true): void;
  setFieldError(name: string, message: ErrorMessage<string>, render?: false): void;

  /**
   * Marks the form field with the specified `name` as valid (`[aria-invalid="false"]`) and clears its error message.
   * @param name
   */
  clearFieldError(name: string): void;
}

export interface ValidateFieldOptions {
  /** Indicates that the field should be focused if it fails validation. Defaults to `false`. */
  focus?: boolean;
}

export interface ValidateFieldsOptions {
  /** Indicates that the _first_ field in the DOM that fails validation should be focused. Defaults to `false`. */
  focus?: boolean;
}
