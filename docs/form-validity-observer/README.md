# Form Validity Observer

<!-- TODO: Revalidate ALL links. -->

The `FormValidityObserver` is an [extension of the `FormObserver`](../form-observer/guides.md#extending-the-formobserver-with-specialized-logic) that automatically validates your fields _and_ displays [accessible](https://developer.mozilla.org/en-US/docs/Web/Accessibility) error messages for those fields as users interact with your forms. Additionally, it exposes methods that can be used to handle field/form validation and error display/removal manually.

<p id="initial-code-example"><strong>Example</strong></p>

```html
<textarea name="external-textbox" maxlength="150" required aria-describedby="textarea-error"></textarea>
<div id="textarea-error"></div>

<form id="my-form">
  <input name="textbox" type="text" minlength="10" pattern="\d+" required aria-describedby="textbox-error" />
  <div id="textbox-error"></div>

  <input name="checkbox" type="checkbox" required aria-describedby="checkbox-error" />
  <div id="checkbox-error"></div>

  <fieldset role="radiogroup" aria-describedby="radios-error">
    <input name="flavor" type="radio" value="vanilla" required />
    <input name="flavor" type="radio" value="strawberry" />
    <input name="flavor" type="radio" value="chocolate" />
  </fieldset>
  <div id="radios-error"></div>

  <select name="settings" required aria-describedby="combobox-error">
    <option value="">Select an Option</option>
    <option>1</option>
    <option>2</option>
    <option>3</option>
  </select>
  <div id="combobox-error"></div>

  <button type="submit">Submit</button>
</form>
```

```js
import { FormValidityObserver } from "@form-observer/core";
// or import FormValidityObserver from "@form-observer/core/FormValidityObserver";

// Automatically validate fields that a user leaves.
// When a field that a user has left is invalid, an accessible error message will be displayed for that field.
const observer = new FormValidityObserver("focusout");
const form = document.getElementById("my-form");
observer.observe(form);

// Prevent the browser from creating error bubbles `onsubmit` (optional)
form.setAttribute("novalidate", "");
form.addEventListener("submit", handleSubmit);

function handleSubmit(event) {
  event.preventDefault();
  const success = observer.validateFields();

  if (success) {
    // Submit data to server
  }
}
```

## Features and Benefits

As a child of the `FormObserver`, the `FormValidityObserver` inherits the same [benefits](../form-observer/README.md#features-and-benefits) as its parent class. Besides its great performance, there are 2 benefits of the `FormValidityObserver` that we want to call attention to in particular:

### Consistent API across All Frameworks

Like the [Testing Library Family](https://testing-library.com/docs/), the `FormValidityObserver` gives you a simple-yet-powerful API that works with pure JS _and_ with all JS frameworks out of the box. Tired of having to learn a _new_ form validation library every time you try (or abandon) another JS framework? We've got you covered. And for those who are interested, we also provide (optional) [_convenience_ wrappers](./integrations/README.md) for several popular frameworks. (Don't worry, you'll still be working with the exact same API.)

### Minimal and Familiar API

The `FormValidityObserver` embraces [Svelte's](https://svelte.dev/) philosophy of _enhancing_ the features that browsers provide natively (instead of replacing them or introducing unnecessary complexity). Consequently, you won't have to reach for our API unless you _want_ to. When you do, the code you write will be minimal, and it will feel very similar to what you'd write if you were using the browser's form validation functions.

Want to reuse the browser's native error messages and make them accessible? Simply add the correct [HTML validation attributes](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState) to your field, add an [error element](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA21#example-2-identifying-errors-in-data-format) to your markup, and the `FormValidityObserver` will take care of the rest. (This is what our [earlier code example](#initial-code-example) did.) No extra JS is required; there's no need to complicate your code with framework-specific components or functions.

As expected for any form validation library, we also support the following features for _both_ accessible error messages _and_ the browser's native error bubbles:

- Synchronous _and_ asynchronous custom validation.
- Custom error messages.
- Automatic handling of fields that are dynamically added to (or removed from) the DOM. (Say goodbye to complex calls to `register` and `unregister`.)
- Progressive Enhancement: Because the `FormValidityObserver` _enhances_ browser functionality, your form validation will fallback to the browser's native behavior when JS is unavailable.
- And much more...

## API

### Constructor: `FormValidityObserver(types, options)`

The `FormValidityObserver()` constructor creates a new observer and configures it with the `options` that you pass in. Because the `FormValidityObserver` only focuses on one task, it has a simple constructor with no overloads.

<dl>
  <dt id="form-validity-observer-parameters-types"><code>types</code></dt>
  <dd>
    A string <em>or</em> an array of strings representing the type(s) of event(s) that should cause a form's field to be validated. As with the <code>FormObserver</code>, the string(s) can be <a href="https://developer.mozilla.org/en-US/docs/Web/Events">commonly recognized</a> event types <em>or</em> your own custom event types.
  </dd>

  <dt id="form-validity-observer-parameters-options"><code>options</code> (Optional)</dt>
  <dd>
    <p>The options used to configure the <code>FormValidityObserver</code>. The following properties can be provided:</p>
    <dl>
      <dt id="form-validity-observer-options-use-event-capturing"><code>useEventCapturing: boolean</code></dt>
      <dd>
        Indicates that the observer's event listener should be called during the event capturing phase instead of the event bubbling phase. Defaults to <code>false</code>. See <a href="https://www.w3.org/TR/DOM-Level-3-Events/#event-flow">DOM Event Flow</a> for more details on event phases.
      </dd>
      <dt id="form-validity-observer-options-scroller"><code>scroller: (fieldOrRadiogroup: FormField) => void</code></dt>
      <dd>
        The function used to scroll a field (or radiogroup) that has failed validation into view. Defaults to a function that calls <a href="https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView"><code>scrollIntoView()</code></a> on the field (or radiogroup) that failed validation.
      </dd>
      <dt id="form-validity-observer-options-renderer"><code>renderer: (errorContainer: HTMLElement, errorMessage: M) => void</code></dt>
      <dd>
        <p>
          The custom function used to render error messages to the DOM when a validation constraint's <code>render</code> option is <code>true</code> or when <a href="#method-formvalidityobserversetfielderrorname-string-message-errormessagestringerrormessagem-render-boolean-void"><code>FormValidityObserver.setFieldError()</code></a> is called with the <code>render=true</code> option. (See the <a href="./types.md#validationerrorsm"><code>ValidationErrors</code></a> type for more details about validation constraints.)
        </p>
        <p>
          The message type, <code>M</code> is determined from your function definition. The type can be anything (e.g., a <code>string</code>, an <code>object</code>, a <code>ReactElement</code>, or anything else).
        </p>
        <p>
          The <code>renderer</code> defaults to a function that accepts error messages of type <code>string</code> and renders them to the DOM as raw HTML.
        </p>
      </dd>
    </dl>
  </dd>
</dl>

**Example**

```ts
// Use default `scroller` and `renderer`
const observerWithDefaults = new FormValidityObserver("input");

// Use custom `scroller` and `renderer`
const observer = new FormValidityObserver("focusout", {
  // Scroll field into view WITH its label (if possible)
  scroller(fieldOrRadiogroup) {
    if ("labels" in fieldOrRadiogroup) {
      const [label] = fieldOrRadiogroup.labels as NodeListOf<HTMLLabelElement>;
      return label.scrollIntoView({ behavior: "smooth" });
    }

    fieldOrRadiogroup.scrollIntoView({ behavior: "smooth" });
  },

  // Error messages rendered to the DOM are expected to be in the form of `HTMLElement`s
  renderer(errorContainer: HTMLElement, errorMessage: HTMLElement) {
    errorContainer.replaceChildren(errorMessage);
  },
});
```

### Method: `FormValidityObserver.observe(form: HTMLFormElement): boolean`

Instructs the observer to validate any fields (belonging to the provided form) that a user interacts with, and registers the observer's validation functions with the provided form. Automatic field validation will only occur when a field belonging to the form emits an event matching one of the `types` that were specified during the observer's construction. Unlike the `FormObserver` and the `FormStorageObserver`, _the `FormValidityObserver` may only observe 1 form at a time_.

Note that the `name` attribute is what the observer uses to [identify fields](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormControlsCollection/namedItem) during manual form validation and error handling. Therefore, a valid `name` is required for all validated fields. **If a field does not have a `name`, then it _will not_ participate in form validation.** Since the [web specification](https://www.w3.org/TR/html401/interact/forms.html#successful-controls) does not allow nameless fields to participate in form submission, this is likely a requirement that your application already satisfies.

If the provided form element was not being watched before `observe()` was called, the method will run any necessary setup logic and return `true`. Otherwise, the method does nothing and returns `false`.

**Example**

```js
const observer = new FormValidityObserver("input");
const form = document.getElementById("my-form");

observer.observe(form); // Returns `true`, sets up manual validation/error-handling methods
observer.observe(form); // Returns `false`, does nothing

form.elements[0].dispatchEvent(new InputEvent("input")); // Field gets validated
```

### Method: `FormValidityObserver.unobserve(form: HTMLFormElement): boolean`

Instructs the observer to stop watching a form for user interactions. The form's fields will no longer be validated when a user interacts with them, and the observer's manual validation functions will be disabled.

If the provided form element was being watched before `unobserve()` was called, the method will run any necessary teardown logic and return `true`. Otherwise, the method does nothing and returns `false`.

**Example**

```js
const observer = new FormValidityObserver("change");
const form = document.getElementById("my-form");
observer.unobserve(form); // Returns `false`, does nothing

observer.observe(form);
form.elements[0].dispatchEvent(new Event("change")); // Field gets validated

observer.unobserve(form); // Returns `true`, disables manual validation/error-handling methods
form.elements[1].dispatchEvent(new Event("change")); // Does nothing, the form is no longer being observed
```

### Method: `FormValidityObserver.disconnect(): void`

Behaves the same way as `unobserve`, except that 1&rpar; You do not need to provide the currently-observed `form` as an argument, and 2&rpar; the method does not return a value.

**Example**

```js
const observer = new FormValidityObserver("focusout");
const form = document.getElementById("my-form");

observer.observe(form);
observer.disconnect(); // `unobserve`s the currently-watched form

observer.unobserve(form); // Returns `false` because the form was already `unobserve`d
form1.elements[0].dispatchEvent(new FocusEvent("focusout")); // Does nothing
```

### Method: `FormValidityObserver.configure(name: string, errorMessages: `[`ValidationErrors<M>`](./types.md#validationerrorsm)`): void`

Configures the error messages that will be displayed for a form field's validation constraints. If an error message is not configured for a validation constraint, then the browser's default error message for that constraint will be used instead.

Note: If the field is _only_ using the browser's default error messages, it does _not_ need to be `configure`d.

#### Parameters

<dl>
  <dt><code>name</code></dt>
  <dd>The <code>name</code> of the form field.

  <dt><code>errorMessages</code></dt>
  <dd>
    A <code>key</code>-<code>value</code> pair of validation constraints (key) and their corresponding error messages (value).
  </dd>
</dl>

**Example**

```html
<form>
  <label for="credit-card">Credit Card</label>
  <input id="credit-card" name="credit-card" pattern="\d{16}" required aria-describedby="credit-card-error" />
  <div id="credit-card-error" role="alert"></div>

  <!-- Other Form Fields -->
</form>
```

```js
const observer = new FormValidityObserver("focusout");
const form = document.querySelector("form");
observer.observe(form);

// `configure` a field
observer.configure("credit-card", { pattern: "Card number must be 16 digits" });
const creditCardField = document.querySelector("[name='credit-card']");

// Browser's native error message for `required` fields is displayed.
creditCardField.dispatchEvent(new FocusEvent("focusout"));

// Our custom error message for `pattern` will be displayed,
// _not_ the browser's native error message for the `pattern` attribute.
creditCardField.value = "abcd";
creditCardField.dispatchEvent(new FocusEvent("focusout"));
```

### Method: `FormValidityObserver.validateFields(options?: ValidateFieldsOptions): boolean | Promise<boolean>`

Validates all of the observed form's fields, returning `true` if _all_ of the validated fields pass validation and `false` otherwise. The `boolean` that `validateFields()` returns will be wrapped in a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) if _any_ of the validated fields use an asynchronous function for the [`validate` constraint](./types.md#validationerrorsm). This promise will `resolve` after all asynchronous validation functions have `settled`.

#### Parameters

`validateFields()` accepts a single argument: an _optional_ `options` object. The object supports the following properties:

<dl>
  <dt><code>focus</code></dl>
  <dd>
    <p>Indicates that the <em>first</em> field in the DOM that fails validation should be focused. Defaults to <code>false</code>.</p>
  </dd>
</dl>

When the `focus` option is `false`, you can consider `validateFields()` to be an enhanced version of `form.checkValidity()`. When the `focus` option is `true`, you can consider `validateFields()` to be an enhanced version of [`form.reportValidity()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/reportValidity).

### Method: `FormValidityObserver.validateField(name: string, options?: ValidateFieldOptions): boolean | Promise<boolean>`

Validates the form field with the specified `name`, returning `true` if the field passes validation and `false` otherwise. The `boolean` that `validateField()` returns will be wrapped in a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) if the field's [`validate` constraint](./types.md#validationerrorsm) runs asynchronously. This promise will `resolve` after the asynchronous validation function `resolves`. Unlike the [`validateFields()`](#method-formvalidityobservervalidatefieldsoptions-validatefieldsoptions-boolean--promiseboolean) method, this promise will also `reject` if the asynchronous validation function `rejects`.

#### Parameters

<dl>
  <dt><code>name</code></dt>
  <dd>The name of the form field being validated</dd>

  <dt><code>options</code> (Optional)</dt>
  <dd>
    <p>An object used to configure the <code>validateField()</code> method. The following properties are supported:</p>
    <dl>
      <dt><code>focus</code></dt>
      <dd>Indicates that the field should be focused if it fails validation. Defaults to <code>false</code>.</dd>
    </dl>
  </dd>
</dl>

When the `focus` option is `false`, you can consider `validateField()` to be an enhanced version of [`field.checkValidity()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/checkValidity). When the `focus` option is `true`, you can consider `validateField()` to be an enhanced version of [`field.reportValidity()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/reportValidity).

### Method: `FormValidityObserver.setFieldError(name: string, message: `[`ErrorMessage<string>`](./types.md#errormessagem)`|`[`ErrorMessage<M>`](./types.md#errormessagem)`, render?: boolean): void`

Marks the form field having the specified `name` as invalid (via the [`[aria-invalid="true"]`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-invalid) attribute) and applies the provided error `message` to it.

Typically, you shouldn't need to call this method manually; but in rare situations it might be helpful.

#### Parameters

<dl>
  <dt><code>name</code></dt>
  <dd>The name of the invalid form field</dd>

  <dt><code>message</code></dt>
  <dd>
    <p>
      The error message to apply to the invalid form field. If the field has an <a href="https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA21#example-2-identifying-errors-in-data-format">accessible error container</a>, then the field's error message will be displayed there. Otherwise, the error will only be displayed when the browser displays its native error bubbles.
    </p>
  </dd>

  <dt><code>render</code> (Optional)</dt>
  <dd>
    <p>
      Indicates that the field's error message should be rendered to the DOM using the observer's <a href="#form-validity-observer-options-renderer"><code>renderer</code> function</a>. Defaults to <code>false</code>.
    </p>
    <p>
      When the <code>render</code> argument is <code>false</code> (or omitted), then the error message <em>must</em> be of type <code>string</code>. When <code>render</code> is <code>true</code>, then the error message <em>must</em> be of type <code>M</code>, where <code>M</code> is determined from the observer's <code>renderer</code> function.
    </p>
  </dd>
</dl>

**Example**

```js
const observer = new FormValidityObserver("change"); // By default, the `renderer` renders strings as raw HTML
const form = document.getElementById("my-form");
observer.observe(form);

// Regular `string` Error Messages
observer.setFieldError("combobox", "There was a problem with this field...");

// Special `rendered` Error Messages
const htmlErrorString = `<ul><li>Field is missing a cool word.</li><li>Also we just don't like the value.</li></ul>`;
observer.setFieldError("textbox", htmlErrorString, true);
```

### Method: `FormValidityObserver.clearFieldError(name: string): void`

Marks the form field with the specified `name` as valid (via the [`[aria-invalid="false"]`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-invalid) attribute) and clears its error message.

Typically, you shouldn't need to call this method manually; but in rare situations it might be helpful.

#### Parameters

<dl>
  <dt><code>name</code></dt>
  <dd>The <code>name</code> of the form field whose error should be cleared.</dd>
</dl>

<!--
TODO: Some `Gudies` that could be helpful (besides the norm):

1) How to style form fields and their error messages.
2) MAYBE something on how to work with accessible error messages?
3) MAYBE something about `novalidate`?
4) Scrolling labels into view?

Should we include a `Philosphy` document/page?
-->
