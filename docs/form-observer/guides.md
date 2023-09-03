# Form Observer Guides

Here you'll fine helpful tips on how to use the `FormObserver` effectively in various situations. We hope that you find these guides useful! Here are the currently discussed topics:

- [Usage with JavaScript Frameworks](#usage-with-javascript-frameworks)
- [Usage with Web Components](#usage-with-web-components)
- [Extending the `FormObserver` with Specialized Logic](#extending-the-formobserver-with-specialized-logic)

## Usage with JavaScript Frameworks

Just like the [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) and the [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver), the `FormObserver` can be setup easily in any JS framework without a framework-specific wrapper/helper. You can setup the `FormObserver` in the same way that you would setup "any other observer". Here are some examples:

### [Svelte](https://svelte.dev/)

```svelte
<form bind:this={form}>
  <!-- Other Form Controls -->
</form>

<script>
import { onMount } from "svelte";
import { FormObserver } from "@form-observer/core";

let form;
onMount(() => {
  const observer = new FormObserver("focusout", (e) => console.log(`Field ${e.target.name} was \`blur\`red`));
  observer.observe(form);

  return () => observer.disconnect();
});
</script>
```

### [React](https://react.dev/) (with TypeScript)

#### Using Functional Components

```tsx
import { useEffect, useRef } from "react";
import { FormObserver } from "@form-observer/core";

export default function MyComponent() {
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const observer = new FormObserver("focusout", (e) => console.log(`Field ${e.target.name} was \`blur\`red`));
    observer.observe(form.current as HTMLFormElement);

    return () => observer.disconnect();
  });

  return <form ref={form}>{/* Other Form Controls */}</form>;
}
```

#### Using Class Components

```tsx
import { Component, createRef } from "react";
import { FormObserver } from "@form-observer/core";

export default class MyComponent extends Component {
  #form = createRef<HTMLFormElement>();
  #observer = new FormObserver("focusout", (e) => console.log(`Field ${e.target.name} was \`blur\`red`));

  componentDidMount() {
    this.#observer.observe(this.#form.current as HTMLFormElement);
  }

  componentWillUnmount() {
    this.#observer.disconnect();
  }

