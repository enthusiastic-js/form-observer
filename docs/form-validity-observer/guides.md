# Form Validity Observer Guides

Here you'll find helpful tips on how to use the `FormValidityObserver` effectively in various situations. We hope that you find these guides useful! Here are the currently discussed topics:

- [Enabling/Disabling Accessible Error Messages](#enabling-accessible-error-messages-during-form-submissions)
- [Keeping Track of Visited/Dirty Fields](#keeping-track-of-visiteddirty-fields)
- [Usage with Web Components](#usage-with-web-components)

<!--
TODO: Some `Guides` that could be helpful:

1) How to style form fields and their error messages.
2) MAYBE something on how to work with accessible error messages?
3) MAYBE more help on scrolling labels into view?
4) Notes on how to handle fields that are toggled via CSS would probably be helpful. More than likely, a wrapping `fieldset` that could be `disabled` would be the "path of least resistance". `disabled` fields don't partake in field validation or form submission, and the `:disabled` CSS pseudo-class could be used to visually hide a group of elements from users whenever needed. That said, this approach requires JavaScript. Conditionally displayed fields are a bit more complicated for forms that want to support users lacking JS. But this is true regardless of whether or not someone uses our library.

Extra: Should we include a `Philosphy` document/page? Perhaps _additionally_ including why it's likely unnecessary to store things like error messages, touched fields, and/or dirty fields in state?
-->

## Enabling Accessible Error Messages during Form Submissions

By default, the browser will not allow a form to be submitted if _any_ of its fields are invalid (assuming the fields [can participate in field validation](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/willValidate)). If a user attempts to submit a form with invalid fields, the browser will block the submission and display an error message instead. This message will briefly appear in a bubble before disappearing, and the message only appears over one field at a time; so the user experience isn't the best.

You can override the browser's behavior by applying the [`novalidate`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#novalidate) attribute to the form element.

```html
<form novalidate>
  <!-- Fields -->
</form>
```

This allows us to register a `submit` handler that gets called even when the form's fields are invalid. From the handler, we can run our own validation logic for displaying error messages.

```js
const form = document.querySelector("form");
form.addEventListener("submit", handleSubmit);

function handleSubmit(event) {
  event.preventDefault();
  const formValid = observer.validateFields({ focus: true });
  if (!formValid) return;

  // Run submission logic if fields are valid...
}
```

An alternative to setting the form's `novalidate` attribute in your markup is setting it in your JavaScript.

```js
form.setAttribute("novalidate", "");
// or form.noValidate = true;
```

