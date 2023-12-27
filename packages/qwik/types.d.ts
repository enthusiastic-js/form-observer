import type { ErrorMessage, ValidationErrors, ValidatableField, FormValidityObserver } from "@form-observer/core";
import type { IntrinsicHTMLElements } from "@builder.io/qwik";

export interface QwikFormValidityObserver<M = string> extends Omit<FormValidityObserver<M>, "configure"> {
  /**
   * An enhanced version of {@link FormValidityObserver.configure} for `Qwik`. In addition to configuring a field's
   * error messages, it generates the props that should be applied to the field based on the provided arguments.
   *
   * Note: If the field is _only_ using the browser's default error messages, it does _not_ need to be `configure`d.
   *
   * @param name The `name` of the form field
   * @param errorMessages A `key`-`value` pair of validation constraints (key) and their corresponding
   * configurations (value)
   *
   * @example
   * // If the field is not a valid number, the error will display: "Number is invalid"
   * <input {...configure("amount", { pattern: { value: "\\d+", message: "Number is invalid" } })} />
   *
   * // If the field is too long, the error will display the browser's `tooLong` error string.
   * <input {...configure("comment", { maxlength: 10 })} />
   * <input name="another-comment" maxLength="10" />
   */
  configure<E extends ValidatableField>(name: string, errorMessages: QwikValidationErrors<M, E>): QwikFieldProps;

  /**
   * Creates a Qwik function `ref` used to automatically setup and cleanup a form's observer.
   *
   * **Note**: If you use this `ref`, you should **not** call `observe`, `unobserve`, or `disconnect` directly.
   *
   * @param novalidate Indicates that the
   * {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#novalidate novalidate} attribute should
   * be applied to the `form` element when JavaScript is enabled. Defaults to `true`.
   *
   * @example
   * <form ref={autoObserve()}>
   *   <input name="first-name" type="textbox" required />
   * </form>
   */
  autoObserve(novalidate?: boolean): (formRef: HTMLFormElement) => void;
}

export type QwikFieldProps = Pick<
  IntrinsicHTMLElements["input"],
  "name" | "required" | "minLength" | "min" | "maxLength" | "max" | "step" | "type" | "pattern"
>;

/**
 * An augmetation of {@link ValidationErrors} for `Qwik`. Represents the constraints that should be applied
 * to a form field, and the error messages that should be displayed when those constraints are broken.
 */
export interface QwikValidationErrors<M, E extends ValidatableField = ValidatableField>
  extends Pick<ValidationErrors<M, E>, "badinput" | "validate"> {
  // Standard HTML Attributes
  required?: QwikErrorDetails<M, IntrinsicHTMLElements["input"]["required"], E> | ErrorMessage<string, E>;
  minlength?: QwikErrorDetails<M, IntrinsicHTMLElements["input"]["minLength"], E>;
  min?: QwikErrorDetails<M, IntrinsicHTMLElements["input"]["min"], E>;
  maxlength?: QwikErrorDetails<M, IntrinsicHTMLElements["input"]["maxLength"], E>;
  max?: QwikErrorDetails<M, IntrinsicHTMLElements["input"]["max"], E>;
  step?: QwikErrorDetails<M, IntrinsicHTMLElements["input"]["step"], E>;
  type?: QwikErrorDetails<M, IntrinsicHTMLElements["input"]["type"], E>;
  pattern?: QwikErrorDetails<M, IntrinsicHTMLElements["input"]["pattern"], E>;
}

/** An augmentation of `ErrorDetails` for `Qwik`. */
export type QwikErrorDetails<M, V, E extends ValidatableField = ValidatableField> =
  | V
  | { render: true; message: ErrorMessage<M, E>; value: V }
  | { render?: false; message: ErrorMessage<string, E>; value: V };
