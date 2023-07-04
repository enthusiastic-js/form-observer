import FormObserver from "./FormObserver";
import { assertElementIsForm } from "./utils/assertions";
import type { OneOrMany, EventType, FormFieldEvent, ListenerOptions, FormField } from "./types";
import type { DOMPurifyI } from "dompurify";

/*
 * TODO: NOTE TO SELF ... If you can get the external error message functions working fine, this guy
 * is basically done. Most of the `FormValidityObserver` methods will just be relying on these external
 * functions that you create anyway, so they should be very straightforward. The only real complexity
 * _within_ the `FormValidityObserver` itself is whether or not we want to support working with
 * MULTIPLE forms or only ONE form at a time. Besides that, everything is really easy when it comes to
 * the methods ...
 *
 * Therefore, you should be spending most of your time perfecting the outside functions. We can hyper
 * focus on optimization later ... But it will be sufficient to ensure that our external functions are
 * sufficiently simple, flexible, and fast. The larger outstanding questions that we have left:
 *
 * 1) How to appease TypeScript for `getErrorByConstraint`?
 * 2) Should we support functions for _both_ raw strings _and_ markup rendering? Perhaps we can add a `render` prop?
 * 3) Should we make developers santize HTML on their own? Or is that too much?
 */

let sanitizeHTML: DOMPurifyI["sanitize"];
if (typeof window !== "undefined" && !Element.prototype.hasOwnProperty("setHTML")) {
  import("dompurify").then(({ sanitize }) => (sanitizeHTML = sanitize));
}

const attrs = { "aria-describedby": "aria-describedby", "aria-invalid": "aria-invalid" } as const;

type ValidationAttributes = "required" | "minlength" | "min" | "maxlength" | "max" | "step" | "type" | "pattern";
// TODO: Should we make `ErrorMessage` Generic so that we can also render JSX (instead of just strings)?
type ErrorMessage = string | ((field: FormField) => string);

// TODO: Should we allow functions for BOTH strings AND markup? (We'd need another property to specify this)
interface ValidationRules {
  // Standardized HTML Attributes
  required?: boolean | ErrorMessage | { value: boolean; message?: ErrorMessage };
  minlength?: number | { value: number; message?: ErrorMessage };
  min?: number | { value: number; message?: ErrorMessage };
  maxlength?: number | { value: number; message?: ErrorMessage };
  max?: number | { value: number; message?: ErrorMessage };
  step?: number | { value: number; message?: ErrorMessage };
  type?: string | { value: string; message?: ErrorMessage };
  pattern?: string | { value: string; message?: ErrorMessage };

  // Custom Rule Properties
  badInput?: ErrorMessage; // Based on Standardized `ValidityState.badInput`
  validate?(field: FormField): void | ErrorMessage | Promise<void | ErrorMessage>; // User-defined Validation
}

/*
 * TODO: Need to add an `options` object for the constructor. Some props that we'll need:
 * - `renderer` (or something similar) --> Function to use for rendering markup. We should create an internal default.
 */
interface FormValidityObserverConstructor {
  /**
   * Provides a way to validate an `HTMLFormElement`'s fields (and to present accessible errors for those fields
   * to the user) in response to the events that the fields emit.
   *
   * @param types The type(s) of event(s) that trigger(s) form field validation.
   * @param options
   */
  new <T extends OneOrMany<EventType>, R = string>(
    types: T,
    options: FormValidityObserverOptions<R>
  ): FormValidityObserver;
}

interface FormValidityObserverOptions<RenderedEntity> {
  // TODO: Properly type, label/name, JSDoc, etc.
  renderer?(error: RenderedEntity, errorElement: HTMLElement): void;

  /**
   * The `addEventListener` options to use for the observer's event listener.
   *
   * See {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener addEventListener}.
   */
  eventListenerOpts?: ListenerOptions;
}

interface FormValidityObserver extends FormObserver {
  register(fieldName: string, rules: ValidationRules): void;
}

