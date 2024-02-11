import type { ErrorMessage, ValidationErrors, ValidatableField, FormValidityObserver } from "@form-observer/core";
import type { ActionReturn } from "svelte/action";
import type { HTMLInputAttributes } from "svelte/elements";

export interface SvelteFormValidityObserver<M = string> extends Omit<FormValidityObserver<M>, "configure"> {
  /**
   * An enhanced version of {@link FormValidityObserver.configure} for `Svelte`. In addition to configuring a field's
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
  configure<E extends ValidatableField>(name: string, errorMessages: SvelteValidationErrors<M, E>): SvelteFieldProps;

  /**
   * Svelte `action` used to automatically setup and cleanup a form's observer.
   *
   * **Note**: If you use this `action`, you should **not** call `observe`, `unobserve`, or `disconnect` directly.
   *
   * @param form
   * @param novalidate Indicates that the
   * {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#novalidate novalidate} attribute should
   * be applied to the `form` element when JavaScript is enabled. Defaults to `true`.
   */
  autoObserve(form: HTMLFormElement, novalidate?: boolean): ActionReturn;
}

export type SvelteFieldProps = Pick<
  HTMLInputAttributes,
  "name" | "required" | "minlength" | "min" | "maxlength" | "max" | "step" | "type" | "pattern"
>;

/**
 * An augmetation of {@link ValidationErrors} for `Svelte`. Represents the constraints that should be applied
 * to a form field, and the error messages that should be displayed when those constraints are broken.
 */
export interface SvelteValidationErrors<M, E extends ValidatableField = ValidatableField>
  extends Pick<ValidationErrors<M, E>, "badinput" | "validate"> {
  // Standard HTML Attributes
  required?: SvelteErrorDetails<M, HTMLInputAttributes["required"], E> | ErrorMessage<string, E>;
  minlength?: SvelteErrorDetails<M, HTMLInputAttributes["minlength"], E>;
  min?: SvelteErrorDetails<M, HTMLInputAttributes["min"], E>;
  maxlength?: SvelteErrorDetails<M, HTMLInputAttributes["maxlength"], E>;
  max?: SvelteErrorDetails<M, HTMLInputAttributes["max"], E>;
  step?: SvelteErrorDetails<M, HTMLInputAttributes["step"], E>;
  type?: SvelteErrorDetails<M, HTMLInputAttributes["type"], E>;
  pattern?: SvelteErrorDetails<M, HTMLInputAttributes["pattern"], E>;
}

/** An augmentation of `ErrorDetails` for `Svelte`. */
export type SvelteErrorDetails<M, V, E extends ValidatableField = ValidatableField> =
  | V
  | { render: true; message: ErrorMessage<M, E>; value: V }
  | { render?: false; message: ErrorMessage<string, E>; value: V };
