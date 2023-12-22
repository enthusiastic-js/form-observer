# Form Observer: Lit Integration

A Lit-specific utility package that provides a more ergonomic developer experience for the complex classes in [`@form-observer/core`](https://www.npmjs.com/package/@form-observer/core). For convenience, this package also exposes all of the utilities in `@form-observer/core`.

> Note: Due to some of Lit's unique behaviors, the API exposed by `@form-observer/lit` is slightly different from the API exposed by the other integration packages.

## Features and Benefits

<!--
  Note: This section should have the benefits listed in `@form-observer/core`, but the details should be catered to Lit.
-->

- **Performant**: The `Form Observer` leverages [event delegation](https://gomakethings.com/why-is-javascript-event-delegation-better-than-attaching-events-to-each-element/) to minimize memory usage. Moreover, it avoids any of the overhead that could come from relying on state management tools.
- **No External Dependencies**: The `Form Observer` packs _a lot_ of power into a _tiny_ bundle to give your users the best experience.
- **Simple and Familiar API**: The `Form Observer` gives you a clear, easy-to-use API that has a similar feel to the standardized observers, such as the [`Mutation Observer`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) and the [`Intersection Observer`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver).
- [**Web Component Support**](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
- **Flexible**: Without requiring any additional setup, the `Form Observer` allows you to work with fields dynamically added to (or removed from) your forms, fields [externally associated](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#form) with your forms, and more.
- **Easily Extendable**: If you have a set of sophisticated form logic that you'd like to reuse, you can [extend](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends) the `Form Observer` to encapsulate all of your functionality. We provide a [local storage](https://github.com/enthusiastic-js/form-observer/tree/main/docs/form-storage-observer) solution and a [form validation](https://github.com/enthusiastic-js/form-observer/blob/main/docs/form-validity-observer/integrations/lit.md) solution out of the box.

## Install

```
npm install @form-observer/lit
```

## Quick Start

```js
import { LitElement, html } from "lit";
import { createFormValidityObserver, automate } from "@form-observer/lit";

class MyForm extends LitElement {
  #observer = createFormValidityObserver("focusout");

  #handleSubmit(event) {
    event.preventDefault();
    const success = validateFields({ focus: true });

    if (success) {
      // Submit data to server
    }
  }

  render() {
    const { configure } = this.#observer;

    return html`
      <form ${automate(this.#observer)} id="example" @submit="${this.#handleSubmit}">
        <h1>Feedback Form</h1>

        <!-- The browser's default error messages for "#name" will be accessibly displayed inside "#name-error" -->
        <label for="name">Full Name</label>
        <input id="name" name="name" type="text" required aria-describedby="name-error" />
        <div id="name-error" role="alert"></div>

        <!-- Custom error messages for "#email" will be accessibly displayed inside "#email-error" -->
        <label for="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          aria-describedby="email-error"
          ${configure("email", { type: "Email is invalid", required: "You MUST allow us to stalk you!" })}
        />
        <div id="email-error" role="alert"></div>

        <!-- A custom error message will be accessibly displayed for the "pattern" constraint. -->
        <!-- The browser's default error message will be accessibly displayed for the "required" constraint. -->
        <label for="donation">Donation</label>
        <input
          id="donation"
          name="donation"
          pattern="\\d+"
          inputmode="numeric"
          required
          aria-describedby="donation-error"
          ${configure("donation", { pattern: "Please provide a valid number" })}
        />
        <div id="donation-error" role="alert"></div>
      </form>

      <label for="comments">Comments</label>
      <textarea
        id="comments"
        name="comments"
        form="example"
        minlength="30"
        aria-describedby="comments-error"
      ></textarea>
      <div id="comments-error"></div>

      <button type="submit" form="example">Submit</button>
    `;
  }
}

customElements.define("my-form", MyForm);
```

For more details on what `createFormValidityObserver` can do (like custom validation, manual error handling, and more), see our [documentation](https://github.com/enthusiastic-js/form-observer/blob/main/docs/form-validity-observer/integrations/lit.md).

## Other Uses

In addition to providing a convenient version of the `FormValidityObserver`, `@form-observer/lit` exposes all of the utilities found in `@form-observer/core`. You can learn more about these tools from our [core documentation](https://github.com/enthusiastic-js/form-observer/tree/main/docs).

### `FormObserver`

```js
import { LitElement, html } from "lit";
import { FormObserver, automate } from "@form-observer/lit";

class MyForm extends LitElement {
  #observer = new FormObserver("focusout", (event) => event.target.setAttribute("data-visited", String(true)));

  #handleSubmit(event) {
    event.preventDefault();
    const visitedFields = Array.from(event.currentTarget.elements).filter((e) => e.hasAttribute("data-visited"));
    // Do something with visited fields...
  }

  render() {
    return html`
      <form ${automate(this.#observer)} id="example" @submit="${this.#handleSubmit}">
        <!-- Internal Fields -->
      </form>

      <!-- External Fields -->
    `;
  }
}

customElements.define("my-form", MyForm);
```

### `FormStorageObserver`

```js
import { LitElement, html } from "lit";
import { FormStorageObserver, automate } from "@form-observer/lit";

class MyForm extends LitElement {
  #observer = new FormStorageObserver("change");

  #handleSubmit(event) {
    event.preventDefault();
    FormStorageObserver.clear(event.currentTarget); // User no longer needs their progress saved after a form submission
  }

  render() {
    html`
      <form ${automate(this.#observer)} id="example" @submit="${this.#handleSubmit}">
        <!-- Internal Fields -->
      </form>

      <!-- External Fields -->
    `;
  }
}

customElements.define("my-form", MyForm);
```

## Gotchas

If you plan to use the `FormValidityObserver` with forms in the Shadow DOM, be sure to read our documentation about [how HTML forms and fields interact with the Shadow Boundary](https://github.com/enthusiastic-js/form-observer/blob/main/docs/form-observer/guides.md#be-mindful-of-the-shadow-boundary). This will help you avoid unexpected behaviors.