const FormValidityObserver: FormValidityObserverConstructor = class<T extends OneOrMany<EventType>, R = string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Necessary due to a restriction in TS
  extends FormObserver<any>
{
  // TODO: Maybe the second `Record` could use the validation keys for ... well, its keys?
  #rules: Record<string, Record<string, ValidationRules>> = {};
  #render: NonNullable<FormValidityObserverOptions<R>["renderer"]>;

  constructor(types: T, options: FormValidityObserverOptions<R>) {
    // TODO: Maybe add a JSDOC for this function?
    const eventListener = (event: FormFieldEvent<EventType>): void => {
      const field = event.target;
      if (!field.name) return;

      validateField(event.target, this.#rules[(field.form as HTMLFormElement).name][field.name]);
    };

    super(types, eventListener);
    this.#render = options.renderer || (defaultRender as NonNullable<FormValidityObserverOptions<R>["renderer"]>);
  }

  #validateField(field: FormField) {
    const { validity } = field;
    const fieldRules = this.#rules[""][field.name];
    if (validity.tooShort) return this.#setFieldErrorByRule(field, "required");
    //
  }

  #setFieldErrorByRule(field: FormField, rule: Exclude<keyof ValidationRules, "validate">): void {
    const nameThisBetter = this.#rules[""][field.name];
    const error = getErrorByRule(rule, nameThisBetter);
    const render = nameThisBetter[rule]?.render;
    this.setFieldError(field, error, render);
  }

  setFieldError(field: FormField, message: ErrorMessage, render?: boolean): void {
    if (!message) return;
    field.setAttribute(attrs["aria-invalid"], String(true));
    const error = typeof message === "function" ? message(field) : message;
    const errorEl = document.getElementById(field.getAttribute(attrs["aria-describedby"]) as string);

    // Custom HTML/DOM Variant
    if (render) {
      if (!errorEl) return;
      return this.#render(error as R, errorEl);
    }

    // Raw String Variant
    if (errorEl) errorEl.textContent = error;
    else field.setCustomValidity(error);
  }

  clearFieldError(field: FormField): void {
    const errorElement = document.getElementById(field.getAttribute(attrs["aria-describedby"]) as string);
    if (errorElement) errorElement.textContent = "";
    else field.setCustomValidity("");
  }

  /*
   * TODO: How would we go about identifying the owning form?
   * ... Should we have overloads? One that requires a `formName` and one that only works if we're only observing
   * 1 `form`? Should we even allow observing more than one form?
   */
  register(fieldName: string, rules: ValidationRules): void {
    // TODO: Figure out how we identify the owning form
    this.#rules[""][fieldName] = rules;

    /*
     * TODO: Should we also set the field's attributes for these people? Or perhaps provide an option to do this
     * automatically? Well ... if we did that, we'd need _more_ field's `name` ...
     *
     * ... If we don't do this for the user, should we at least warn them when the server rendered
     * attributes are out of sync with what they provided in the JS?
     *
     * ... SEPARATELY, would it make sense to allow registering fields en masse via an object?
     */
  }
};

