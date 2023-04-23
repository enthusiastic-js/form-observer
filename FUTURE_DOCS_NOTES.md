# Future Docs Notes

This is a TEMPORARY file intended to capture some thoughts that I want to put in the documentation of this package in the future. More specifically, this file contains important notes that I'm likely to forget by the time I actually write the docs. The notes that you see here are not necessarily the final form of the notes that will appear in the docs.

## `FormObserver`

### `FormObserver.observe`

**Warning**: For performance reasons, each instance of `FormObserver` assumes that _all_ of the `form`s which it observes belong to the same `Document`. More specifically, it assumes that the `ownerDocument` of the first `form` that you observe will also be the `ownerDocument` of every other `form` that you observe. If you want to observe `forms` on the same page that belong to entirely different `Document`s, then you should create separate `FormObserver`s for each `Document` involved. (If you're unfamiliar with [`Node.ownerDocument`](https://developer.mozilla.org/en-US/docs/Web/API/Node/ownerDocument), then this is likely something that you _don't_ need to worry about. It would be incredibly unusual to try to observe `form`s across different `Document`s anyway.)

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
