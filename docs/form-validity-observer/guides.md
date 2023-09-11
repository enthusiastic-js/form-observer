# Form Validity Observer Guides

Here you'll find helpful tips on how to use the `FormValidityObserver` effectively in various situations. We hope that you find these guides useful! Here are the currently discussed topics:

- [Usage with Web Components](#usage-with-web-components)

## Usage with Web Components

Unlike some of the other form validation libraries out there, the `FormValidityObserver` is compatible with native [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components). In addition to the guidelines given in the [`FormObserver` documentation](../form-observer/guides.md#usage-with-web-components), there are a few things to keep in mind when using Custom Elements with the `FormValidityObserver`.

#### You Must Expose the Validity State of Your Custom Element

Custom Elements do not expose their [`ValidityState`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/validity) by default. Because the `FormValidityObserver` relies on the `ValidityState` of form fields to perform proper validation, your Custom Element will need to expose its `ValidityState` like so:

```js
class CustomField extends HTMLElement {
  static formAssociated = true;
  #internals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    // Other Setup ...
  }

  get validity() {
    return this.#internals.validity;
  }
}

customElements.define("custom-field", CustomField);
```

The `FormValidityObserver` _requires_ the `ValidityState` of Custom Elements to be exposed via the `validity` property because this is consistent with the behavior of native form controls. This is already a best practice if you're writing Custom Elements that others will be using since it creates a more intuitive developer experience. It is recommended to keep the `ElementInternals` private and to use a getter (_without_ a setter) for the `validity` property to prevent unwanted mutations from the outside.

If you are using the native form error bubbles to display error messages to users (or if you anticipate that the consumers of your Web Component will do the same), then you will also need to expose the `reportValidity()` method of your component in a similar manner.

```js
class CustomField extends HTMLElement {
  static formAssociated = true;
  #internals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    // Other Setup ...
  }

  get validity() {
    return this.#internals.validity;
  }

  /**
   * Returns `true` if the element has no validity problems; otherwise, returns `false`.
   * Fires an `invalid` event at the element, and (if the event isn't canceled) reports the problem to the user.
   * @returns {boolean}
   */
  reportValidity() {
    return this.#internals.reportValidity();
  }
}

customElements.define("custom-field", CustomField);
```

Optionally, you can also expose the `validationMessage` and `willValidate` properties of your Custom Element. (These should also be exposed as getters without setters.) In addition to helping the end users of your Web Component, exposing the `validationMessage` property will enable the `FormValidityObserver` to show default error messages for your component whenever it fails validation. (This means that by default you won't have to use `FormValidityObserver.configure` on any instances of your Custom Element.)

#### Consider Exposing a `setCustomValidity` Method (Optional)

No Custom Element that acts as a form control has a `setCustomValidity` method by default. Instead, it has a [`setValidity`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/setValidity) method which handles _all_ of the ways that the element's `ValidityState` can be marked as valid or invalid.

Technically speaking, a robust Custom Element can manage all of its `ValidityState` and error messaging internally; so a public `setCustomValidity` method isn't necessary. For this reason, the `FormValidityObserver` does not require you to expose this method on your class.

That said, if you're writing Web Components that others will be using, then it's a best practice to expose a `setCustomValidity` method. This is because it's impossible to predict all the ways in which other developers will use your Custom Element. A `setCustomValidity` method that mimics the behavior of native form controls will be more intuitive for your end users and satisfy whatever custom error handling needs they may have.

```js
class CustomField extends HTMLElement {
  static formAssociated = true;
  #internals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    // Other Setup ...
  }

  get validity() {
    return this.#internals.validity;
  }

  /**
   * Sets a custom error message that is displayed when a form is submitted.
   * @param {string} error
   * @returns {void}
   */
  setCustomValidity(error) {
    this.#internals.setValidity({ customError: Boolean(error) }, error);
  }
}

customElements.define("custom-field", CustomField);
```

This is a simple example that can be improved upon if desired. For instance, if you want to play it safe, you can coerce the `error` argument to a string. To fully mimic the browser's native behavior, the `setCustomValidity` method should also check to see if there are any other broken validation constraints before attempting to clear the error message.

#### Be Mindful of Accessibility

When working with Web Components that also act as form fields, you should be careful to ensure that _the element which acts as a form field is also the element that will receive the field-related ARIA attributes_.

For example, if you're creating a [`combobox`](https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Roles/combobox_role) component that's intended to act as a superior `<select />` field, then you'd want to design your Web Component such that the element with the `combobox` role is the element that sets up the `ElementInternals` _and_ that receives all of the field-related ARIA attributes (such as `aria-invalid`). This will typically make it easier for you to build accessible components, especially if you're leveraging helpful features like the [`invalid` event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/invalid_event).

As far as the `FormValidityObserver` is concerned, it assumes that your Web Components follow this structure. More specifically, it assumes that the element which holds the `ElementInternals` is the element whose ARIA attributes should be automatically updated. This typically isn't something you'll need to think about unless your custom form control is a complex component composed of multiple sub-components.