/* -------------------- Utility Functions -------------------- */
// TODO: Should we add default error messaging for users if they don't include their own?
function validateField(field: FormField, rules: ValidationRules): void | Promise<void> {
  const { validity } = field;

  // Omission Errors
  if (validity.valueMissing) return setFieldError(field, getErrorByRule("required", rules));

  // Length / Magnitude Errors
  if (validity.tooShort) return setFieldError(field, getErrorByRule("minlength", rules));
  if (validity.rangeUnderflow) return setFieldError(field, getErrorByRule("min", rules));
  if (validity.tooLong) return setFieldError(field, getErrorByRule("maxlength", rules));
  if (validity.rangeOverflow) return setFieldError(field, getErrorByRule("max", rules));

  // Pattern Errors
  if (validity.stepMismatch) return setFieldError(field, getErrorByRule("step", rules));
  if (validity.typeMismatch) return setFieldError(field, getErrorByRule("type", rules));
  if (validity.patternMismatch) return setFieldError(field, getErrorByRule("pattern", rules));

  // Attribute-independent Errors
  if (validity.badInput) return setFieldError(field, getErrorByRule("badInput", rules));

  // User-driven Validation
  const errorOrPromise = rules.validate?.(field);

  // TODO: This logic is duplicated between the synchronous and asynchronous versions. Should we combine them?
  if (errorOrPromise instanceof Promise) {
    return errorOrPromise.then((e) => {
      if (e) return setFieldError(field, e);

      // All Validatidation Succeeded (Asynchronous)
      field.setCustomValidity("");
      field.setAttribute(attrs["aria-invalid"], String(false));
    });
  }

  if (errorOrPromise) return setFieldError(field, errorOrPromise);

  // All Validation Succeeded (Synchronous)
  field.setCustomValidity("");
  field.setAttribute(attrs["aria-invalid"], String(false));
}

/*
 * TODO: In order to enable custom rendering WHILE keeping `setFieldError` as an external function, we'd
 * need to pass a `render` function to `setFieldError` instead of a render `boolean`. We have 2 options:
 *
 * 1) Update `setFieldError` to accept a `render` function _instead of_ a `boolean`, and allow the
 * `setError(s)` method of `FormValidityObserver` (which we'll have to define anyway) to leverage
 * `setFieldError` by passing the instance's custom renderer to the externally-defined function.
 * (The `setError(s)` method of the `FormValidityObserver` would require a `boolean` instead of a
 * render function.)
 * 2) Move the entire definition of `setFieldError` inside `FormValidityObserver`, where it can
 * easily access the instance's custom renderer.
 *
 * We're feeling like going with #1. This would help save memory and I really don't think it would
 * add that much complication or lines of code.
 */
function setFieldError(field: FormField, message: ErrorMessage, render?: boolean): void {
  if (!message) return;
  field.setAttribute(attrs["aria-invalid"], String(true));
  const error = typeof message === "function" ? message(field) : message;
  const errorEl = document.getElementById(field.getAttribute(attrs["aria-describedby"]) as string);

  // Custom HTML Variant
  if (render) {
    if (!errorEl) return;
    if ("setHTML" in errorEl && typeof errorEl.setHTML === "function") errorEl.setHTML(error);
    else errorEl.innerHTML = sanitizeHTML(error);
    return;
  }

  /*
   * TODO: Should we clear DOM errors after we see the field is valid? Maybe we should allow empty error messages.
   * ... Perhaps a `clearError` utility function is also in order?
   */

  // Raw String Variant
  if (errorEl) errorEl.textContent = error;
  else field.setCustomValidity(error);
}

// TODO: This is a test ... we still gotta figure this out. Maybe it's decent-ish now though?
function getErrorByRule(constraint: Exclude<keyof ValidationRules, "validate">, rules: ValidationRules): ErrorMessage {
  if (rules[constraint] == null || (constraint === "required" && typeof rules[constraint] === "boolean")) return "";
  if (constraint !== "badInput" && typeof rules[constraint] === "object") return rules[constraint]?.message;
  if (constraint === "badInput" || constraint === "required") return rules[constraint] as ErrorMessage;
  return "";
}

// TODO: Should we improve the JSDoc here? Maybe we can make "`render`" a link to the `renderer` option prop?
/** The default `render` function used to render form field errors to the DOM */
function defaultRender(error: string, errorElement: HTMLElement): void {
  if ("setHTML" in errorElement && typeof errorElement.setHTML === "function") errorElement.setHTML(error);
  else errorElement.innerHTML = sanitizeHTML(error);
}

export default FormValidityObserver;

/*
 * TODO: Make a `FUTURE_DOCS` note about how to handle events that fire directly on the element only,
 * like the `invalid` event. In these situations, event delegation would only work if the _capture_
 * phase is leveraged instead of the bubbling phase
 */
