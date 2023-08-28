# Future Docs Notes

This is a TEMPORARY file intended to capture some thoughts that I want to put in the documentation of this package in the future. More specifically, this file contains important notes that I'm likely to forget by the time I actually write the docs. The notes that you see here are not necessarily the final form of the notes that will appear in the docs.

## `FormObserver`

### `FormObserver.observe`

**Warning**: For performance reasons, each instance of `FormObserver` assumes that _all_ of the `form`s which it observes belong to the same `Document`. More specifically, it assumes that the `ownerDocument` of the first `form` that you observe will also be the `ownerDocument` of every other `form` that you observe. If you want to observe `forms` on the same page that belong to entirely different `Document`s, then you should create separate `FormObserver`s for each `Document` involved. (If you're unfamiliar with [`Node.ownerDocument`](https://developer.mozilla.org/en-US/docs/Web/API/Node/ownerDocument), then this is likely something that you _don't_ need to worry about. It would be incredibly unusual to try to observe `form`s across different `Document`s anyway.)

### Custom Elements

**Note: If you don't use Custom Elements, and/or you're not interested in them, you can ignore this section.**

Because the `FormObserver` builds on top of native JS features instead of relying on a JS framework (e.g., React), it is _completely_ compatible with native [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components). However, there are some things to keep in mind when attempting to use them.

#### Your Custom Element Must Be a Valid Form Control

The `FormObserver` (and all of its subclasses) will only observe elements that are actually recognized as form controls. If you're using regular HTML elements, this basically includes any elements that are supported by the [`HTMLFormElement.elements`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements) property by default. If you're using Custom Elements, this _also_ includes any elements that are [specifically identified as form controls](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/attachInternals). Thus, any Custom Element that you want to be observed will need the following setup at a minimum:

```ts
class CustomField extends HTMLElement {
  static formAssociated = true;
  #internals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
  }
}

customElements.define("custom-field", CustomField);
```

This is also the code that would be required to allow your Custom Element to participate in HTML forms in general. So the `FormObserver` isn't requiring any additional work on your part.

Note: You are free to make the `ElementInternals` public, but it is highly recommended to keep this property [private](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields). (It is completely safe to expose the _properties_ on the `ElementInternals` interface. Only the reference to the `ElementInternals` object needs to be kept private.)

#### Be Mindful of the Shadow Boundary

The [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) is a very useful tool for encapsulating the details of a Web Component. However, this tool is not very practical when it comes to HTML forms. Remember, the _purpose_ of the Shadow DOM is to _prevent_ anything on the outside from accessing a Web Component's internal elements; and the "internal elements" include any fields in the Shadow DOM. This means that a `form` in the Light DOM _cannot_ see fields in the Shadow DOM. Similarly, a `form` in the Shadow DOM _cannot_ see fields in the Light DOM _even if the fields are [slotted](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots)_. Consider the following code:

```html
<form id="light-form">
  <input name="input-light-dom" type="text" />
  <shadow-input></shadow-input>
  <button type="submit">Submit Me!</button>
</form>

<input name="blocked" form="shadow-form" />
<shadow-form>
  <textarea name="slotted" form="shadow-form"></textarea>
</shadow-form>
```

```ts
class ShadowInput extends HTMLElement {
  #shadow;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: "open" });

    const input = document.createElement("input");
    input.setAttribute("name", "input-shadow-dom");
    input.setAttribute("form", "light-form");
    this.#shadow.appendChild(input);
  }
}

class ShadowForm extends HTMLElement {
  #shadow;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: "open" });

    this.#shadow.innerHTML = `
      <form id="shadow-form">
        <input name="internal">
        <slot></slot>
      </form>
    `;
  }
}

customElements.define("shadow-input", ShadowInput);
customElements.define("shadow-form", ShadowForm);
```

