# Form Validity Observer

The `FormValidityObserver` is an [extension of the `FormObserver`](../form-observer/guides.md#extending-the-formobserver-with-specialized-logic) that automatically validates your fields _and_ displays [accessible](https://developer.mozilla.org/en-US/docs/Web/Accessibility) error messages for those fields as users interact with your forms. Additionally, it exposes methods that can be used to handle manual field/form validation and manual error display/removal.

<p id="initial-code-example"><strong>Example</strong></p>

```html
<textarea name="external-textbox" form="my-form" maxlength="150" required aria-describedby="textarea-error"></textarea>
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
  const success = observer.validateFields({ focus: true });

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
    A string <em>or</em> an array of strings representing the type(s) of event(s) that should cause a form's field to be validated. As with the <code>FormObserver</code>, the string(s) can be <a href="https://developer.mozilla.org/en-US/docs/Web/Events">commonly recognized</a> event types <em>or</em> your own <a href="../form-observer/guides.md#supporting-custom-event-types">custom</a> event types.
  </dd>

  <dt id="form-validity-observer-parameters-options"><code>options</code> (Optional)</dt>
  <dd>
    <p>The options used to configure the <code>FormValidityObserver</code>. The following properties can be provided:</p>
    <dl>
      <dt id="form-validity-observer-options-use-event-capturing"><code>useEventCapturing: boolean</code></dt>
      <dd>
        Indicates that the observer's event listener should be called during the event capturing phase instead of the event bubbling phase. Defaults to <code>false</code>. See <a href="https://www.w3.org/TR/DOM-Level-3-Events/#event-flow">DOM Event Flow</a> for more details on event phases.
      </dd>
      <dt id="form-validity-observer-options-scroller"><code>scroller: (fieldOrRadiogroup: ValidatableField) => void</code></dt>
      <dd>
        The function used to scroll a field (or radiogroup) that has failed validation into view. Defaults to a function that calls <a href="https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView"><code>scrollIntoView()</code></a> on the field (or radiogroup) that failed validation.
      </dd>
      <dt id="form-validity-observer-options-renderer"><code>renderer: (errorContainer: HTMLElement, errorMessage: M | null) => void</code></dt>
      <dd>
        <p>
          The function used to render error messages to the DOM when a validation constraint's <code>render</code> option is <code>true</code> or when <a href="#method-formvalidityobserversetfielderrorename-string-message-errormessagestring-eerrormessagem-e-render-boolean-void"><code>FormValidityObserver.setFieldError()</code></a> is called with the <code>render=true</code> option. (See the <a href="./types.md#validationerrorsm-e"><code>ValidationErrors</code></a> type for more details about validation constraints.) When a field becomes valid (or when <a href="#method-formvalidityobserverclearfielderrorname-string-void"><code>FormValidityObserver.clearFieldError()</code></a> is called), this function will be called with <code>null</code> if the field has an <a href="https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA21#example-2-identifying-errors-in-data-format">accessible error container</a>.
        </p>
        <p>
          The message type, <code>M</code> is determined from your function definition. The type can be anything (e.g., a <code>string</code>, an <code>object</code>, a <code>ReactElement</code>, or anything else).
        </p>
        <p>
          The <code>renderer</code> defaults to a function that accepts error messages of type <code>string</code> and renders them to the DOM as raw HTML.
        </p>
      </dd>
      <dt id="form-validity-observer-options-default-errors"><code>defaultErrors: ValidationErrors&lt;M, E&gt;</code></dt>
      <dd>
        <p>
          Configures the default error messages to display for the validation constraints. (See the <a href="#method-formvalidityobserverconfigureename-string-errormessages-validationerrorsm-e-void"><code>configure</code></a> method for more details about error message configuration, and refer to the <a href="./types.md#validationerrorsm-e"><code>ValidationErrors</code></a> type for more details about validation constraints.)
        </p>
        <p>
          <blockquote>
            <strong>Note: The <code>defaultErrors.validate</code> option will provide a default custom validation function for <em>all</em> fields in your form.</strong> This is primarily useful if you have a reusable validation function that you want to apply to all of your form's fields (for example, if you are using <a href="https://zod.dev">Zod</a>). See <a href="./guides.md#getting-the-most-out-of-the-defaulterrors-option"><i>Getting the Most out of the <code>defaultErrors</code></i> Option</a> for examples on how to use this option effectively.
          </blockquote>
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
  // Error messages will be rendered to the DOM as raw DOM Nodes
  renderer(errorContainer: HTMLElement, errorMessage: HTMLElement | null) {
    if (errorMessage === null) return errorContainer.replaceChildren();
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

### Method: `FormValidityObserver.configure<E>(name: string, errorMessages: `[`ValidationErrors<M, E>`](./types.md#validationerrorsm-e)`): void`

Configures the error messages that will be displayed for a form field's validation constraints. If an error message is not configured for a validation constraint and there is no corresponding [default configuration](#form-validity-observer-options-default-errors), then the field's [`validationMessage`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLObjectElement/validationMessage) will be used instead. For [native form fields](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements), the browser automatically supplies a default `validationMessage` depending on the broken constraint.

> Note: If the field is _only_ using the configured [`defaultErrors`](#form-validity-observer-options-default-errors) and/or the browser's default error messages, it _does not_ need to be `configure`d.

The Field Element Type, `E`, represents the form field being configured. This type is inferred from the `errorMessages` configuration and defaults to a general [`ValidatableField`](./types.md#validatablefield).

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

// Browser's native error message for `required` fields will be ACCESSIBLY displayed.
creditCardField.dispatchEvent(new FocusEvent("focusout"));

// Our custom error message for `pattern` will be ACCESSIBLY displayed,
// _not_ the browser's native error message for the `pattern` attribute.
creditCardField.value = "abcd";
creditCardField.dispatchEvent(new FocusEvent("focusout"));
```

### Method: `FormValidityObserver.validateFields(options?: ValidateFieldsOptions): boolean | Promise<boolean>`

Validates all of the observed form's fields, returning `true` if _all_ of the validated fields pass validation and `false` otherwise. The `boolean` that `validateFields()` returns will be wrapped in a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) if _any_ of the validated fields use an asynchronous function for the [`validate` constraint](./types.md#validationerrorsm-e). This promise will `resolve` after all asynchronous validation functions have `settled`.

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

Validates the form field with the specified `name`, returning `true` if the field passes validation and `false` otherwise. The `boolean` that `validateField()` returns will be wrapped in a [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) if the field's [`validate` constraint](./types.md#validationerrorsm-e) runs asynchronously. This promise will `resolve` after the asynchronous validation function `resolves`. Unlike the [`validateFields()`](#method-formvalidityobservervalidatefieldsoptions-validatefieldsoptions-boolean--promiseboolean) method, this promise will also `reject` if the asynchronous validation function `rejects`.

> Note: Per the HTML spec, any field whose [`willValidate`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/willValidate) property is `false` will automatically pass validation.

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

### Method: `FormValidityObserver.setFieldError<E>(name: string, message: `[`ErrorMessage<string, E>`](./types.md#errormessagem-e)`|`[`ErrorMessage<M, E>`](./types.md#errormessagem-e)`, render?: boolean): void`

Marks the form field having the specified `name` as invalid (via the [`[aria-invalid="true"]`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-invalid) attribute) and applies the provided error `message` to it. Typically, you shouldn't need to call this method manually; but in rare situations it might be helpful.

The Field Element Type, `E`, represents the invalid form field. This type is inferred from the error `message` if it is a function. Otherwise, `E` defaults to a general [`ValidatableField`](./types.md#validatablefield).

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

Typically, you shouldn't need to call this method manually; but in rare situations it might be helpful. For example, if you manually [exclude a field from constraint validation](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/willValidate) by marking it as [`disabled`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/disabled) with JavaScript, then you can use this method to delete the obsolete error message.

#### Parameters

<dl>
  <dt><code>name</code></dt>
  <dd>The <code>name</code> of the form field whose error should be cleared.</dd>
</dl>

## Restrictions

All frontend tools for forms require you to adhere to certain guidelines in order for the tool to function correctly with your application. Our tool is no different. But instead of introducing you to several tool-specific props, components, or functions to accomplish this goal, we rely on what HTML provides out of the box wherever possible. We do this for two reasons:

1. If you're writing _accessible_, _progressively enhanced_ forms, then you'll already be following the guidelines that we require without any additional effort.
2. This approach results in developers writing less code.

The idea here is to make form validation as quick and easy as possible for those who are already following good web standards, and to encourage good web standards for those who aren't yet leaning into all of the power and accessibility features of the modern web. Here are our 3 unique requirements:

**1&rpar; Form fields that participate in validation _must_ have a `name` attribute.**

<details>
  <summary>Justification</summary>

If your forms are [progressively enhanced](https://learn.svelte.dev/tutorial/progressive-enhancement), you will already be satisfying this requirement. Leveraging the `name` attribute enables users who lack access to JavaScript to use your forms. Moreover, the `name` attribute enables many well-known form-related tools to identify fields without causing friction with developers. Given these realities, this restriction seems reasonable to us.

</details>

**2&rpar; Only [valid form controls](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements) may participate in form field validation.**

<details>
  <summary>Justification</summary>

Again, if your forms are progressively enhanced, you will already be satisfying this requirement. Using valid form controls is required to enable users who lack access to JavaScript to use your forms. It also enables form validation libraries like this one to leverage the [`ValidityState`](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState) interface for form validation, which is great for simplicity and performance.

If you're new to progressive enhancement, then don't worry. It's fairly easy to update your code to satisfy this requirement -- whether it's written with pure JS or with the help of a JS framework.

(Note: For complex form controls, you can create a Web Component that [acts like a form control](./guides.md#usage-with-web-components). However, Web Components are not accessible to users who don't have JavaScript; so it is still recommended to have a fallback that functions with just HTML -- though it is not required.)

</details>

**3&rpar; A radio button group will only be validated if it is inside a [`fieldset`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) element with the [`radiogroup`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/radiogroup_role) role.**

<details>
  <summary>Justification</summary>

If your forms provide [accessible radio button groups](https://www.w3.org/WAI/tutorials/forms/grouping/#radio-buttons) to your users, you will _likely_ already be satisfying this requirement. (At most, you will only need to add `role="radiogroup"` to a few `fieldset`s.) We believe this requirement improves accessibility for end users by distinguishing [`radiogroup`s](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/radiogroup_role) from general [`group`s](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/group_role). It also provides a clear way for the `FormValidityObserver` to identify radio button groups _without_ sacrificing the developer experience. (If you want deeper insight into why we made this decision, see [_Why Are Radio Buttons Only Validated When They're inside a `fieldset` with Role `radiogroup`?_](../extras/development-notes.md#why-are-radio-buttons-only-validated-when-theyre-inside-a-fieldset-with-role-radiogroup-formvalidityobserver).)

</details>

## What about `aria-errormessage`?

If you're familiar with the [`aria-errormessage`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-errormessage) attribute, then you'll know that it is technically "better" than the [`aria-describedby`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-describedby) attribute when it comes to conveying error messages for invalid form fields. Although it is technically superior, the `aria-errormessage` attribute is also [far less supported](https://a11ysupport.io/tech/aria/aria-errormessage_attribute) by assistive technologies (as of 2023-10-27). Because the `aria-describedby` attribute is [accepted by the WAI](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA21#example-2-identifying-errors-in-data-format) as a valid means to convey error messages for fields, and because the attribute is more widely supported by assistive technologies, the `FormValidityObserver` uses this attribute for conveying error messages instead.

In the future, when `aria-errormessage` has better support, the `FormValidityObserver` will be updated to support it. Until then, the attribute will not be supported.

## What's Next?

- Read our [guides](./guides.md) to find out how you can get the most out of the `FormValidityObserver`.
- Using this tool in a JS framework? Check out the [integration guides](./integrations/) for ideas on how to reduce code duplication in your project.
- If you're particularly curious, you can also visit the [development notes](../extras/development-notes.md) to learn how and why certain design decisions were made.
- Play with our live examples on `StackBlitz`:
  - [Core](https://stackblitz.com/edit/form-observer-core-example?file=index.html,src%2Fmain.ts)
  - [Svelte Integration](https://stackblitz.com/edit/form-observer-svelte-example?file=src%2FApp.svelte)
  - [React Integration](https://stackblitz.com/edit/form-observer-react-example?file=src%2FApp.tsx)
  - [Vue Integration](https://stackblitz.com/edit/form-observer-vue-example?file=src%2FApp.vue)
  - [Solid Integration](https://stackblitz.com/edit/form-observer-solid-example?file=src%2FApp.tsx)
  - [Lit Integration](https://stackblitz.com/edit/form-observer-lit-example?file=src%2Flit-example.ts)
  - [Preact Integration](https://stackblitz.com/edit/form-observer-preact-example?file=src%2Fapp.tsx)
