import type { ErrorMessage, ValidationErrors, ValidatableField, FormValidityObserver } from "@form-observer/core";
import type { InputHTMLAttributes } from "vue";

export interface VueFormValidityObserver<M = string, R extends boolean = false>
  extends Omit<FormValidityObserver<M, R>, "configure"> {
  /**
   * An enhanced version of {@link FormValidityObserver.configure} for `Vue`. In addition to configuring a field's
   * error messages, it generates the props that should be applied to the field based on the provided arguments.
   *
   * Note: If the field is _only_ using the configured `defaultErrors` and/or the browser's default error messages,
   * it _does not_ need to be `configure`d.
   *
   * @param name The `name` of the form field
   * @param errorMessages A `key`-`value` pair of validation constraints (key) and their corresponding
   * configurations (value)
   *
   * @example
   * // If the field is not a valid number, the error will display: "Number is invalid"
   * <input v-bind="configure('amount', { pattern: { value: '\\d+', message: 'Number is invalid' } })" />
   *
   * // If the field is too long, the error will display the browser's `tooLong` error string.
   * <input v-bind="configure('comment', { maxlength: 10 })" />
   * <input name="another-comment" maxlength="10" />
   */
  configure<E extends ValidatableField>(name: string, errorMessages: VueValidationErrors<M, E, R>): VueFieldProps;

  /**
   * Creates a Vue function `ref` used to automatically setup and cleanup a form's observer.
   *
   * **Note**: If you use this `ref`, you should **not** call `observe`, `unobserve`, or `disconnect` directly.
   *
   * @param novalidate Indicates that the
   * {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#novalidate novalidate} attribute should
   * be applied to the `form` element when JavaScript is enabled. Defaults to `true`.
   *
   * @example
   * <form :ref="autoObserve()">
   *   <input name="first-name" type="textbox" required />
   * </form>
   */
  autoObserve(novalidate?: boolean): (formRef: HTMLFormElement | null) => void;
}

export type VueFieldProps = Pick<
  InputHTMLAttributes,
  "name" | "required" | "minlength" | "min" | "maxlength" | "max" | "step" | "type" | "pattern"
>;

/**
 * An augmetation of {@link ValidationErrors} for `Vue`. Represents the constraints that should be applied
 * to a form field, and the error messages that should be displayed when those constraints are broken.
 */
export interface VueValidationErrors<M, E extends ValidatableField = ValidatableField, R extends boolean = false>
  extends Pick<ValidationErrors<M, E, R>, "badinput" | "validate"> {
  // Standard HTML Attributes
  required?: VueErrorDetails<M, InputHTMLAttributes["required"], E, R> | ErrorMessage<R extends true ? M : string, E>;
  minlength?: VueErrorDetails<M, InputHTMLAttributes["minlength"], E, R>;
  min?: VueErrorDetails<M, InputHTMLAttributes["min"], E, R>;
  maxlength?: VueErrorDetails<M, InputHTMLAttributes["maxlength"], E, R>;
  max?: VueErrorDetails<M, InputHTMLAttributes["max"], E, R>;
  step?: VueErrorDetails<M, InputHTMLAttributes["step"], E, R>;
  type?: VueErrorDetails<M, InputHTMLAttributes["type"], E, R>;
  pattern?: VueErrorDetails<M, InputHTMLAttributes["pattern"], E, R>;
}

/** An augmentation of `ErrorDetails` for `Vue`. */
export type VueErrorDetails<M, V, E extends ValidatableField = ValidatableField, R extends boolean = false> =
  | V
  | (R extends true
      ?
          | { render?: true; message: ErrorMessage<M, E>; value: V }
          | { render: false; message: ErrorMessage<string, E>; value: V }
      :
          | { render: true; message: ErrorMessage<M, E>; value: V }
          | { render?: false; message: ErrorMessage<string, E>; value: V });
