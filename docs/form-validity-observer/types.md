# Form Validity Observer Types

These are the important types used by the `FormValidityObserver`. They serve as a useful point of reference for the complex types mentioned in the observer's [API](./README.md#api).

## `ErrorMessage<M>`

```ts
type ErrorMessage<M> = M | ((field: FormField) => M);
```

The error message to display to a user for an invalid form field. Oftentimes, this type will just represent the error message itself. However, this type can also represent a function that returns an error message. In the latter scenario, the function expects to be passed the invalid [`FormField`](../form-observer/types.md#formfield).

An error message is considered to be of type `M`, where "M" represents the "Message Type". The following would be examples for error messages of type `string`:

```ts
const message = "This field is required." satisfies ErrorMessage<string>;
const messageFunction = ((field: HTMLInputElement) =>
  `${field.value} is not supported.`) satisfies ErrorMessage<string>;
```

An error message is not restricted to being of type `string`. For example, it can also be of type `object`, `ReactElement`, or anything else. However, non-string error message types are only relevant for the [`renderer`](./README.md#form-validity-observer-options-renderer) function of the `FormValidityObserver`. Thus, an error message type like this

```ts
type StringOrElement = { type: "DOMString"; value: string } | { type: "DOMElement"; value: HTMLElement };

const message = { type: "DOMString", value: "<div>This field is bad</p>" } satisfies ErrorMessage<StringOrElement>;

const messageFunction = ((field: HTMLSelectElement) => {
  const container = document.createElement("p");
  container.textContent = `The value ${field.value} is not good.`;

  return { type: "DOMElement", value: container };
}) satisfies ErrorMessage<StringOrElement>;
```

is only useful for a `renderer` function that supports it, such as this

```ts
const observer = new FormValidityObserver("input", {
  renderer(errorContainer: HTMLElement, errorMessage: StringOrElement) {
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

- [`FormValidityObserver.setFieldError`](./README.md#method-formvalidityobserversetfielderrorname-string-message-errormessagestringerrormessagem-render-boolean-void)
- The [`ErrorDetails<M>`](#errordetailsm) type

## `ValidationErrors<M>`

```ts
interface ValidationErrors<M> {
  // Standard HTML Attributes
  required?: ErrorDetails<M>;
  minlength?: ErrorDetails<M>;
  min?: ErrorDetails<M>;
  maxlength?: ErrorDetails<M>;
  max?: ErrorDetails<M>;
  step?: ErrorDetails<M>;
  type?: ErrorDetails<M>;
  pattern?: ErrorDetails<M>;

  // Custom Validation Properties
  badinput?: ErrorDetails<M>;
  validate?(field: FormField): void | ErrorDetails<M> | Promise<void | ErrorDetails<M>>;
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

- [`FormValidityObserver.configure`](./README.md#method-formvalidityobserverconfigurename-string-errormessages-validationerrorsm-void)

## `ErrorDetails<M>`

```ts
type ErrorDetails<M> =
  | ErrorMessage<string>
  | { render: true; message: ErrorMessage<M> }
  | { render?: false; message: ErrorMessage<string> };
```

A helper type that indicates how a field's [`ErrorMessage`](#errormessagem) will be rendered to the DOM. This type is only relevant for the [`FormValidityObserver.configure`](./README.md#method-formvalidityobserverconfigurename-string-errormessages-validationerrorsm-void) method, which sets up the error messages that will be displayed for a form field.

When `ErrorDetails` is an object whose `render` property is `true`, the the error `message` will be rendered to the DOM using the observer's [`renderer`](./README.md#form-validity-observer-options-renderer) function. Otherwise, the error message will be rendered to the DOM as a raw string.

### Primary Uses

- [`FormValidityObserver.configure`](./README.md#method-formvalidityobserverconfigurename-string-errormessages-validationerrorsm-void) via the [`ValidationErrors`](#validationerrorsm) type.
