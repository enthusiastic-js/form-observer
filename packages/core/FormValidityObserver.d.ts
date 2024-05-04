/*
 * Manually maintained `.d.ts` file until TypeScript supports Generic Constructors in JSDocs.
 * See:
 * - https://github.com/microsoft/TypeScript/issues/55919 (generic constructors)
 * - https://github.com/microsoft/TypeScript/issues/40451 (generic constructors)
 *
 * Note: Although the `FormValidityObserver` doesn't necessarily need a generic constructor, we can't
 * rely on the JS file just yet. The reason for this is that we're still dependent on `FormObserver.d.ts`
 * to provide type information that consumers can use (until _true_ generic constructors are _hopefully_ supported in
 * the future). And since the `FormObserver` name is being exposed in 2 ways (as an `interface` _and_ a `constructor`),
 * TypeScript gets confused when it sees something like `FormValidityObserver extends FormObserver`. (For clarity,
 * TypeScript's confusion happens for the `.d.ts` file that it generates. It has no problem with the JS file itself.)
 * So... We're stuck doing some extra TypeScript dancing for the `FormValidityObserver`. And sadly, that will more or
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
import type { EventType, ValidatableField } from "./types.d.ts";

export type ErrorMessage<M, E extends ValidatableField = ValidatableField> = M | ((field: E) => M);

export type ErrorDetails<M, E extends ValidatableField = ValidatableField, R extends boolean = false> = R extends true
  ?
      | ErrorMessage<M, E>
      | { render?: true; message: ErrorMessage<M, E> }
      | { render: false; message: ErrorMessage<string, E> }
  :
      | ErrorMessage<string, E>
      | { render: true; message: ErrorMessage<M, E> }
      | { render?: false; message: ErrorMessage<string, E> };

/** The errors to display to the user in the various situations where a field fails validation. */
export interface ValidationErrors<M, E extends ValidatableField = ValidatableField, R extends boolean = false> {
  required?: ErrorDetails<M, E, R>;
  minlength?: ErrorDetails<M, E, R>;
  min?: ErrorDetails<M, E, R>;
  maxlength?: ErrorDetails<M, E, R>;
  max?: ErrorDetails<M, E, R>;
  step?: ErrorDetails<M, E, R>;
  type?: ErrorDetails<M, E, R>;
  pattern?: ErrorDetails<M, E, R>;

  /**
   * The error to display when the user's input is malformed, such as an incomplete date.
   * See {@link https://developer.mozilla.org/en-US/docs/Web/API/ValidityState/badInput ValidityState.badInput}
   */
  badinput?: ErrorDetails<M, E, R>;

  /** A function that runs custom validation logic for a field. This validation is always run _last_. */
  validate?(field: E): void | ErrorDetails<M, E, R> | Promise<void | ErrorDetails<M, E, R>>;
}

export interface FormValidityObserverOptions<
  M,
  E extends ValidatableField = ValidatableField,
  R extends boolean = false,
> {
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
   * The type of event that will cause a form field to be revalidated. (Revalidation for a form field
   * is enabled after it is validated at least once -- whether manually or automatically).
   */
  revalidateOn?: EventType;

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
   * Determines the default value for every validation constraint's `render` option. (Also sets the default value
   * for `setFieldError`'s `render` option.)
   */
  renderByDefault?: R;

  /**
   * The default errors to display for the field constraints. (The `validate` option configures the default
   * _custom validation function_ used for all form fields.)
   */
  defaultErrors?: ValidationErrors<M, E, R>;
}

export interface ValidateFieldOptions {
  /** Indicates that the field should be focused and scrolled into view if it fails validation. Defaults to `false`. */
  focus?: boolean;
  /**
   * Enables revalidation for the validated field. Defaults to `true`.
   * (This option is only relevant if a value was provided for the observer's `revalidateOn` constructor option.)
   */
  enableRevalidation?: boolean;
}

export interface ValidateFieldsOptions {
  /**
   * Indicates that the _first_ field in the DOM that fails validation should be focused and scrolled into view.
   * Defaults to `false`.
   */
  focus?: boolean;
  /**
   * Enables revalidation for **all** of the form's fields. Defaults to `true`.
   * (This option is only relevant if a value was provided for the observer's `revalidateOn` constructor option.)
   */
  enableRevalidation?: boolean;
}

interface FormValidityObserverConstructor {
  /**
   * Provides a way to validate an `HTMLFormElement`'s fields (and to display _accessible_ errors for those fields)
   * in response to the events that the fields emit.
   *
   * @param type The type of event that triggers form field validation. (If you _only_ want to validate fields manually,
   * you can specify `null` instead of an event type.)
   */
  new <
    T extends EventType | null,
    M = string,
    E extends ValidatableField = ValidatableField,
    R extends boolean = false,
  >(
    type: T,
    options?: FormValidityObserverOptions<M, E, R>,
  ): FormValidityObserver<M, R>;
}

interface FormValidityObserver<M = string, R extends boolean = false> {
  /**
   * Instructs the observer to watch the validity state of the provided `form`'s fields.
   * Also connects the `form` to the observer's validation methods.
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
   * Also disconnects the `form` from the observer's validation methods.
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
  setFieldError<E extends ValidatableField>(
    name: string,
    message: R extends true ? ErrorMessage<string, E> : ErrorMessage<M, E>,
    render: R extends true ? false : true,
  ): void;

  setFieldError<E extends ValidatableField>(
    name: string,
    message: R extends true ? ErrorMessage<M, E> : ErrorMessage<string, E>,
    render?: R,
  ): void;

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
  configure<E extends ValidatableField>(name: string, errorMessages: ValidationErrors<M, E, R>): void;
}

declare const FormValidityObserver: FormValidityObserverConstructor;
export default FormValidityObserver;

/** The default scrolling function used for {@link FormValidityObserverOptions.scroller} */
export declare function defaultScroller(fieldOrRadiogroup: ValidatableField): void;

/** The default render function for {@link FormValidityObserverOptions.renderer} */
export declare function defaultErrorRenderer(errorContainer: HTMLElement, error: string | null): void;
