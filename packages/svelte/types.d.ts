import type { ErrorMessage, ValidationErrors, FormValidityObserver } from "@form-observer/core/types.d.ts";
import type { Action } from "svelte/action";
import type { HTMLInputAttributes } from "svelte/elements";

/* -------------------- Core Types -------------------- */
export type * from "@form-observer/core/types.d.ts";

/* -------------------- Svelte Form Validity Observer Types -------------------- */
export interface SvelteFormValidityObserver<M = string> extends Omit<FormValidityObserver<M>, "configure"> {
  /**
   * An enhanced version of {@link FormValidityObserver.configure} for `Svelte`. In addition to configuring a field's
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
   * <input name="another-comment" maxlength="10" />
   */
  configure(name: string, errorMessages: SvelteValidationErrors<M>): SvelteFieldProps;

  /**
   * Svelte `action` used to automatically setup and cleanup a form's observer.
   *
   * **Note**: If you use this `action`, you should **not** call `observe`, `unobserve`, or `disconnect` directly.
   *
   */
  autoObserve: Action<HTMLFormElement>;
}

export type SvelteFieldProps = Pick<
  HTMLInputAttributes,
  "name" | "required" | "minlength" | "min" | "maxlength" | "max" | "step" | "type" | "pattern"
>;

/**
 * An augmetation of {@link ValidationErrors} for `Svelte`. Represents the constraints that should be applied
 * to a form field, and the error messages that should be displayed when those constraints are broken.
 */
export interface SvelteValidationErrors<M> extends Pick<ValidationErrors<M>, "badinput" | "validate"> {
  // Standard HTML Attributes
  required?: SvelteErrorDetails<M, HTMLInputAttributes["required"]> | ErrorMessage<string>;
  minlength?: SvelteErrorDetails<M, HTMLInputAttributes["minlength"]>;
  min?: SvelteErrorDetails<M, HTMLInputAttributes["min"]>;
  maxlength?: SvelteErrorDetails<M, HTMLInputAttributes["maxlength"]>;
  max?: SvelteErrorDetails<M, HTMLInputAttributes["max"]>;
  step?: SvelteErrorDetails<M, HTMLInputAttributes["step"]>;
  type?: SvelteErrorDetails<M, HTMLInputAttributes["type"]>;
  pattern?: SvelteErrorDetails<M, HTMLInputAttributes["pattern"]>;
}

/** An augmentation of {@link ErrorDetails} for `Svelte`. */
export type SvelteErrorDetails<M, V> =
  | V
  | { render: true; message: ErrorMessage<M>; value: V }
  | { render?: false; message: ErrorMessage<string>; value: V };
