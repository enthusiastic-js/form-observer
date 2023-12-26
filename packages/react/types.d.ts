import type { ErrorMessage, ValidationErrors, ValidatableField, FormValidityObserver } from "@form-observer/core";
import type React from "react";

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
   * <input name="another-comment" maxLength={10} />
   */
  configure<E extends ValidatableField>(name: string, errorMessages: ReactValidationErrors<M, E>): ReactFieldProps;

  /**
   * Creates a React `ref` callback used to automatically setup and cleanup a form's observer.
   *
   * If you use this `ref`, you should **not** call `observe`, `unobserve`, or `disconnect` directly.
   *
   * **Note**: Because of React's aggressive re-rendering model, you may need to memoize the `ref` returned from
   * this utility if you're using it in a component that re-renders. In functional components, that means
   * calling `useMemo(autoObserve, [autoObserve])`. In class components, that means assigning the returned
   * `ref` to the class instance during instantiation.
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
  autoObserve(novalidate?: boolean): (formRef: HTMLFormElement | null) => void;
}

export type ReactFieldProps = Pick<
  React.ComponentProps<"input">,
  "name" | "required" | "minLength" | "min" | "maxLength" | "max" | "step" | "type" | "pattern"
>;

/**
 * An augmetation of {@link ValidationErrors} for `React`. Represents the constraints that should be applied
 * to a form field, and the error messages that should be displayed when those constraints are broken.
 */
export interface ReactValidationErrors<M, E extends ValidatableField = ValidatableField>
  extends Pick<ValidationErrors<M, E>, "badinput" | "validate"> {
  // Standard HTML Attributes
  required?: ReactErrorDetails<M, React.ComponentProps<"input">["required"], E> | ErrorMessage<string, E>;
  minlength?: ReactErrorDetails<M, React.ComponentProps<"input">["minLength"], E>;
  min?: ReactErrorDetails<M, React.ComponentProps<"input">["min"], E>;
  maxlength?: ReactErrorDetails<M, React.ComponentProps<"input">["maxLength"], E>;
  max?: ReactErrorDetails<M, React.ComponentProps<"input">["max"], E>;
  step?: ReactErrorDetails<M, React.ComponentProps<"input">["step"], E>;
  type?: ReactErrorDetails<M, React.ComponentProps<"input">["type"], E>;
  pattern?: ReactErrorDetails<M, React.ComponentProps<"input">["pattern"], E>;
}

/** An augmentation of the core `ErrorDetails` type for `React`. */
export type ReactErrorDetails<M, V, E extends ValidatableField = ValidatableField> =
  | V
  | { render: true; message: ErrorMessage<M, E>; value: V }
  | { render?: false; message: ErrorMessage<string, E>; value: V };
