import type { ErrorMessage, ValidationErrors, FormValidityObserver } from "@form-observer/core/types.d.ts";

/* -------------------- Core Types -------------------- */
export type * from "@form-observer/core/types.d.ts";

/* -------------------- React Form Validity Observer Types -------------------- */
export interface ReactFormValidityObserver<M = string> extends Omit<FormValidityObserver<M>, "configure"> {
  /**
   * An enhanced version of {@link FormValidityObserver.configure} for `React`. In addition to configuring a field's
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
  configure(name: string, errorMessages: ReactValidationErrors<M>): ReactFieldProps;

  /**
   * Creates a React `ref` callback used to automatically setup and cleanup a form's observer.
   *
   * **Note**: If you use this `ref`, you should **not** call `observe`, `unobserve`, or `disconnect` directly.
   *
   * @example
   * <form ref={autoObserve()}>
   *   <input name="first-name" type="textbox" required />
   * </form>
   */
  autoObserve(): (formRef: HTMLFormElement) => void;
}

export type ReactFieldProps = Pick<
  React.ComponentProps<"input">,
  "name" | "required" | "minLength" | "min" | "maxLength" | "max" | "step" | "type" | "pattern"
>;

/**
 * An augmetation of {@link ValidationErrors} for `React`. Represents the constraints that should be applied
 * to a form field, and the error messages that should be displayed when those constraints are broken.
 */
export interface ReactValidationErrors<M> extends Pick<ValidationErrors<M>, "badinput" | "validate"> {
  // Standard HTML Attributes
  required?: ReactErrorDetails<M, React.ComponentProps<"input">["required"]> | ErrorMessage<string>;
  minlength?: ReactErrorDetails<M, React.ComponentProps<"input">["minLength"]>;
  min?: ReactErrorDetails<M, React.ComponentProps<"input">["min"]>;
  maxlength?: ReactErrorDetails<M, React.ComponentProps<"input">["maxLength"]>;
  max?: ReactErrorDetails<M, React.ComponentProps<"input">["max"]>;
  step?: ReactErrorDetails<M, React.ComponentProps<"input">["step"]>;
  type?: ReactErrorDetails<M, React.ComponentProps<"input">["type"]>;
  pattern?: ReactErrorDetails<M, React.ComponentProps<"input">["pattern"]>;
}

/** An augmentation of the core `ErrorDetails` type for `React`. */
export type ReactErrorDetails<M, V> =
  | V
  | { render: true; message: ErrorMessage<M>; value: V }
  | { render?: false; message: ErrorMessage<string>; value: V };
