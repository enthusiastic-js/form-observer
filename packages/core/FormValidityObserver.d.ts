/*
 * Manually maintained `.d.ts` file until TypeScript supports Generic Constructors in JSDocs.
 * See:
 * - https://github.com/microsoft/TypeScript/issues/55919 (generic constructors)
 * - https://github.com/microsoft/TypeScript/issues/40451 (generic constructors)
 */
import type { OneOrMany, EventType, ValidatableField } from "./types.d.ts";

export type ErrorMessage<M, E extends ValidatableField = ValidatableField> = M | ((field: E) => M);

export type ErrorDetails<M, E extends ValidatableField = ValidatableField> =
  | ErrorMessage<string, E>
  | { render: true; message: ErrorMessage<M, E> }
  | { render?: false; message: ErrorMessage<string, E> };

/** The errors to display to the user in the various situations where a field fails validation. */
export interface ValidationErrors<M, E extends ValidatableField = ValidatableField> {
  required?: ErrorDetails<M, E>;
  minlength?: ErrorDetails<M, E>;
  min?: ErrorDetails<M, E>;
  maxlength?: ErrorDetails<M, E>;
  max?: ErrorDetails<M, E>;
  step?: ErrorDetails<M, E>;
  type?: ErrorDetails<M, E>;
  pattern?: ErrorDetails<M, E>;

  /**
   * The error to display when the user's input is malformed, such as an incomplete date.
   * See {@link https://developer.mozilla.org/en-US/docs/Web/API/ValidityState/badInput ValidityState.badInput}
   */
  badinput?: ErrorDetails<M, E>;

  /** A function that runs custom validation logic for a field. This validation is always run _last_. */
  validate?(field: E): void | ErrorDetails<M, E> | Promise<void | ErrorDetails<M, E>>;
}

export interface FormValidityObserverOptions<M, E extends ValidatableField = ValidatableField> {
  /**
   * Indicates that the observer's event listener should be called during the event capturing phase instead of
   * the event bubbling phase. Defaults to `false`.
   * See {@link https://www.w3.org/TR/DOM-Level-3-Events/#event-flow DOM Event Flow}
   */
  useEventCapturing?: boolean;

  /**
   * The function used to scroll a `field` (or `radiogroup`) that has failed validation into view.
   * Defaults to a function that calls `fieldOrRadiogroup.scrollIntoView()`.
   */
  scroller?(fieldOrRadiogroup: ValidatableField): void;

  /**
   * The function used to render error messages to the DOM when a validation constraint's `render` option is `true`.
   * (It will be called with `null` when a field passes validation.) Defaults to a function that accepts a string
   * and renders it to the DOM as raw HTML.
   *
   * You can replace the default function with your own `renderer` that renders other types of error messages
   * (e.g., DOM Nodes, React Elements, etc.) to the DOM instead.
   */
  renderer?(errorContainer: HTMLElement, errorMessage: M | null): void;

  /**
   * The default errors to display for the field constraints. (The `validate` option configures the default
   * _custom validation function_ used for all form fields.)
   */
  defaultErrors?: ValidationErrors<M, E>;
}

export interface ValidateFieldOptions {
  /** Indicates that the field should be focused if it fails validation. Defaults to `false`. */
  focus?: boolean;
}

export interface ValidateFieldsOptions {
  /** Indicates that the _first_ field in the DOM that fails validation should be focused. Defaults to `false`. */
  focus?: boolean;
}

interface FormValidityObserverConstructor {
  /**
   * Provides a way to validate an `HTMLFormElement`'s fields (and to display _accessible_ errors for those fields)
   * in response to the events that the fields emit.
   *
   * @param types The type(s) of event(s) that trigger(s) form field validation.
   */
  new <T extends OneOrMany<EventType>, M = string, E extends ValidatableField = ValidatableField>(
    types: T,
    options?: FormValidityObserverOptions<M, E>,
  ): FormValidityObserver<M>;
}

interface FormValidityObserver<M = string> {
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
   * @param form
   * @returns `true` if the `form` was originally being observed, and `false` otherwise.
   */
  unobserve(form: HTMLFormElement): boolean;

  /**
   * Behaves the same way as `unobserve`, but without the need to provide the currently-observed
   * `form` as an argument.
   */
  disconnect(): void;

  /**
   * Validates all of the observed form's fields.
   *
   * Runs asynchronously if _any_ of the validated fields use an asynchronous function for the
   * {@link ValidationErrors.validate validate} constraint. Runs synchronously otherwise.
   *
   * @param options
   * @returns `true` if all of the validated fields pass validation and `false` otherwise.
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
  setFieldError<E extends ValidatableField>(name: string, message: ErrorMessage<M, E>, render: true): void;
  setFieldError<E extends ValidatableField>(name: string, message: ErrorMessage<string, E>, render?: false): void;

  /**
   * Marks the form field with the specified `name` as valid (`[aria-invalid="false"]`) and clears its error message.
   */
  clearFieldError(name: string): void;

  /**
   * Configures the error messages that will be displayed for a form field's validation constraints.
   * If an error message is not configured for a validation constraint and there is no corresponding
   * {@link FormValidityObserverOptions.defaultErrors default configuration}, then the browser's
   * default error message for that constraint will be used instead.
   *
   * Note: If the field is _only_ using the configured {@link FormValidityObserverOptions.defaultErrors `defaultErrors`}
   * and/or the browser's default error messages, it _does not_ need to be `configure`d.
   *
   * @param name The `name` of the form field
   * @param errorMessages A `key`-`value` pair of validation constraints (key)
   * and their corresponding error messages (value)
   *
   * @example
   * // If the field is empty, the error will display: "You must provide a credit card number".
   * // If the field is too long, the error will display the browser's `tooLong` error string.
   * // If the field passes all of its validation constraints, no error message will be shown.
   * observer.configure("credit-card", { required: "You must provide a credit card number" })
   */
  configure<E extends ValidatableField>(name: string, errorMessages: ValidationErrors<M, E>): void;
}

declare const FormValidityObserver: FormValidityObserverConstructor;
export default FormValidityObserver;

/** The default scrolling function used for {@link FormValidityObserverOptions.scroller} */
export declare function defaultScroller(fieldOrRadiogroup: ValidatableField): void;

/** The default render function for {@link FormValidityObserverOptions.renderer} */
export declare function defaultErrorRenderer(errorContainer: HTMLElement, error: string | null): void;