  render() {
    return <form ref={this.#form}>{/* Other Form Controls */}</form>;
  }
}
```

### [Vue](https://vuejs.org/)

#### Using `<script setup>` Shorthand

```vue
<template>
  <form ref="form">
    <!-- Other Form Controls -->
  </form>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { FormObserver } from "@form-observer/core";

const form = ref(null);
const observer = new FormObserver("focusout", (e) => console.log(`Field ${e.target.name} was \`blur\`red`));
onMounted(() => observer.observe(form.value));
onUnmounted(() => observer.disconnect());
</script>
```

#### Using Regular `<script>` Tag

```vue
<template>
  <form ref="form">
    <!-- Other Form Controls -->
  </form>
</template>

<script>
import { defineComponent, ref, onMounted, onUnmounted } from "vue";
import { FormObserver } from "@form-observer/core";

export default defineComponent({
  setup() {
    const form = ref(null);
    const observer = new FormObserver("focusout", (e) => console.log(`Field ${e.target.name} was \`blur\`red`));
    onMounted(() => observer.observe(form.value));
    onUnmounted(() => observer.disconnect());

    return { form };
  },
});
</script>
```

### [Solid](https://www.solidjs.com/)

```tsx
import { createEffect } from "solid-js";
import { FormObserver } from "@form-observer/core";

export default function MyComponent() {
  let form;

  // Note: If you like, you may use `onMount` and `onCleanup` instead.
  createEffect(() => {
    const observer = new FormObserver("focusout", (e) => console.log(`Field ${e.target.name} was \`blur\`red`));
    observer.observe(form);

    return () => observer.disconnect();
  });

  return <form ref={form}>{/* Other Form Controls */}</form>;
}
```

### Where's My JavaScript Framework?

As you know, JS frameworks are always being created at an incredibly rapid pace; so we can't provide an example for _every_ framework that's out there. However, the process for getting the `FormObserver` working in your preferred framework is pretty straightforward:

1. Obtain a reference to the `HTMLFormElement` that you want to observe.
2. Call `FormObserver.observe(form)` when the reference to your form element becomes available (typically during the component's "mounting phase").
3. When your component unmounts, call `FormObserver.disconnect()` (or `FormObserver.unobserve(form)`) to cleanup the listeners that are no longer being used.

This is the approach being taken in the examples above. These steps and the code examples above should give you everything you need to get started.

## Usage with Web Components

Because the `FormObserver` builds on top of native JS features instead of relying on a JS framework (like React), it is _completely_ compatible with native [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components). However, there are some things to keep in mind when attempting to use them.

### Your Web Component Must Be a Valid Form Control

The `FormObserver` (and all of its subclasses) will only observe elements that are actually recognized as form controls. If you're using regular HTML elements, this basically includes any elements that are supported by the [`HTMLFormElement.elements`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements) property by default. If you're using Custom Elements, this _also_ includes any elements that are _specifically identified as form controls_.

To identify a Custom Element as a form control, you will need to give its `class` a static `formAssociated` property with a value of `true`. If you also want the element to participate in form submissions, you will need to use [`HTMLElement.attachInternals()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/attachInternals) in conjunction with the [`ElementInternals.setFormValue()`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/setFormValue) method. We have an example of a simple setup below. For more information on how to create complex form controls with Web Components, see [_More Capable Form Controls_](https://web.dev/more-capable-form-controls/) by Arthur Evans.

```js
class CustomField extends HTMLElement {
  static formAssociated = true;
  #internals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    // Any other setup ...
  }
}

customElements.define("custom-field", CustomField);
```

This is the code that would be required to allow your Custom Element to participate in HTML forms in general. So the `FormObserver` isn't requiring any additional work on your part.

Note: You are free to make the `ElementInternals` public, but it is highly recommended to keep this property [private](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields). (It is completely safe to expose the _properties_ of the `ElementInternals` interface. Only the reference to the `ElementInternals` object itself needs to be kept private.)

### Be Mindful of the Shadow Boundary

The [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) is a very useful tool for encapsulating the details of a Web Component. However, this tool is not very practical when it comes to HTML forms. Remember, the _purpose_ of the Shadow DOM is to _prevent_ anything on the outside from accessing a Web Component's internal elements; and the "internal elements" include any fields in the Shadow DOM. This means that a `form` in the Light DOM _cannot_ see fields in the Shadow DOM. Similarly, a `form` in the Shadow DOM _cannot_ see fields in the Light DOM _even if the fields are [slotted](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots)_. Consider the following code:

```html
<form id="light-form">
  <input name="input-light-dom" />
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

In this example, the `input-shadow-dom` field is _completely invisible_ to the `light-form` form element. This field is invisible to the form despite the fact that the field's `form` attribute points to the `light-form` element. The `light-form` form element cannot see the `input-shadow-dom` field because the Shadow DOM prevents the form in the Light DOM from accessing the field in the Shadow DOM. Thus, the form in the Light DOM can only see the `input-light-dom` field and the `submit` button.

Similarly, _both_ the `blocked` input _and_ the `slotted` textarea are _completely invisible_ to the `shadow-form` form element even though both of the fields have `form` attributes that point to the form element. Because the input and even the _slotted_ textarea are defined in the Light DOM, the form element in the Shadow DOM refuses to welcome those elements entirely. Thus, the form in the Shadow DOM can only see the `internal` input.

In the above example, the `input-shadow-dom` field, the `blocked` field, and the `slotted` field _don't partake in any HTML forms at all_. This means that these fields don't partake in form submission, nor any of the other form-related features that fields can usually take advantage of. Theoretically, someone could try to bypass these restrictions, but all such efforts would complicate things unnecessarily. Consequently, in order to keep your code clean, functional, and reliable, you should either put your _entire_ form in the Light DOM _or_ in the Shadow DOM. You should never try to mix your form's fields between the Light DOM and the Shadow DOM, nor should you try to mix your form's fields between _separate_ Shadow DOM instances.

How does this relate to the `FormObserver`? Well, naturally a `FormObserver` can only observe fields that are visible to the watched form. Because a field in the Shadow DOM would be invisible to a form in the Light DOM, it would also be invisible to a `FormObserver` which observes the form in the Light DOM. Again, for everything to function correctly, you should either put the _entire_ form -- including its fields -- in the Light DOM, or put the _entire_ form in the Shadow DOM. Then and only then will both the native JS form features _and_ the `FormObserver` work as desired.

This is not a limitation of the `FormObserver`, nor is it a limitation of the Shadow DOM. It is an intentional design decision to make sure that the Shadow DOM truly is not disrupted by anything from the outside. In other words, the `FormObserver` is simply complying with what the current web standards require. The Shadow DOM does not have to be used in every situation where a Custom Element is used. In fact, it is recommended to avoid the Shadow DOM when it comes to Custom Elements that function as form controls.

## Extending the `FormObserver` with Specialized Logic

There are times when you may want to run specific, sophisticated logic for a form that you're observing. For instance, you might want to store data in `localStorage` and/or validate a form's fields whenever a user interacts with your form. Our library already provides [`localStorage`](../form-storage-observer/README.md) and [form validation](../form-validity-observer/) solutions for you. However, if you have another complex problem that you want to solve, or if you'd like to take an approach different from the one that we've chosen for our built-in solutions, then [extending](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends) the `FormObserver` can help you to accomplish your goal.

```js
class MyCustomObserver extends FormObserver {
  constructor(types) {
    const mySpecificListener = (event) => {
      /* Sophisticated Listener Logic */
    };

    super(types, mySpecificListener);

    /* Setup private fields belonging to `MyCustomObserver` */
  }

  /* Define any helpful methods */
}
```

If you're interested in creating your own extension of the `FormObserver` but don't know where to start, we recommend looking at the [implementation](https://github.com/enthusiastic-js/form-observer/blob/main/src/FormStorageObserver.ts) of the `FormStorageObserver` for an intermediate-level example of extending the base `FormObserver`'s functionality. It's only ~215 lines of code -- with about 30% of the code being TypeScript Types and JS Docs.

Of course, using the `extends` clause isn't the only way to create reusable logic related to the `FormObserver`. For instance, you can also encapsulate whatever reusable logic you want within a regular function that closes over an instance of the `FormObserver`.

### Should I Create a Framework Wrapper for My Enhanced Observer?

The [`FormValidityObserver`](../form-validity-observer/README.md) has framework-specific wrappers for the sake of convenience -- though using the wrappers is not required. However, the `FormObserver` and the [`FormStorageObserver`](../form-storage-observer/README.md) don't provide any framework-specific wrappers at all. So how do you know when you should create a framework wrapper for your extension of the `FormObserver`?

Here's our general recommendation: If your extension of the `FormObserver` exposes no other _instance methods_ besides `observe()`, `unobserve()`, and `disconnect()` (as is the case for the `FormObserver` and the `FormStorageObserver`), you should probably just use your utility directly. Don't bother with framework wrappers like actions (Svelte), custom hooks (React), or the like in that situation. If your extension of the `FormObserver` _does_ expose unique instance methods (as is the case for the `FormValidityObserver`), then you can start to consider whether or not a framework wrapper could be helpful. But even then, you still may not need a wrapper at all.
