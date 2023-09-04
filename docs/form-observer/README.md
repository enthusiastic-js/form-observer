# Form Observer

The `Form Observer`, is a simple, lightweight, performant tool that enables you to run sophisticated logic whenever users interact with your forms. For example, you may want to store a user's progress in `localStorage` whenever they update a field, or you might want to validate a field that a user has finished editing. The `Form Observer` enables you to do this with ease by registering event listener(s) that will run whenever the event(s) you specify are emitted from your form's fields.

**Example**

```html
<textarea name="external-textbox" form="my-form"></textarea>

<form id="my-form">
  <input name="textbox" type="text" />

  <select name="combobox">
    <option>1</option>
    <option>2</option>
    <option>3</option>
  </select>
</form>
```

```js
import { FormObserver } from "@form-observer/core";
// or import FormObserver from "@form-observer/core/FormObserver";

// Log a field's value whenever it changes
const observer = new FormObserver("input", (event) => {
  const field = event.target;
  console.log(`Field ${field.name} had its value changed to ${field.value}`);
});

const form = document.getElementById("my-form");
observer.observe(form);
```

## Features and Benefits

- **Framework Agnostic**: You can easily use this tool in a pure-JS application or in the JS Framework of your choice.
- [**Web Component Support**](https://developer.mozilla.org/en-US/docs/Web/API/Web_components): Because the `Form Observer` is written with pure JS, it works with Web Components out of the box.
- **No Dependencies**: The `Form Observer` packs _a lot_ of power into a _tiny_ bundle to give your users the best experience.
- **Performant**: The `Form Observer` leverages [event delegation](https://gomakethings.com/why-is-javascript-event-delegation-better-than-attaching-events-to-each-element/) to minimize memory usage, and it easily integrates into any JS framework _without_ requiring state -- giving your app a significant boost in speed.
- **Flexible**: Without requiring any additional setup, the `Form Observer` allows you to work with fields dynamically inserted into (or removed from) your forms, fields [externally associated](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#form) with your forms, and more.
- **Extendable**: If you have a set of sophisticated form logic that you'd like to reuse, you can [extend](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/extends) the `Form Observer` to encapsulate all of your functionality. We provide a [local storage](../form-storage-observer/README.md) solution and a [form validation](../form-validity-observer/README.md) solution out of the box.

And here's one more add-on that's a little unusual: `Clear, Modifiable Code`. (We know, it's a bold statement.) See, we don't just have an interest in your app's performance and your developer experience; we also have an interest in your growth as a developer. Interested in learning more about event handling, advanced form usage, or the internals of the `Form Observer`? Well, we've worked hard to make the code (and its documentation) clear and concise so that you can read everything yourself and come up with your own ideas! The `Form Observer` is only ~215 lines of code! And about 40% of that is just TypeScript Types and JSDocs. 🤯

## API

The `FormObserver` tries to make itself as approachable as possible by mimicking the API of other standardized observers -- such as the [`Mutation Observer`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) and the [`Intersection Observer`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver). All you have to do is provide the `FormObserver` with the event listeners that you want to use for your form fields. Then, call `FormObserver.observe()` (or `FormObserver.unobserve()`) with the form(s) that you want to start (or stop) watching.

You might be helped by thinking of the `FormObserver` as a fancy tool for creating form-related event listeners, as that's really all it is. Working with this model is helpful when you want to do more complex tasks like [`localStorage` management](../form-storage-observer/README.md) and [form field validation](../form-validity-observer/README.md).

### Constructor: `FormObserver(types, listeners, options)`

The `FormObserver()` constructor creates a new observer and configures it with the event listeners that you pass in. These listeners are used for every `HTMLFormElement` that the instance observes. There are 3 ways to construct a `FormObserver`.

#### 1&rpar; With a _Single_ `listener` Responding to a _Single_ Event `type`

For the `types` argument, you may pass a single string representing the type of event that you want to listen for. The string can be one of the [commonly recognized](https://developer.mozilla.org/en-US/docs/Web/Events) event types, or it can be a custom event type of your own.

When passing a string as the `types` argument for the `FormObserver` constructor, you _must_ provide a single event `listener` that will be called whenever a field belonging to an observed form emits an event of the specified `type`. _Optionally_, you may also specify the [event listener `options`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#parameters) that should be used to configure the `listener`.

**Example**

```ts
const observer1 = new FormObserver("input", (event) => console.log(`Input Data: ${event.data}`));
const observer2 = new FormObserver(
  "focus",
  (e) => console.log(`Element ${e.target.tagName} stole the show from ${e.relatedTarget?.tagName ?? "no one"}!`),
  true
);

const form = document.getElementById("my-form");
observer1.observe(form);
observer2.observe(form);

form.elements[0].dispatchEvent(new InputEvent("input")); // Triggers `listener` for `observer1`
form.elements[1].focus(); // Triggers `listener` for `observer2`
```

#### 2&rpar; With a _Single_ `listener` Responding to _Multiple_ Event `types`

For the `types` argument, you may also pass an array of strings representing the different types of events that you want to listen for. As with before, each string in the array may be a commonly recognized event type or a custom event type of your own.

When `types` is an array, you are still allowed to pass a single event `listener` to the constructor. If you do, the `listener` will be called whenever a field belonging to an observed form emits an event matching _any_ of the specified `types`. _Optionally_, you may provide the event listener `options` that should be used to configure the `listener`.

**Example**

```ts
// Remember: `options` are optional
const listener = (e) => console.log(`Event of type ${e.type} occurred on ${e.target.tagName}`);
const observer = new FormObserver(["input", "focusin"], listener, { capture: false, passive: true });

const form = document.getElementById("my-form");
observer.observe(form);

form.elements[0].dispatchEvent(new InputEvent("input")); // Triggers `listener`
form.elements[1].focus(); // Triggers `listener`
```

#### 3&rpar; With _Multiple_ `listeners` Responding to _Multiple_ Event `types`

When `types` is an array, you are also allowed to pass an array of event `listeners` to the constructor. If you do, each item in the `listeners` array will be associated with its corresponding event type in the `types` array. (See the example below for clarity.)

The event listener `options` argument is still optional when using this overload. However, if you specify the `options` argument, it must be an _array_ of event listener options, where each item in the array corresponds to a listener in the `listeners` array. (See the example below for clarity.)

**Example**

```ts
// Remember: `options` are optional
const observer = new FormObserver(
  ["input", "focus"],
  [
    (inputEvent) => console.log("A user provided input to one of your form controls"),
    (focusEvent) => console.log("A user has their eye on one of your form controls <_<"),
  ],
  [undefined, { capture: true }]
);

const form = document.getElementById("my-form");
observer.observe(form);

form.elements[0].dispatchEvent(new InputEvent("input")); // Triggers _only_ the `input` listener
form.elements[1].focus(); // Triggers _only_ the `focus` listener
```

Note: If you're using [TypeScript](https://www.typescriptlang.org/), your IntelliSense and Type Guarding will be _much_ better if you use a [`const` assertion](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions) on the `types` array that you pass to the constructor. (No other constructor arguments need a `const` assertion.)

### Method: `FormObserver.observe(form: HTMLFormElement): boolean`

Instructs the observer to listen for events emitted from the provided `form`'s fields. The observer will only listen for the types of events that were specified during its construction, and it will make sure to call the correct listener(s) when those events are emitted. This method only accepts `<form>` elements; all other arguments will be rejected.

Note: The `FormObserver` reuses the same listeners for all of the forms that you observe; so you can observe multiple forms simultaneously without worrying about memory usage.

If the provided form element was not being watched before `observe()` was called, the method will run any necessary setup logic and return `true`. Otherwise, the method does nothing and returns `false`. The return value is primarily intended to help extensions of the `FormObserver` class know when a form is already being observed.

**Example**

```ts
const listener = (event) => console.log(`${event.target.name} was \`click\`ed!`);
const observer = new FormObserver("click", listener);

const form1 = document.getElementById("form-1");
const field1 = form1.elements[0];
field1.click(); // Does nothing, the form was not observed yet

const form2 = document.getElementById("form-2");
const field2 = form2.elements[0];
field2.dispatchEvent(new MouseEvent("click")); // Does nothing, the form was not observed yet

observer.observe(form1); // Returns `true`
observer.observe(form1); // Returns `false`, does nothing
field1.click(); // Triggers the `listener` function

observer.observe(form2); // Returns `true`
field2.dispatchEvent(new MouseEvent("click")); // Triggers the `listener` function
```

### Method: `FormObserver.unobserve(form: HTMLFormElement): boolean`

Stops the observer from listening for any events emitted from the provided `form`'s fields. This method only accepts `<form>` elements; all other arguments will be rejected.

If the provided form element was being watched before `unobserve()` was called, the method will run any necessary teardown logic and return `true`. Otherwise, the method does nothing and returns `false`. The return value is primarily intended to help extensions of the `FormObserver` class know when a form has not yet been observed.

Note: The event listeners that were registered by calling [`FormObserver.observe()`](#method-formobserverobserveform-htmlformelement-boolean) won't be unregistered until the observer is no longer watching any form elements.

```ts
const listener = (event) => console.log(`${event.target.name} was \`click\`ed!`);
const observer = new FormObserver("click", listener);
const form = document.getElementById("my-form");
const field = form.elements[0];

observer.unobserve(form); // Returns `false`, does nothing

observer.observe(form);
field.click(); // Triggers the `listener` function

observer.unobserve(form); // Returns `true`
field.click(); // Does nothing, the form is no longer being observed
```

### Method: `FormObserver.disconnect(): void`

Stops the observer from listening for any events emitted from **all** form fields. This is effectively the same as calling [`FormObserver.unobserve()`](#method-formobserverunobserveform-htmlformelement-boolean) on all form elements that the observer was previously watching. The benefit of using `disconnect()` is that it provides a quick and easy way to stop watching all forms in your application without requiring you to provide references to those forms.

```ts
const listener = (event) => console.log(`${event.target.name} was \`click\`ed!`);
const observer = new FormObserver("click", listener);
const form1 = document.getElementById("form-1");
const form2 = document.getElementById("form-2");

observer.observe(form1);
observer.observe(form2);
observer.disconnect(); // `unobserve`s ALL forms

// Both calls return `false` because the forms were already `unobserve`d
observer.unobserve(form1);
observer.unobserve(form2);

// Both actions do nothing because the forms were already `unobserve`d
form1.elements[0].click();
form2.elements[0].dispatchEvent(new MouseEvent("click"));
```

## Gotchas

Although we don't think these things will be an impediment to your developer experience, we do want to make sure you're aware of a few things while you use the `FormObserver`.

### Be Mindful of the `ownerDocument` of the Forms That You Observe

> **Note**: If you're unfamiliar with [`Node.ownerDocument`](https://developer.mozilla.org/en-US/docs/Web/API/Node/ownerDocument), then this is likely something that you _don't_ need to worry about.

For performance reasons, each _instance_ of the `FormObserver` assumes that _all_ of the `form`s which it observes belong to the same `Document`. More specifically, it assumes that the `ownerDocument` of the first `form` that it observes will also be the `ownerDocument` of every other `form` that it observes. If you want to observe `form`s that belong to entirely different `Document`s on the same webpage, then you should create separate `FormObserver`s for each `Document` involved. Of course, it's highly unlikely that anyone would seek to observe multiple `form`s across different `Document`s anyway; but we figured that people should be aware of this concern just in case.

## What's Next?

- Read our [guides](./guides.md) to learn more about what you can do with the `FormObserver`.
- Check out our built-in solutions for [`localStorage` usage](../form-storage-observer/README.md) and [form validation](../form-validity-observer/README.md). They both solve problems that are common to web forms, and they might give you insight into how to solve other form-related problems as well.
