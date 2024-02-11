import type { ErrorMessage, ValidationErrors, ValidatableField, FormValidityObserver } from "@form-observer/core";
import type { JSX } from "solid-js";

export interface SolidFormValidityObserver<M = string | JSX.Element>
  extends Omit<FormValidityObserver<M>, "configure"> {
  /**
   * An enhanced version of {@link FormValidityObserver.configure} for `Solid`. In addition to configuring a field's
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
   * <input {...configure("amount", { pattern: { value: "\\d+", message: "Number is invalid" } })} />
   *
   * // If the field is too long, the error will display the browser's `tooLong` error string.
   * <input {...configure("comment", { maxlength: 10 })} />
   * <input name="another-comment" maxlength="10" />
   */
  configure<E extends ValidatableField>(name: string, errorMessages: SolidValidationErrors<M, E>): SolidFieldProps;

  /**
   * A custom Solid [`directive`](https://www.solidjs.com/docs/latest/api#use___) used to automatically
   * setup and cleanup a form's observer.
   *
   * **Note**: If you use this `directive`, you should **not** call `observe`, `unobserve`, or `disconnect` directly.
   *
   * @param novalidate Indicates that the
   * {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#novalidate novalidate} attribute should
   * be applied to the `form` element when JavaScript is enabled. Defaults to `true`.
   *
   * @example
   * <form use:autoObserve>
   *   <input name="first-name" type="textbox" required />
   * </form>
   *
   * // Or
   * <form use:autoObserve={true}>
   *   <input name="email" type="email" required />
   * </form>
   */
  autoObserve(form: HTMLFormElement, novalidate: () => boolean): void;
}

export type SolidFieldProps = Pick<
  JSX.InputHTMLAttributes<unknown>,
  "name" | "required" | "minlength" | "min" | "maxlength" | "max" | "step" | "type" | "pattern"
>;

/**
 * An augmetation of {@link ValidationErrors} for `Solid`. Represents the constraints that should be applied
 * to a form field, and the error messages that should be displayed when those constraints are broken.
 */
export interface SolidValidationErrors<M, E extends ValidatableField = ValidatableField>
  extends Pick<ValidationErrors<M, E>, "badinput" | "validate"> {
  // Standard HTML Attributes
  required?: SolidErrorDetails<M, JSX.InputHTMLAttributes<unknown>["required"], E> | ErrorMessage<string, E>;
  minlength?: SolidErrorDetails<M, JSX.InputHTMLAttributes<unknown>["minlength"], E>;
  min?: SolidErrorDetails<M, JSX.InputHTMLAttributes<unknown>["min"], E>;
  maxlength?: SolidErrorDetails<M, JSX.InputHTMLAttributes<unknown>["maxlength"], E>;
  max?: SolidErrorDetails<M, JSX.InputHTMLAttributes<unknown>["max"], E>;
  step?: SolidErrorDetails<M, JSX.InputHTMLAttributes<unknown>["step"], E>;
  type?: SolidErrorDetails<M, JSX.InputHTMLAttributes<unknown>["type"], E>;
  pattern?: SolidErrorDetails<M, JSX.InputHTMLAttributes<unknown>["pattern"], E>;
}

/** An augmentation of `ErrorDetails` for `Solid`. */
export type SolidErrorDetails<M, V, E extends ValidatableField = ValidatableField> =
  | V
  | { render: true; message: ErrorMessage<M, E>; value: V }
  | { render?: false; message: ErrorMessage<string, E>; value: V };

// Expose the `autoObserve` directive to developers using Solid + TS
declare module "solid-js" {
  namespace JSX {
    interface Directives {
      autoObserve: boolean;
    }
  }
}
