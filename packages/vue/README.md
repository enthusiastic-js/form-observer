# Form Observer: Vue Integration

A Vue-specific utility package that provides a more ergonomic developer experience for the complex classes in [`@form-observer/core`](https://www.npmjs.com/package/@form-observer/core). For convenience, this package also exposes all of the utilities in `@form-observer/core`.

What distinguishes `@form-observer/vue` from `@form-observer/core` is the enhanced developer experience that it provides for the `FormValidityObserver`. The core `FormValidityObserver` allows you to validate form fields as users interact with them, and to configure custom error messages for those fields. The `createFormValidityObserver` function provided by `@form-observer/vue` goes a step further by allowing you to configure the constraints for your fields as well.

## Features and Benefits

<!--
  Note: This section should have the benefits listed in `@form-observer/core`, but the details should be catered to Vue.
-->

- **Performant**: The `Form Observer` leverages [event delegation](https://gomakethings.com/why-is-javascript-event-delegation-better-than-attaching-events-to-each-element/) to minimize memory usage. Moreover, it avoids any of the overhead that could come from relying on state.
- **No External Dependencies**: The `Form Observer` packs _a lot_ of power into a _tiny_ bundle to give your users the best experience.
- **Simple and Familiar API**: The `Form Observer` gives you a clear, easy-to-use API that has a similar feel to the standardized observers, such as the [`Mutation Observer`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) and the [`Intersection Observer`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver).
- [**Web Component Support**](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
- **Flexible**: Without requiring any additional setup, the `Form Observer` allows you to work with fields dynamically added to (or removed from) your forms, fields [externally associated](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#form) with your forms, and more.
- **Easily Extendable**: If you have a set of sophisticated form logic that you'd like to reuse, you can [extend](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends) the `Form Observer` to encapsulate all of your functionality. We provide a [local storage](https://github.com/enthusiastic-js/form-observer/tree/main/docs/form-storage-observer) solution and a [form validation](https://github.com/enthusiastic-js/form-observer/blob/main/docs/form-validity-observer/integrations/vue.md) solution out of the box.

## Install

```
npm install @form-observer/vue
```

## Quick Start

```vue
<template>
  <form id="example" :ref="autoObserve()" @submit="handleSubmit">
    <h1>Feedback Form</h1>

    <!-- The browser's default error messages for `#name` will be accessibly displayed inside `#name-error` -->
    <label for="name">Full Name</label>
    <input id="name" name="name" type="text" required aria-describedby="name-error" />
    <div id="name-error"></div>

    <!-- Custom error messages for `#email` will be accessibly displayed inside `#email-error` -->
    <label for="email">Email</label>
    <input
      id="email"
      v-bind="
        configure('email', {
          type: { value: 'email', message: 'Email is invalid' },
          required: { value: true, message: 'You MUST allow us to stalk you!' },
        })
      "
      aria-describedby="email-error"
    />
    <div id="email-error"></div>

    <!-- A custom error message will be accessibly displayed for the `pattern` constraint. -->
    <!-- The browser's default error message will be accessibly displayed for the `required` constraint. -->
    <label for="donation">Donation</label>
    <input
      id="donation"
      v-bind="configure('donation', { pattern: { value: '\\d+', message: 'Please provide a valid number' } })"
      inputmode="numeric"
      required
      aria-describedby="donation-error"
    />
    <div id="donation-error"></div>
  </form>

  <label for="comments">Comments</label>
  <textarea id="comments" name="comments" form="example" minlength="30" aria-describedby="comments-error"></textarea>
  <div id="comments-error"></div>

  <button type="submit" form="example">Submit</button>
</template>

<script setup>
import { createFormValidityObserver } from "@form-observer/vue";
const { autoObserve, configure, validateFields } = createFormValidityObserver("focusout");

function handleSubmit(event) {
  event.preventDefault();
  const success = validateFields({ focus: true });

  if (success) {
    // Submit data to server
  }
}
</script>
```

For more details on what `createFormValidityObserver` can do (like custom validation, manual error handling, and more), see our [documentation](https://github.com/enthusiastic-js/form-observer/blob/main/docs/form-validity-observer/integrations/vue.md).

## Other Uses

In addition to providing an enhanced version of the `FormValidityObserver`, `@form-observer/vue` exposes all of the utilities found in `@form-observer/core`. You can learn more about these tools from our [core documentation](https://github.com/enthusiastic-js/form-observer/tree/main/docs).

### `FormObserver`

```vue
<template>
  <form id="example" ref="form" @submit="handleSubmit">
    <!-- Internal Fields -->
  </form>
</template>

<!-- External Fields -->

<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { FormObserver } from "@form-observer/vue";

const form = ref(null);
const observer = new FormObserver("focusout", (event) => event.target.setAttribute("data-visited", String(true)));

onMounted(() => observer.observe(form.value));
onUnmounted(() => observer.disconnect());

function handleSubmit(event) {
  event.preventDefault();
  const visitedFields = Array.from(event.currentTarget.elements).filter((e) => e.hasAttribute("data-visited"));
  // Do something with visited fields...
}
</script>
```

### `FormStorageObserver`

```vue
<template>
  <form id="example" ref="form" @submit="handleSubmit">
    <!-- Internal Fields -->
  </form>
</template>

<!-- External Fields -->

<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { FormStorageObserver } from "@form-observer/vue";

const form = ref(null);
const observer = new FormStorageObserver("change");

onMounted(() => observer.observe(form.value));
onUnmounted(() => observer.disconnect());

function handleSubmit(event) {
  event.preventDefault();
  FormStorageObserver.clear(event.currentTarget); // User no longer needs their progress saved after a form submission
}
</script>
```
