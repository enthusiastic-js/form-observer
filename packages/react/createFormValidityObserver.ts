import type { EventType, OneOrMany } from "@form-observer/core/types";
import FormValidityObserver from "@form-observer/core/FormValidityObserver";
import type {
  ErrorMessage,
  ValidationErrors,
  FormValidityObserverOptions,
} from "@form-observer/core/FormValidityObserver";
import type React from "react";

/* ---------------------------------------- Logic ---------------------------------------- */
/** Maps the standardized HTML constraint-related attributes to valid React props */
const constraintsMap = Object.freeze({
  required: "required",
  minlength: "minLength",
  min: "min",
  maxlength: "maxLength",
  max: "max",
  step: "step",
  type: "type",
  pattern: "pattern",
}) satisfies Record<keyof Omit<ValidationErrors<string>, "badinput" | "validate">, keyof ReactFieldProps>;

/** Creates an enhanced version of the {@link FormValidityObserver} that's more convenient for `React` apps */
export default function createFormValidityObserver<T extends OneOrMany<EventType>, M = string>(
  types: T,
  options?: FormValidityObserverOptions<M>,
): ReactFormValidityObserver<M> {
  const observer = new FormValidityObserver(types, options) as ReactFormValidityObserver<M>;

  /* -------------------- Bindings -------------------- */
  // Form Observer Methods
  observer.observe = observer.observe.bind(observer);
  observer.unobserve = observer.unobserve.bind(observer);
  observer.disconnect = observer.disconnect.bind(observer);

  // Validation Methods
  observer.validateFields = observer.validateFields.bind(observer);
  observer.validateField = observer.validateField.bind(observer);
  observer.setFieldError = observer.setFieldError.bind(observer);
  observer.clearFieldError = observer.clearFieldError.bind(observer);

  /** **Private** reference to the original {@link FormValidityObserver.configure} method */
  const originalConfigure = observer.configure.bind(observer) as FormValidityObserver<M>["configure"];

  /* -------------------- Enhancements -------------------- */
  // Add automatic setup/teardown
  observer.autoObserve = function autoObserve() {
    let form: HTMLFormElement | null;

    return (reactRef: typeof form) => {
      if (reactRef) {
        form = reactRef;
        return observer.observe(form);
      }

      observer.unobserve(form as HTMLFormElement);
      form = null;
    };
  };

  // Enhanced `configure` method
  observer.configure = function configure(name, errorMessages) {
    const keys = Object.keys(errorMessages) as Array<keyof ReactValidationErrors<M>>;
    const props = { name } as ReactFieldProps;
    const config = {} as ValidationErrors<M>;

    // Build `props` object and error `config` object from `errorMessages`
    for (let i = 0; i < keys.length; i++) {
      const constraint = keys[i];

      // Type narrowing on each individual property would be redundant and increase bundle size. So we're using `any`.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const constraintValue = errorMessages[constraint] as any;

      // Constraint Was Omitted
      if (constraintValue == null) continue;
      if (constraint === "required" && constraintValue === false) continue;

      /* ----- Custom Validation Properties ----- */
      if (constraint === "badinput" || constraint === "validate") {
        config[constraint] = constraintValue;
        continue;
      }

      /* ----- Standrd HTML Attributes ----- */
      // Value Only
      if (typeof constraintValue !== "object") {
        if (constraint === "required" && typeof constraintValue !== "boolean") config[constraint] = constraintValue;
        props[constraintsMap[constraint]] = constraint === "required" ? true : constraintValue;
        continue;
      }

      // Value and Message
      if (constraint === "required" && constraintValue.value === false) continue;
      props[constraintsMap[constraint]] = constraintValue.value;
      config[constraint] = constraintValue;
    }

    originalConfigure(name, config);
    return props;
  };

  return observer;
}

/* ---------------------------------------- Types ---------------------------------------- */
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

/** An augmetation of {@link ErrorDetails} for `React`. */
export type ReactErrorDetails<M, V> =
  | V
  | { render: true; message: ErrorMessage<M>; value: V }
  | { render?: false; message: ErrorMessage<string>; value: V };
