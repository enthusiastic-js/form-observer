# Form Validity Observer Types

These are the important types used by the `FormValidityObserver`. They serve as a useful point of reference for the complex types mentioned in the observer's [API](./README.md#api).

## `ValidatableField`

```ts
interface ValidatableField
  extends HTMLElement,
    Pick<HTMLInputElement, "name" | "validity" | "validationMessage" | "willValidate">,
    Partial<Pick<HTMLInputElement, "type" | "setCustomValidity">>,
    Partial<Pick<ElementInternals, "form" | "reportValidity">> {
  labels?: ElementInternals["labels"] | null;
}
```

Any `HTMLElement` that can participate in form field validation. This includes all of the native form fields, such as [`HTMLInputElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement), [`HTMLSelectElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLSelectElement), and [`HTMLTextArea`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLTextAreaElement) element. It also includes any Web Components that [function as form fields](./guides.md#usage-with-web-components).

### Primary Uses

- The [`scoller`](../form-validity-observer/README.md#form-validity-observer-options-scroller) option for the `FormValidityObserver`
- The [`ErrorMessage`](#errormessagem-e) type used by the `FormValidityObserver`
- The `validate` property of the [`ValidationErrors`](#validationerrorsm-e) type

## `ErrorMessage<M, E>`

```ts
type ErrorMessage<M, E extends ValidatableField = ValidatableField> = M | ((field: E) => M);
```

The error message to display to a user for an invalid form field. Oftentimes, this type will just represent the error message itself. However, this type can also represent a function that returns an error message. In the latter scenario, the function expects to be passed the invalid [`ValidatableField`](#validatablefield).

An error message is considered to be of type `M`, where "M" represents the "Message Type". When the error message is a function, the element passed to the function is expected to be of type `E`, where "E" represents the "HTML Element" (i.e., the form field) that is invalid. `E` defaults to `ValidatableField`, but you are free to give `E` a more specific type if you want. Typically, `E` will be inferred whenever you use one of the `FormValidityObserver`'s methods.

The following would be examples for error messages of type `string`:

```ts
const message = "This field is required." satisfies ErrorMessage<string>;
const messageFunction = ((field: HTMLInputElement) => `${field.value} is not supported.`) satisfies ErrorMessage<
  string,
  HTMLInputElement
>;
```

An error message is not restricted to being of type `string`. For example, it can also be of type `object`, `ReactElement`, or anything else. However, non-string error message types are only relevant for the [`renderer`](./README.md#form-validity-observer-options-renderer) function of the `FormValidityObserver`. Thus, an error message type like this

```ts
type StringOrElement = { type: "DOMString"; value: string } | { type: "DOMElement"; value: HTMLElement };

const message = { type: "DOMString", value: "<div>This field is bad</p>" } satisfies ErrorMessage<StringOrElement>;

const messageFunction = ((field: HTMLSelectElement) => {
  const container = document.createElement("p");
  container.textContent = `The value ${field.value} is not good.`;

  return { type: "DOMElement", value: container };
}) satisfies ErrorMessage<StringOrElement, HTMLSelectElement>;
```

is only useful for a `renderer` function that supports it, such as this

```ts
const observer = new FormValidityObserver("input", {
  renderer(errorContainer: HTMLElement, errorMessage: StringOrElement | null) {
    if (errorMessage === null) return errorContainer.replaceChildren();
    if (errorMessage.type === "DOMElement") {
      return errorContainer.replaceChildren(errorMessage.value);
    }

    // message is of type `DOMString`
    errorContainer.innerHTML = errorMessage.value;
  },
});
```

Note that each instance of the `FormValidityObserver` determines its `M` type from the `renderer` function that is passed to it during construction. This is the `M` type that will be used for the instance's methods.

### Primary Uses

- [`FormValidityObserver.setFieldError`](./README.md#method-formvalidityobserversetfielderrorename-string-message-errormessagestring-eerrormessagem-e-render-boolean-void)
- The [`ErrorDetails<M>`](#errordetailsm-e) type

## `ValidationErrors<M, E>`

```ts
interface ValidationErrors<M, E extends ValidatableField = ValidatableField> {
  // Standard HTML Attributes
  required?: ErrorDetails<M, E>;
  minlength?: ErrorDetails<M, E>;
  min?: ErrorDetails<M, E>;
  maxlength?: ErrorDetails<M, E>;
  max?: ErrorDetails<M, E>;
  step?: ErrorDetails<M, E>;
  type?: ErrorDetails<M, E>;
  pattern?: ErrorDetails<M, E>;

  // Custom Validation Properties
  badinput?: ErrorDetails<M, E>;
  validate?(field: E): void | ErrorDetails<M, E> | Promise<void | ErrorDetails<M, E>>;
}
```

The errors that the `FormValidityObserver` will display to the user in the various situations where a field fails validation. Each individual field can have a `ValidationErrors` object associated with it by using the `FormValidityObserver.configure` method. Most of the properties in this object correspond to constraint validation attributes that can be applied directly to HTML form controls. You can learn more about these attributes by looking at the documentation for the [`ValidityState`](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState) interface.

The following 2 properties have unique meaning to the `FormValidityObserver` and do not correspond to any HTML attributes:

<dl>
  <dt><code>badinput</code></dt>
  <dd>
    This property represents the error message that should be displayed when the user's input is malformed. For example, an incomplete <a href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date"><code>date</code></a> field would be considered malformed. See <a href="https://developer.mozilla.org/en-US/docs/Web/API/ValidityState/badInput"><code>ValidityState.badInput</code></a> for more information.
  </dd>

  <dt><code>validate</code></dt>
  <dd>
    A function that runs custom validation logic for a form field. This function can be synchronous or asynchronous. Note that this custom validation logic will only be run <em>after</em> all of the other validation constraints have been satisfied.
  </dd>
</dl>

Remember that each instance of the `FormValidityObserver` determines its `M` type from the [`renderer`](./README.md#form-validity-observer-options-renderer) function that is passed to it during construction.

### Primary Uses

- [`FormValidityObserver.configure`](./README.md#method-formvalidityobserverconfigureename-string-errormessages-validationerrorsm-e-void)
- [`FormValidityObserverOptions.defaultErrors`](./README.md#form-validity-observer-options-default-errors)

## `ErrorDetails<M, E>`

```ts
type ErrorDetails<M, E extends ValidatableField = ValidatableField> =
  | ErrorMessage<string, E>
  | { render: true; message: ErrorMessage<M, E> }
  | { render?: false; message: ErrorMessage<string, E> };
```

A helper type that indicates how a field's [`ErrorMessage`](#errormessagem-e) will be rendered to the DOM. This type is only relevant for the [`FormValidityObserver.configure`](./README.md#method-formvalidityobserverconfigureename-string-errormessages-validationerrorsm-e-void) method, which sets up the error messages that will be displayed for a form field.

When `ErrorDetails` is an object whose `render` property is `true`, the the error `message` will be rendered to the DOM using the observer's [`renderer`](./README.md#form-validity-observer-options-renderer) function. Otherwise, the error message will be rendered to the DOM as a raw string.

### Primary Uses

- [`FormValidityObserver.configure`](./README.md#method-formvalidityobserverconfigureename-string-errormessages-validationerrorsm-e-void) via the [`ValidationErrors`](#validationerrorsm-e) type.