(See the [`form.noValidate`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement#htmlformelement.novalidate) property and the and the [`Element.setAttribute`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute) method for reference.)

We recommend setting the `novalidate` attribute of your forms in JavaScript instead of in your markup. This enables progressive enhancement for your forms. If for any reason [a user lacks access to JavaScript](https://www.kryogenix.org/code/browser/everyonehasjs.html) when they visit your app, they will still be able to experience the browser's native form validation as long as the `novalidate` property is _not_ set in your server-rendered HTML.

```html
<form>
  <!-- Fields -->
</form>
```

```js
const form = document.querySelector("form");
form.noValidate = true; // Run only when JS is loaded
// Other validation setup ...
```

Concerning users who don't have JavaScript, the benefit of this approach is two-fold:

1. **The user experience is better.** Users will be able to learn what fields they need to fix thanks to the browser's native error messages. And if their network connection is weak, they'll be able to gain this information _without_ making additional requests to your server.
2. **The load on your server is lighter.** The browser will automatically block form submissions for invalid fields. This reduces the number of requests that your server has to handle.

You gain these benefits while maintaining the better, more accessible user experience for users who have JS enabled. But if you're determined to apply the `novalidate` attribute in your HTML instead of your JavaScript, then it's recommended to make sure that your server is able to render accessible error messages for your fields whenever the user submits an invalid form. In that case, the error messages will likely look better and be more accessible to your users (if they're done well). But the downside is that users with weaker connections will have a harder time, and your server will experience a little more communication. Ultimately, it's a set of trade-offs; so it's up to you to determine whether to set `novalidate` in your HTML or in your JS.

## Keeping Track of Visited/Dirty Fields

In some situations, you might want to keep track of form fields that have been visited and/or edited by a user. Since the `FormValidityObserver` is solely concerned with the validity of form fields, it does not provide this functionality out of the box. However, it is fairly easy to use the base `FormObserver` to provide this functionality for you. An example is shown below. (Note: If there is enough interest, we are willing to consider supporting this use case in the future.)

```js
const observer = new FormObserver(
  ["focusout", "change"],
  [
    /** Marks a field as "visited" when a user leaves it. */
    (event) => event.target.setAttribute("data-visited", String(true)),

    /** Sets the dirty state of a field when its value changes. */
    (event) => {
      const dirtyAttr = "data-dirty";
      const field = event.target;

      if (field instanceof HTMLInputElement) {
        return field.setAttribute(
          dirtyAttr,
          field.type === "radio" || field.type === "checkbox"
            ? String(field.checked !== field.defaultChecked)
            : String(field.value !== field.defaultValue),
        );
      }

      if (field instanceof HTMLTextAreaElement) {
        return field.setAttribute(dirtyAttr, String(field.value !== field.defaultValue));
      }

      // Note: This approach requires you to explicitly set the `selected` attribute for your `option`s
      if (field instanceof HTMLSelectElement) {
        const dirtyValue = Array.from(field.options).some((o) => o.selected !== o.defaultSelected);
        return field.setAttribute(dirtyAttr, String(dirtyValue));
      }

      // You can also add custom logic for any Web Components that act as form fields
    },
  ],
);

const form = document.getElementById("my-form");
observer.observe(form);

// Later, when some logic needs to know the visited/dirty fields
fields = Array.from(form.elements);
const visitedFields = fields.filter((f) => f.hasAttribute("data-visited"));
const dirtyFields = fields.filter((f) => f.getAttribute("data-dirty") === String(true));

// Run logic with visited/dirty fields ...
```

(The above implementation is an adaptation of [Edmund Hung's brilliant approach](https://github.com/edmundhung/conform/issues/131#issuecomment-1557892292).)

To get an idea of how these event listeners would function, you can play around with them on the [MDN Playground](https://developer.mozilla.org/en-US/play?id=I15VQ64lWQShncvhr9JnLQQYWOoJQhpU1hHDLWKGF4D229TmIjON7qmRqK2mVceWNXsaP6jIjm%2FOjZ%2Bi). Feel free to alter this implementation to fit your needs.

## Usage with Web Components

Unlike some of the other form validation libraries out there, the `FormValidityObserver` is compatible with native [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components). In addition to the guidelines given in the [`FormObserver` documentation](../form-observer/guides.md#usage-with-web-components), there are a few things to keep in mind when using Custom Elements with the `FormValidityObserver`.

#### You Must Expose the Validation Properties of Your Custom Element

Custom Elements do not expose their [`ValidityState`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/validity) by default, nor do they expose their [`validationMessage`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/validationMessage) or [`willValidate`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/willValidate) properties. Because the `FormValidityObserver` needs these details to perform proper validation, your Custom Element will need to expose them like so:

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

  get validationMessage() {
    return this.#internals.validationMessage;
  }

  get willValidate() {
    return this.#internals.willValidate;
  }
}

customElements.define("custom-field", CustomField);
```

The `FormValidityObserver` _requires_ the `ValidityState` of Custom Elements to be exposed via the `validity` property because this is consistent with the behavior of native form controls. This is already a best practice if you're writing Custom Elements that others will be using since it creates a more intuitive developer experience. It is recommended to keep the `ElementInternals` private and to use a getter (_without_ a setter) for the `validity` property to prevent unwanted mutations from the outside. The same goes for the `validationMessage` and `willValidate` properties.

> Note: One benefit of exposing the `validationMessage` property is that you typically won't need to call `FormValidityObserver.configure` for your Web Components. This is because the observer falls back to displaying the `validationMessage` when no configured error messages are found.

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

  // Validation Properties ...

  /** @type {ElementInternals["reportValidity"]} */
  reportValidity() {
    return this.#internals.reportValidity();
  }
}

customElements.define("custom-field", CustomField);
```

#### You Must Expose the `name` of Your Custom Element

Because the `FormValidityObserver` does not validate nameless fields, you must expose your Custom Element's `name`:

```js
class CustomField extends HTMLElement {
  static formAssociated = true;
  #internals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    // Other Setup ...
  }

  /** Sets or retrieves the name of the object. @returns {string} */
  get name() {
    return this.getAttribute("name") ?? "";
  }

  set name(value) {
    this.setAttribute("name", value);
  }

  // Validation Properties ...
}

customElements.define("custom-field", CustomField);
```

#### Consider Exposing a `setCustomValidity` Method (Optional)

No Custom Element that acts as a form control has a `setCustomValidity` method by default. Instead, it has a [`setValidity`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/setValidity) method which handles _all_ of the ways that the element's `ValidityState` can be marked as valid or invalid.

Technically speaking, a robust Custom Element can manage all of its `ValidityState` and error messaging internally; so a public `setCustomValidity` method isn't necessary. For this reason, the `FormValidityObserver` does not require you to expose this method on your class.

That said, if you're writing Web Components that others will be using, then it's a best practice to expose a `setCustomValidity` method. This is because it's impossible to predict all of the ways that other developers will use your Custom Element. A `setCustomValidity` method that mimics the behavior of native form controls will be more intuitive for your end users and will satisfy whatever custom error handling needs they may have.

```js
class CustomField extends HTMLElement {
  static formAssociated = true;
  #internals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    // Other Setup ...
  }

  // Other Properties ...

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
