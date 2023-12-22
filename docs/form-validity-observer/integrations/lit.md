# Lit + Form Validity Observer

A _convenience_ API for reducing code repetition in a [Lit](https://lit.dev/) application using the [`FormValidityObserver`](../README.md).

> Note: Due to some of Lit's unique behaviors, the API exposed by `@form-observer/lit` is slightly different from the API exposed by the other integration packages.

## Function: `automate(observer: FormObserver): DirectiveResult<typeof AutomateDirective>`

A Lit [`directive`](https://lit.dev/docs/templates/custom-directives/) that automatically sets up a [`FormObserver`](../../form-observer/README.md) when a form is connected (or reconnected) to the DOM and cleans up the observer when the form is disconnected from the DOM. This directive works with the `FormObserver` and all of its child classes (such as the [`FormStorageObserver`](../../form-storage-observer/README.md) and the `FormValidityObserver`).

**Example (`FormObserver`)**

```js
import { LitElement, html } from "lit";
import { FormObserver, automate } from "@form-observer/lit";

class MyForm extends LitElement {
  #observer = new FormObserver("input", (event) => `${event.target.name} was updated`);

  render() {
    html`
      <form ${automate(this.#observer)}>
        <input name="full-name" type="text" />
        <select name="choices">
          <option>1</option>
          <option>2</option>
          <option>3</option>
        </select>
      </form>
    `;
  }
}

customElements.define("my-form", MyForm);
```

**Example (`FormValidityObserver`)**

```js
import { LitElement, html } from "lit";
import { FormValidityObserver, automate } from "@form-observer/lit";

class MyForm extends LitElement {
  #observer = new FormValidityObserver("focusout");

  render() {
    html`
      <form ${automate(this.#observer)} .noValidate=${true}>
        <label for="full-name">Full Name</label>
        <input id="full-name" name="full-name" type="text" required aria-describedby="full-name-error" />
        <div id="full-name-error" role="alert"></div>

        <label for="cost">Cost</label>
        <input
          id="cost"
          name="cost"
          type="text"
          inputmode="numeric"
          pattern="\\d+"
          required
          aria-describedby="cost-error"
        />
        <div id="cost-error" role="alert"></div>
      </form>
    `;
  }
}

customElements.define("my-form", MyForm);
```

> Note: If you prefer, you can call `observe` and `unobserve`/`disconnect` manually instead.

## Function: `createFormValidityObserver(types, options)`

Creates a `FormValidityObserver` whose methods can be safely destructured. It accepts the exact same arguments as the [`FormValidityObserver`'s constructor](../README.md#constructor-formvalidityobservertypes-options). If you don't need to destructure any of the observer's methods, then you are free to use the `FormValidityObserver`'s constructor directly.

### Usage

The value returned by `createFormValidityObserver` can be used the same way that any other [`FormValidityObserver`](../README.md#api) would be used. For example, you could easiy configure a field's error messages like so:

```js
import { LitElement, html } from "lit";
import { createFormValidityObserver, automate } from "@form-observer/lit";

class MyForm extends LitElement {
  #observer = createFormValidityObserver("input");

  render() {
    const { configure } = this.#observer;

    html`
      <form ${automate(this.#observer)} .noValidate=${true}>
        <label for="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          aria-describedby="email-error"
          ${configure("email", { required: "Please prove that you are real" })}
        />
        <div id="email-error" role="alert"></div>
      </form>
    `;
  }
}

customElements.define("my-form", MyForm);
```

The benefit of this approach is that you'll be able to write your error message configurations alongside your markup, thus improving the maintainability of your app. The slight redundancy that you see above is due to [Lit's lack of support for dynamic attributes](https://github.com/lit/rfcs/issues/26)[^1]. If dynamic attributes are supported in the future, we will update our API to remove this redundancy.

[^1]: Lit _technically_ supports dynamic attributes via Custom Directives. However, since directives would be incompatible with SSR, we have foregone such a solution in the hopes that the Lit team will support dynamic attributes in the future.

## Using the `noValidate` Property for Accessible Error Messaging

If you want to display accessible error messages to your users whenever they try to submit an invalid form, you can use the `HTMLFormElement.noValidate` property. See [_Enabling Accessible Error Messages during Form Submissions_](../guides.md#enabling-accessible-error-messages-during-form-submissions) for more details.

## Gotchas

If you plan to use the `FormValidityObserver` with forms in the Shadow DOM, be sure to read our documentation about [how HTML forms and fields interact with the Shadow Boundary](../../form-observer/guides.md#be-mindful-of-the-shadow-boundary). This will help you avoid unexpected behaviors.
