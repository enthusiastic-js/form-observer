# Form Observer

A simple utility for reacting to events from a form's fields.

## Features and Benefits

- **Performant**: The `Form Observer` leverages [event delegation](https://gomakethings.com/why-is-javascript-event-delegation-better-than-attaching-events-to-each-element/) to minimize memory usage. Moreover, it easily integrates into _any_ JS framework _without_ requiring state -- giving your app a significant boost in speed.
- **No Dependencies**: The `Form Observer` packs _a lot_ of power into a _tiny_ bundle to give your users the best experience. The **entire `@form-observer/core` library** is only 3.2kb minified + gzipped.
- **Simple and Familiar API**: The `Form Observer` gives you a clear, easy-to-use API that has a similar feel to the standardized observers, such as the [`Mutation Observer`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) and the [`Intersection Observer`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver).
- **Framework Agnostic**: You can easily use this tool in a pure-JS application or in the JS framework of your choice. The simple API and great Developer Experience remain the same regardless of the tooling you use.
- [**Web Component Support**](https://developer.mozilla.org/en-US/docs/Web/API/Web_components): Because the `Form Observer` is written with pure JS, it works with Web Components out of the box.
- **Flexible**: Without requiring any additional setup, the `Form Observer` allows you to work with fields dynamically added to (or removed from) your forms, fields [externally associated](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#form) with your forms, and more.
- **Easily Extendable**: If you have a set of sophisticated form logic that you'd like to reuse, you can [extend](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends) the `Form Observer` to encapsulate all of your functionality. We provide a [local storage](https://github.com/enthusiastic-js/form-observer/tree/main/docs/form-storage-observer) solution and a [form validation](https://github.com/enthusiastic-js/form-observer/tree/main/docs/form-validity-observer) solution out of the box.

## Install

```
npm install @form-observer/core
```

## Quick Start

Here's an example of how to track the fields that a user has visited:

```html
<!-- HTML -->
<form id="example">
  <h1>Feedback Form</h1>
  <label for="full-name">Full Name</label>
  <input id="full-name" name="full-name" type="text" required />

  <label for="rating">Rating</label>
  <select id="rating" name="rating" required>
    <option value="" selected disabled>Please Choose a Rating</option>
    <option value="horrible">Horrible</option>
    <option value="okay">Okay</option>
    <option value="great">Great</option>
  </select>
</form>

<label for="comments">Additional Comments</label>
<textarea id="comments" name="comments" form="example"></textarea>

<button type="submit" form="example">Submit</button>
```

```js
/* JavaScript */
import { FormObserver } from "@form-observer/core";
// or import FormObserver from "@form-observer/core/FormObserver";

const form = document.querySelector("form");
const observer = new FormObserver("focusout", (event) => event.target.setAttribute("data-visited", String(true)));
observer.observe(form);
// Important: Remember to call `observer.disconnect` or `observer.unobserve` when observer is no longer being used.

form.addEventListener("submit", handleSubmit);

function handleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const visitedFields = Array.from(form.elements).filter((e) => e.hasAttribute("data-visited"));
  // Do something with visited fields...
}
```

Of course, you can use the `Form Observer` just as easily in JS Frameworks too

**Svelte**

```svelte
<form id="example" bind:this={form} on:submit={handleSubmit}>
  <!-- Internal Fields -->
</form>

<!-- External Fields -->

<script>
  import { onMount } from "svelte";
  import { FormObserver } from "@form-observer/core";
  // or import FormObserver from "@form-observer/core/FormObserver";

  let form;
  const observer = new FormObserver("focusout", (event) => event.target.setAttribute("data-visited", String(true)));
  onMount(() => {
    observer.observe(form);
    return () => observer.disconnect();
  });

  function handleSubmit(event) {
    event.preventDefault();
    const visitedFields = Array.from(event.currentTarget.elements).filter((e) => e.hasAttribute("data-visited"));
    // Do something with visited fields...
  }
</script>
```

**React**

```jsx
import { useEffect, useRef } from "react";
import { FormObserver } from "@form-observer/core";
// or import FormObserver from "@form-observer/core/FormObserver";

function MyForm() {
  // Watch Form Fields
  const form = useRef(null);
  useEffect(() => {
    const observer = new FormObserver("focusout", (event) => event.target.setAttribute("data-visited", String(true)));

    observer.observe(form.current);
    return () => observer.disconnect();
  }, []);

  // Submit Handler
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

Interested in learning more? Check out our [documentation](https://github.com/enthusiastic-js/form-observer/tree/main/docs). A great place to start would be our docs for the [`Form Observer` API](https://github.com/enthusiastic-js/form-observer/tree/main/docs/form-observer/README.md#api) or our [guides](https://github.com/enthusiastic-js/form-observer/tree/main/docs/form-observer/guides.md) for common use cases.

Too eager to bother with documentation? Feel free to play with our library in a [CodeSandbox](https://codesandbox.io/) or in your own application! All of our tools have detailed JSDocs, so you should be able to learn all that you need to get started from within your IDE.

## Solutions to Common Problems

Two common problems that developers need to solve for their complex web forms are:

1. Storing a user's form progress in `localStorage`
2. Validating a form's fields as a user interacts with them

Our library provides solutions for these problems out of the box.

### `localStorage` Solution

```js
/* JavaScript */
import { FormStorageObserver } from "@form-observer/core";
// or import FormStorageObserver from "@form-observer/core/FormStorageObserver";

const form = document.querySelector("form");
const observer = new FormStorageObserver("change");
observer.observe(form);
// Important: Remember to call `observer.disconnect` or `observer.unobserve` when observer is no longer being used.

form.addEventListener("submit", handleSubmit);

function handleSubmit(event) {
  event.preventDefault();
  FormStorageObserver.clear(form); // User no longer needs their progress saved after a form submission
}
```

Notice that the code required to get the `localStorage` feature up and running is almost exactly the same as the code that we showed in the [Quick Start](#quick-start). All that we did was switch to a feature-focused version of the `FormObserver`. We also setup an event handler to clear any obsolete `localStorage` data when the form is submitted.

There's even more that the `FormStorageObserver` can do. Check out our [`FormStorageObserver` documentation](https://github.com/enthusiastic-js/form-observer/tree/main/docs/form-storage-observer/README.md) for additional details.

### Form Validation Solution

```js
/* JavaScript */
import { FormValidityObserver } from "@form-observer/core";
// or import FormValidityObserver from "@form-observer/core/FormValidityObserver";

const form = document.querySelector("form");
form.noValidate = true;

const observer = new FormValidityObserver("focusout");
observer.observe(form);
// Important: Remember to call `observer.disconnect` or `observer.unobserve` when observer is no longer being used.

form.addEventListener("submit", handleSubmit);

function handleSubmit(event) {
  event.preventDefault();
  const success = observer.validateFields({ focus: true });

  if (success) {
    // Submit data to server
  }
}
```

Again, notice that the code required to get the form validation feature up and running is very similar to the code that we showed in the [Quick Start](#quick-start). The main thing that we did here was switch to a feature-focused version of the `FormObserver`. We also leveraged some of the validation-specific methods that exist uniquely on the `FormValidityObserver`.

If you want to use _accessible_ error messages instead of the browser's native error bubbles, you'll have to make some slight edits to your markup. _But these are the edits that you'd already be making to your markup anyway_ if you wanted to use accessible errors.

```html
<!-- HTML -->
<form id="example">
  <h1>Feedback Form</h1>
  <label for="full-name">Full Name</label>
  <input id="full-name" name="full-name" type="text" required aria-describedby="full-name-error" />
  <!-- Add accessible error container here -->
  <div id="full-name-error"></div>

  <label for="rating">Rating</label>
  <select id="rating" name="rating" required aria-describedby="rating-error">
    <option value="" selected disabled>Please Choose a Rating</option>
    <option value="horrible">Horrible</option>
    <option value="okay">Okay</option>
    <option value="great">Great</option>
  </select>
  <!-- And Here -->
  <div id="rating-error"></div>
</form>

<label for="comments">Additional Comments</label>
<textarea id="comments" name="comments" form="example"></textarea>

<button type="submit" form="example">Submit</button>
```

All that we had to do was add `aria-describedby` attributes that pointed to [accessible error message containers](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA21#example-2-identifying-errors-in-data-format) for our form fields.

There's _**much**, much more_ that the `FormValidityObserver` can do. Check out our [`FormValidityObserver` documentation](https://github.com/enthusiastic-js/form-observer/tree/main/docs/form-validity-observer/README.md) for additional details. If you're interested in a framework-specific version of the `FormValidityObserver`, see our documentation for [framework integrations](https://github.com/enthusiastic-js/form-observer/tree/main/docs/form-validity-observer/integrations).