(You can test this code out on the [MDN Playground](https://developer.mozilla.org/en-US/play) if you like.)

In this example, the `input-shadow-dom` field is _completely invisible_ to the `light-form` form element. This field is invisible to the form despite the fact that the field is technically a _child_ of the form _and_ the fact that the field's `form` attribute points to the `light-form` element. The `light-form` form element cannot see the `input-shadow-dom` field because the Shadow DOM prevents the form in the Light DOM from accessing the field in the Shadow DOM. Thus, the form in the Light DOM can only see the `input-light-dom` field and the submit button.

Similarly, _both_ the `blocked` input _and_ the `slotted` textarea are _completely invisible_ to the `shadow-form` form element even though both of the fields have `form` attributes that point to the form element. Because the input and even the _slotted_ textarea are defined in the Light DOM, the form element in the Shadow DOM refuses to welcome those elements entirely. Thus, the form in the Shadow DOM can only see the `internal` input.

In the above example, the `input-shadow-dom` field, the `blocked` field, and the `slotted` field _don't partake in any HTML forms at all_. This means that these fields don't partake in form submission, nor any of the other form-related features that fields can usually take advantage of. Theoretically, someone could try to bypass these restrictions, but all such efforts would complicate things unnecessarily. Consequently, in order to keep your code clean, functional, and reliable, you should either put your _entire_ form in the Light DOM _or_ in the Shadow DOM. You should never try to mix your form's fields between the Light DOM and the Shadow DOM, nor should you try to mix your form's fields between _separate_ Shadow DOM instances.

How does this relate to the `FormObserver`? Well, naturally a `FormObserver` can only observe fields that are visible to the watched form. Because a field in the Shadow DOM would be invisible to a form in the Light DOM, it would also be invisible to a `FormObserver` which observes a form in the Light DOM. Again, for everything to function correctly, you should either put the _entire_ form -- including its fields -- in the Light DOM, or put the _entire_ form in the Shadow DOM. Then and only then will both the native JS form features _and_ the `FormObserver` work as desired.

This is not a limitation of the `FormObserver`, nor is it a limitation of the Shadow DOM. It is an intentional design decision to make sure that the Shadow DOM truly is not disrupted by anything from the outside. In other words, the `FormObserver` is simply complying with what the current web standards require. The Shadow DOM does not have to be used in every situation where a Custom Element is used. In fact, it is recommended to avoid the Shadow DOM when it comes to Custom Elements that function as form controls.

## `FormStorageObserver`

### Be Careful Not to Mismatch Your Fields' `id`s and `name`s

One thing that's really cool about JavaScript's native API for `form`s is that it will automatically group your radio buttons together if you give them the same `name`. Consider this markup:

```html
<form>
  <fieldset>
    <legend>What flavor of ice cream would you like?</legend>

    <div>
      <input id="chocolate" name="flavor" type="radio" value="chocolate" checked />
      <label for="chocolate">Chocolate</label>
    </div>

    <div>
      <input id="vanilla" name="flavor" type="radio" value="vanilla" />
      <label for="vanilla">Vanilla</label>
    </div>

    <div>
      <input id="strawberry" name="flavor" type="radio" value="strawberry" />
      <label for="strawberry">Strawberry</label>
    </div>
  </fieldset>
</form>
```

If we use the [`HTMLFormElement.elements.namedItem()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormControlsCollection/namedItem) method to access the radio buttons by `name`, we'll get a _single_ `RadioNodeList` representing the radio button group _and_ the currently selected value:

```js
const radioGroup = form.elements.namedItem("flavor");

console.log(radioGroup.value); // "chocolate"
Array.from(radioGroup).forEach((radioButton) => console.log(radioButton)); // Logs each individual radio button
```

Additionally, when we group our radio buttons by `name`, JS is smart enough to determine the current value of the radio button group when we pass our `form` element to the [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) constructor.

```js
const formData = new FormData(form);
console.log(formData.get("flavor")); // "chocolate"
```

This is a really neat feature! But this feature unfortunately has some flaws -- flaws that are relevant to your usage of the `FormStorageObserver`. As it turns out, JS is not only capable of grouping your fields by `name`, but it's also capable of grouping your fields by `id`. Now, you shouldn't be using duplicate `id`s in your markup, as that is invalid HTML. But what happens if you mismatch your `id`s and `name`s? Consider this markup:

```html
<form>
  <label for="bad-identifier">Email</label>
  <input id="bad-identifier" name="email" type="email" />

  <label for="password">Password</label>
  <input id="password" name="bad-identifier" type="password" />
</form>
```

Here, the `email` field has an `id` that matches the `name` of the `password` field. Technically speaking, this markup is 100% legal HTML. However, the `HTMLFormElement.elements.namedItem()` method considers _both_ `id`s _and_ `name`s to be valid identifiers. Consequently, in this example, it groups the `email` field and the `password` field together into a `RadioNodeList` -- even though no radio buttons are actually present in the form at all!

```js
const group = form.elements.namedItem("bad-identifier");
console.log(group); // RadioNodeList
```

Remember that the `FormStorageObserver` stores and references `localStorage` data for forms based on the `name`s of the fields that the form owns. So if you accidentally write code that groups _non-radio-button fields_ together, then the fields in that "group" will not have their data stored correctly. Thus, you should always make sure that whatever `name` you use for one field does not match the `id` of another unrelated field. (In practice, you will likely accomplish this naturally as you write code. It is very rare to encounter this problem. We have only pointed out this issue here for anyone who happens to encounter such a rare case.)

If you're wondering... It is completely safe to apply the same `id` and `name` to a _single_ field. Doing so will not cause any problems for you:

```html
<form>
  <label for="first-name">First Name</label>
  <input id="first-name" name="first-name" type="text" />
</form>
```

```js
const input = form.elements.namedItem("first-name");
console.log(input); // HTMLInputElement
```

### Clearing `localStorage` Data for Conditionally-rendered Fields

Typically, the `FormStorageObserver.clear` static method will automatically clear _all_ of your `form`'s data from `localStorage` when you pass your `HTMLFormElement` to the method by itself:

```html
<form>
  <label for="username">Username</label>
  <input id="username" name="username" type="text" />

  <label for="email">Email</label>
  <input id="email" name="email" type="email" />

  <label for="birthday">Birthday</label>
  <input id="birthday" name="birthday" type="date" />
</form>
```

```js
// After performing user interactions that store data for all fields ...
console.log(localStorage.length); // 3

FormStorageObserver.clear(form);
console.log(localStorage.length); // 0
```

However, the `FormStorageObserver.clear` method will only remove data from `localStorage` for the fields that it sees belong to the `form` _at the moment that the method was called_. Consider this JavaScript code for the same markup:

```js
// After performing user interactions that store data for all fields ...
console.log(localStorage.length); // 3

document.getElementById("birthday").remove();
FormStorageObserver.clear(form);
console.log(localStorage.length); // 1
```

Because the `birthday` field was absent from the `form` at the moment that `FormStorageObserver.clear` was called, its value was left in `localStorage`. To remove this value from `localStorage` after the fact, we'd have to call the field-specific overload of `FormStorageObserver.clear`:

```js
FormStorageObserver.clear(form, "birthday");
console.log(localStorage.length); // 0
```

Now, in practice, it's highly uncommon to remove HTMLElements manually with something like [`Element.remove()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/remove). However, when working with popular JavaScript frameworks like Svelte, Vue, and React, it _is_ fairly common to render elements to the DOM _conditionally_. For example, perhaps you want to display certain form fields to the user only when a specific checkbox is checked. Consider this markup (this is raw HTML):

```html
<form>
  <!-- Other form fields -->

  <!-- Somewhere in an online cart checkout form -->
  <input id="new-card" name="new-card" type="checkbox" aria-controls="new-card-info" />
  <label for="new-card">Use New Payment Method</label>

  <!-- We only want to show these fields when the checkbox is checked -->
  <fieldset id="new-card-info">
    <legend>Card Info</legend>

    <label for="card-number">Card Number</label>
    <input id="card-number" name="card-number" type="text" inputmode="numeric" />

    <label for="expires">Expiration Date</label>
    <input id="expires" name="expires" type="month" />

    <label for="cvv">Security Code</label>
    <input id="cvv" name="cvv" type="text" inputmode="numeric" minlength="3" maxlength="3" pattern="\d{3}" />

    <label for="cardholder">Cardholder</label>
    <input id="cardholder" name="cardholder" type="text" />
  </fieldset>
</form>
```

There are multiple ways to go about solving this problem. Here are 3:

#### 1&rpar; Use CSS _Instead of_ Conditional Rendering

CSS is probably the easiest way to solve this problem, and it requires 0 JavaScript (which is a big win from an accessibility standpoint). Using the [`:checked`](https://developer.mozilla.org/en-US/docs/Web/CSS/:checked) CSS [`pseudo-class`](https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes) selector, we can cause the credit card fields to be displayed only when our checkbox is checked.

```css
fieldset#new-card-info {
  display: none;
}

input#new-card:checked ~ fieldset#new-card-info {
  display: block;
}
```

Short and sweet! :&rpar; With this approach, the user experience works correctly _without_ any JavaScript and _without_ the need for conditionally rendering DOM elements[^1]. This means that although the user would be unable to see the fields when they're hidden, the `FormStorageObserver.clear(form)` method would still be able to see these fields and clear their data.

If you haven't done so already, it might be worth your time to familiarize yourself with the various [CSS Selectors](https://www.w3schools.com/cssref/css_selectors.php) supported by modern browsers. Oftentimes (though not always), CSS will be able to toggle the visibility of elements for you in a way that's simpler than using JavaScript.

(A side note: Remember that this is just for the sake of example. In the real world, you probably wouldn't want to store your users' credit card data in `localStorage` for security reasons.)

#### 2&rpar; Use the `hidden` Attribute _Instead of_ Conditional Rendering

The [`hidden`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/hidden) attribute allows us to remove an element (and its children) from view without removing the physical element(s) from the DOM. We can configure our checkbox with an event handler that automatically hides/reveals the credit card fields when the checkbox is clicked. This approach requires a little bit of JavaScript, but not much.

```html
<form>
  <!-- Other form fields -->
  <!-- Somewhere in an online cart checkout form -->
  <input id="new-card" name="new-card" type="checkbox" aria-controls="new-card-info" />
  <label for="new-card">Use New Payment Method</label>

  <!-- Add `hidden` attribute to fieldset by default -->
  <fieldset id="new-card-info" hidden>
    <!-- Credit Card Fields -->
  </fieldset>
</form>
```

```js
const checkbox = document.getElementById("new-card");
checkbox.addEventListener("change", handleCheckboxChange);

function handleCheckboxChange(event) {
  const checkbox = event.currentTarget;
  const fieldset = document.getElementById(checkbox.getAttribute("aria-controls"));

  if (checkbox.checked) fieldset.removeAttribute("hidden");
  else fieldset.setAttribute("hidden", "");
}
```

Yet again, we luck out with a situation where we don't have to remove elements from the DOM at all. This means that the `FormStorageObserver.clear(form)` method will still be able to see _all_ of the form's fields (even if the user cannot) and clear their values from `localStorage`.

Note: So far we've been able to get away with using basic HTML and JavaScript to get the job done. If you're using a JS framework, then these examples can be translated into the frontend framework of your choice with ease.

#### 3&rpar; Automatically Clear `localStorage` Data for Any Fields That Get Unmounted

This option is perhaps the least convenient. But if you're determined to use conditional rendering (or if you're simply required to use conditional rendering), then this will probably be your best bet for clearing _all_ of your form's data from `localStorage` _reliably_.

The idea is basically to call `FormStorageObserver.clear(form, fieldName)` automatically whenever a field is _removed_ from the DOM by your JavaScript framework. There are various ways to do this. You can make this approach as basic and specific as you want:

```tsx
// Framework: React + TS

function MyForm() {
  const [someOtherBoolean, setSomeOtherBoolean] = useState(false);
  const [useNewCard, setUseNewCard] = useState(false);

  function handleCheckboxChange(event: React.ChangeEvent<HTMLInputElement>) {
    setUseNewCard(event.target.checked);
  }

  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (useNewCard) return;

    // Clear each of the field names that belong to the credit card info group
    const fieldNames = ["card-number", "expires", "cvv", "cardholder"];
    fieldNames.forEach((name) => FormStorageObserver.clear(formRef.current as HTMLFormElement, name));
  }, [useNewCard]);

  useEffect(() => {
    if (someOtherBoolean) return;
    FormStorageObserver.clear(formRef.current as HTMLFormElement, "test-input");
  }, [someOtherBoolean]);

  return (
    <form ref={formRef}>
      {/* ... Other form fields ... */}
      {/* ... Somewhere in an online cart checkout form ... */}
      <input
        id="new-card"
        name="new-card"
        type="checkbox"
        aria-controls="new-card-info"
        onChange={handleCheckboxChange}
      />
      <label htmlFor="new-card">Use New Payment Method</label>

      {useNewCard && <fieldset id="new-card-info">{/* ...  Credit Card Fields ... */}</fieldset>}

      {/* ... Some other condtionally rendered field ... */}
      {someOtherBoolean && <input name="test-input" type="text" />}
    </form>
  );
}
```

Or as flexible and reusable as you want:

```tsx
// Framework: React + TS

/* -------------------- src/actions/autoClearStorage.ts -------------------- */
/** Automatically clears a field's data from `localStorage` when it unmounts */
function autoClearStorage() {
  let field: FormField | null;

  return function formFieldRefCallback(reactRef: typeof field) {
    if (reactRef) {
      // Store a reference to the field for use during unmounting
      field = reactRef;
      return;
    }

    if (!field?.form) return (field = null); // Ignore anything that isn't a form field and remove element reference

    // Clear field data from `localStorage` during unmounting
    if (field instanceof HTMLFieldSetElement) {
      return (Array.from(field.elements) as FormField[]).forEach((e) => {
        FormStorageObserver.clear(e.form as HTMLFormElement, e.name);
      });
    }

    FormStorageObserver.clear(field.form, field.name);
    field = null; // Remove element reference after unmounting
  };
}

/* -------------------- src/components/MyForm.tsx -------------------- */
function MyForm() {
  const [someOtherBoolean, setSomeOtherBoolean] = useState(false);
  const [useNewCard, setUseNewCard] = useState(false);

  function handleCheckboxChange(event: React.ChangeEvent<HTMLInputElement>) {
    setUseNewCard(event.target.checked);
  }

  return (
    <form>
      {/* ... Other form fields ... */}
      {/* ... Somewhere in an online cart checkout form ... */}
      <input
        id="new-card"
        name="new-card"
        type="checkbox"
        aria-controls="new-card-info"
        onChange={handleCheckboxChange}
      />
      <label htmlFor="new-card">Use New Payment Method</label>

      {useNewCard && (
        <fieldset ref={autoClearStorage()} id="new-card-info">
          {/* ...  Credit Card Fields ... */}
        </fieldset>
      )}

      {/* ... Some other condtionally rendered field ... */}
      {someOtherBoolean && <input ref={autoClearStorage()} name="test-input" type="text" />}
    </form>
  );
}
```

(If you use React and the code above looked unfamiliar, it might be helpful to familiarize yourself with [React's ref callbacks](https://react.dev/reference/react-dom/components/common#ref-callback) and with "[React Actions](https://thomason-isaiah.medium.com/do-you-really-need-react-state-to-format-inputs-9d17f5f837fd?source=user_profile---------0----------------------------)")

There are more ways to clear data reliably from `localStorage` for conditionally-rendered form fields, and many of them are simple. But hopefully this helps give you an idea of the kinds of ways you could solve this problem. Currently, the `FormStorageObserver` intentionally _does not_ take responsibility for this edge case. However, if it makes sense to shift the responsibility for this to the `FormStorageObserver` in the future, that will certainly be done (though doing so would have some drawbacks).

[^1]: The idea of leaving hidden form fields in the DOM may be unappealing to some because it would allow the data from those fields to be included in the form's submitted [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData). For example, in our case, a user could start adding new credit card information, change their mind, and choose to use an already-existing payment method instead. If they do this, there's a chance that both the existing credit card information _and_ the new credit card information could be submitted to the server together -- which would be problematic. However, it's important to bear in mind that conditionally rendering form fields will not sufficiently solve this problem because bad actors (or even clever, curious users) could still cause this kind of invalid data to be sent to the server anyway. Ultimately, it is the server's responsibility to validate all of the data that it receives. Thus, because the server should already be handling this scenario regardless, keeping hidden form fields in the DOM introduces no additional problems or complexities from a data validation standpoint.

## `FormValidityObserver`

### Restrictions

All frontend tools for forms require you to adhere to certain guidelines in order for the tool to function correctly with your application. Our tool is no different. But instead of introducing you to multitudinous tool-specific props, components, or functions to accomplish this goal, we rely on what HTML provides out of the box wherever possible. Thus, if you're writing _accessible_, _progressively enhanced_ forms, then you'll already be following the guidelines that we require.

The idea here is to make form validation as quick and easy as possible for those who are already following good web standards, and to encourage good web standards for those who aren't yet leaning into all of the power and accessibility features of the modern web. Here are our unique requirements:

- Form fields that participate in validation _must_ have a `name` attribute.
  - If your forms are [progressively enhanced](https://learn.svelte.dev/tutorial/progressive-enhancement), you will already be satisfying this. Leveraging the `name` attribute is perhaps the best way for form-related tools to identify form fields without causing any friction for the developer. All well-known frontend form tools require this in some way or another.
- Only [valid form controls](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements) may participate in form field validation.
  - Again, if your forms are progressively enhanced, you will already be satisfying this. If you're new to progressive enhancement, then don't worry. It's very easy to update your code -- whether written with pure JS or with the help of a JS framework -- to satify this requirement.
- A radio button group will only be validated if it is inside a [`fieldset`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) element with the [`radiogroup`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/radiogroup_role) role.
  - If your forms provide [accessible radio button groups](https://www.w3.org/WAI/tutorials/forms/grouping/#radio-buttons) to your users, you will already be satisfying this. We believe this requirement improves accessibility for end users and provides a clear way for the `FormValidityObserver` to identify radio groups _without_ sacrificing developer experience. (If you want deeper insight into why we made this decision, see [_Why Are Radio Buttons Only Validated When They're inside a `fieldset` with Role `radiogroup`?_](./DEVELOPMENT_NOTES.md#why-are-radio-buttons-only-validated-when-theyre-inside-a-fieldset-with-role-radiogroup-formvalidityobserver).)

### Custom Elements

**Note: If you don't use Custom Elements, and/or you're not interested in them, you can ignore this section.**

Unlike several of the other form validation libraries out there, the `FormValidityObserver` is compatible with native [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components). In addition to the guidelines given in the [`FormObserver` documentation](#custom-elements), there are a few things to keep in mind when using Custom Elements with the `FormValidityObserver`.

#### Expose the Validity State of Your Custom Element

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

#### (Optionally) Expose a `setCustomValidity` Method

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

This is a simple example that can be improved on if desired. For instance, if you want to play it safe, you can coerce the `error` argument to a string. To fully mimic the browser's native behavior, the `setCustomValidity` method should also check to see if there are any other broken validation constraints before attempting to clear the error message.

#### Be Mindful of Accessibility

When working with Custom Elements that also act as form fields, you should be careful to ensure that _the element which acts as a form field is also the element that will receive the field-related ARIA attributes_.

For example, if you're creating a [`combobox`](https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Roles/combobox_role) component that's intended to act as a superior `<select />` field, then you'd want to design your Web Component such that the element with the `combobox` role is the element that sets up the `ElementInternals` _and_ that receives all of the field-related ARIA attributes (such as `aria-invalid`). This will typically make it easier for you to build accessible components, especially if you're leveraging helpful features like the [`invalid` event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/invalid_event).

As far as the `FormValidityObserver` is concerned, it assumes that your Web Components follow this structure. More specifically, it assumes that the element which holds the `ElementInternals` is the element whose ARIA attributes should be automatically updated. This typically isn't something you'll need to think about unless your custom form control is a complex component composed of multiple sub-components.
