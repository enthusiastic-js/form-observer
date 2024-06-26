# Form Observer: React Integration

A React-specific utility package that provides a more ergonomic developer experience for the complex classes in [`@form-observer/core`](https://www.npmjs.com/package/@form-observer/core). For convenience, this package also exposes all of the utilities in `@form-observer/core`.

What distinguishes `@form-observer/react` from `@form-observer/core` is the enhanced developer experience that it provides for the `FormValidityObserver`. The core `FormValidityObserver` allows you to validate form fields as users interact with them, and to configure custom error messages for those fields. The `createFormValidityObserver` function provided by `@form-observer/react` goes a step further by allowing you to configure the constraints for your fields as well.

## Features and Benefits

<!--
  Note: This section should have the benefits listed in `@form-observer/core`, but the details should be catered to React.
-->

- **Performant**: The `Form Observer` leverages [event delegation](https://gomakethings.com/why-is-javascript-event-delegation-better-than-attaching-events-to-each-element/) to minimize memory usage. Moreover, it easily integrates into React _without_ requiring state -- giving your app a _significant_ boost in speed.
- **No External Dependencies**: The `Form Observer` packs _a lot_ of power into a _tiny_ bundle to give your users the best experience.
- **Simple and Familiar API**: The `Form Observer` gives you a clear, easy-to-use API that has a similar feel to the standardized observers, such as the [`Mutation Observer`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) and the [`Intersection Observer`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver).
- [**Web Component Support**](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
- **Flexible**: Without requiring any additional setup, the `Form Observer` allows you to work with fields dynamically added to (or removed from) your forms, fields [externally associated](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#form) with your forms, and more.
- **Easily Extendable**: If you have a set of sophisticated form logic that you'd like to reuse, you can [extend](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends) the `Form Observer` to encapsulate all of your functionality. We provide a [local storage](https://github.com/enthusiastic-js/form-observer/tree/main/docs/form-storage-observer) solution and a [form validation](https://github.com/enthusiastic-js/form-observer/blob/main/docs/form-validity-observer/integrations/react.md) solution out of the box.

## Install

```
npm install @form-observer/react
```

## Quick Start

Here's an example of how to automatically validate your form fields when a user interacts with them.

```jsx
import { useMemo } from "react";
import { createFormValidityObserver } from "@form-observer/react";

function MyForm() {
  const { autoObserve, configure, validateFields } = useMemo(() => createFormValidityObserver("focusout"), []);

  function handleSubmit(event) {
    event.preventDefault();
    const success = validateFields({ focus: true });

    if (success) {
      // Submit data to server
    }
  }

  return (
    // If your component does not re-render, you don't need to memoize `autoObserve`'s return value. (See Docs)
    <>
      <form id="example" ref={useMemo(autoObserve, [autoObserve])} onSubmit={handleSubmit}>
        <h1>Feedback Form</h1>

        {/* The browser's default error messages for `#name` will be accessibly displayed inside `#name-error` */}
        <label htmlFor="name">Full Name</label>
        <input id="name" name="name" type="text" required aria-describedby="name-error" />
        <div id="name-error" />

        {/* Custom error messages for `#email` will be accessibly displayed inside `#email-error` */}
        <label htmlFor="email">Email</label>
        <input
          id="email"
          {...configure("email", {
            type: { value: "email", message: "Email is invalid" },
            required: { value: true, message: "You MUST allow us to stalk you!" },
          })}
          aria-describedby="email-error"
        />
        <div id="email-error" />

        {/* A custom error message will be accessibly displayed for the `pattern` constraint. */}
        {/* The browser's default error message will be accessibly displayed for the `required` constraint. */}
        <label htmlFor="donation">Donation</label>
        <input
          id="donation"
          {...configure("donation", { pattern: { value: "\\d+", message: "Please provide a valid number" } })}
          inputMode="numeric"
          required
          aria-describedby="donation-error"
        />
        <div id="donation-error" />
      </form>

      <label htmlFor="comments">Comments</label>
      <textarea id="comments" name="comments" form="example" minLength={30} aria-describedby="comments-error" />
      <div id="comments-error" />

      <button type="submit" form="example">
        Submit
      </button>
    </>
  );
}
```

### Usage with Class Components

```jsx
import { Component } from "react";
import { createFormValidityObserver } from "@form-observer/react";

class MyForm extends Component {
  /** @readonly */ #observer = createFormValidityObserver("focusout");
  /** @readonly */ #formRef = this.#observer.autoObserve();

  #handleSubmit = (event) => {
    event.preventDefault();
    const success = this.#observer.validateFields({ focus: true });

    if (success) {
      // Submit data to server
    }
  };

  render() {
    const { configure, validateFields } = this.#observer;

    return (
      // If your component does not re-render:
      // You can destructure `autoObserve` and do `<form ref={autoObserve()}>` directly. (See Docs)
      <>
        <form id="example" ref={this.#formRef} onSubmit={this.#handleSubmit}>
          {/* Internal Fields */}
        </form>

        {/* External Fields */}
      </>
    );
  }
}
```

For more details on what `createFormValidityObserver` can do (like custom validation, manual error handling, and more), see our [documentation](https://github.com/enthusiastic-js/form-observer/blob/main/docs/form-validity-observer/integrations/react.md).

## Other Uses

In addition to providing an enhanced version of the `FormValidityObserver`, `@form-observer/react` exposes all of the utilities found in `@form-observer/core`. You can learn more about these tools from our [core documentation](https://github.com/enthusiastic-js/form-observer/tree/main/docs).

### `FormObserver`

```jsx
import { useEffect, useRef } from "react";
import { FormObserver } from "@form-observer/react";

function MyForm() {
  const form = useRef(null);
  useEffect(() => {
    const observer = new FormObserver("focusout", (event) => event.target.setAttribute("data-visited", String(true)));

    observer.observe(form.current);
    return () => observer.disconnect();
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    const visitedFields = Array.from(event.currentTarget.elements).filter((e) => e.hasAttribute("data-visited"));
    // Do something with visited fields...
  }

  return (
    <>
      <form id="example" ref={form} onSubmit={handleSubmit}>
        {/* Internal Fields */}
      </form>

      {/* External Fields */}
    </>
  );
}
```

### `FormStorageObserver`

```jsx
import { useEffect, useRef } from "react";
import { FormStorageObserver } from "@form-observer/react";

function MyForm() {
  const form = useRef(null);
  useEffect(() => {
    const observer = new FormStorageObserver("change");

    observer.observe(form.current);
    return () => observer.disconnect();
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    FormStorageObserver.clear(event.currentTarget); // User no longer needs their progress saved after a form submission
  }

  return (
    <>
      <form id="example" ref={form} onSubmit={handleSubmit}>
        {/* Internal Fields */}
      </form>

      {/* External Fields */}
    </>
  );
}
```
