# Form Validity Observer Guides

Here you'll find helpful tips on how to use the `FormValidityObserver` effectively in various situations. We hope that you find these guides useful! Here are the currently discussed topics:

- [Enabling/Disabling Accessible Error Messages](#enabling-accessible-error-messages-during-form-submissions)
- [Keeping Track of Visited/Dirty Fields](#keeping-track-of-visiteddirty-fields)
- [Getting the Most out of the `defaultErrors` option](#getting-the-most-out-of-the-defaulterrors-option)
- [Keeping Track of Form Data](#keeping-track-of-form-data)
- [Recommendations for Conditionally Rendered Fields](#recommendations-for-conditionally-rendered-fields)
- [Recommendations for Styling Form Fields and Their Error Messages](#recommendations-for-styling-form-fields-and-their-error-messages)
- [Usage with Web Components](#usage-with-web-components)

<!--
TODO: Some `Guides` that could be helpful:

1) MAYBE something on how to work with accessible error messages? (Should we also mention `aria-errormessage` vs. `aria-describedby` too? As well as the lack of support for `aria-errormessage`? Or does that belong somewhere else in the docs?)
-->

## Enabling Accessible Error Messages during Form Submissions

By default, the browser will not allow a form to be submitted if _any_ of its fields are invalid (assuming the fields [can participate in field validation](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/willValidate)). If a user attempts to submit a form with invalid fields, the browser will block the submission and display an error message instead. This message will briefly appear in a bubble before disappearing, and the message only appears over one field at a time; so the user experience isn't the best.

You can override the browser's behavior by applying the [`novalidate`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#novalidate) attribute to the form element.

```html
<form novalidate>
  <!-- Fields -->
</form>
```

This allows us to register a `submit` handler that gets called even when the form's fields are invalid. From the handler, we can run our own validation logic for displaying error messages.

```js
const form = document.querySelector("form");
form.addEventListener("submit", handleSubmit);

function handleSubmit(event) {
  event.preventDefault();
  const formValid = observer.validateFields({ focus: true });
  if (!formValid) return;

  // Run submission logic if fields are valid...
}
```

An alternative to setting the form's `novalidate` attribute in your markup is setting it in your JavaScript.

```js
form.setAttribute("novalidate", "");
// or form.noValidate = true;
```

(See the [`form.noValidate`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement#htmlformelement.novalidate) property and the and the [`Element.setAttribute`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setAttribute) method for reference.)

We recommend setting the `novalidate` attribute of your forms in JavaScript instead of in your markup. This enables progressive enhancement for your forms. If for any reason [a user lacks access to JavaScript](https://www.kryogenix.org/code/browser/everyonehasjs.html) when they visit your app, they will still be able to experience the browser's native form validation as long as the `novalidate` property is _not_ set in your server-rendered HTML.

```html
<form>
  <!-- Fields -->
</form>
```

```js
const form = document.querySelector("form");
form.noValidate = true; // Run only when JS is loaded
// Other validation setup ...
```

Concerning users who don't have JavaScript, the benefit of this approach is two-fold:

1. **The user experience is better.** Users will be able to learn what fields they need to fix thanks to the browser's native error messages. And if their network connection is weak, they'll be able to gain this information _without_ making additional requests to your server.
2. **The load on your server is lighter.** The browser will automatically block form submissions for invalid fields. This reduces the number of requests that your server has to handle.

You gain these benefits while maintaining the better, more accessible user experience for users who have JS enabled. But if you're determined to apply the `novalidate` attribute in your HTML instead of your JavaScript, then it's recommended to make sure that your server is able to render accessible error messages for your fields whenever the user submits an invalid form. In that case, the error messages will likely look better and be more accessible to your users (if they're done well). But the downside is that users with weaker connections will have a harder time, and your server will experience a little more communication. Ultimately, it's a set of trade-offs; so it's up to you to determine whether to set `novalidate` in your HTML or in your JS.

## Keeping Track of Visited/Dirty Fields

In some situations, you might want to keep track of form fields that have been visited and/or edited by a user. Since the `FormValidityObserver` is solely concerned with the validity of form fields, it does not provide this functionality out of the box. However, it is fairly easy to use the base `FormObserver` to provide this functionality for you. An example is shown below. (Note: If there is enough interest, we are willing to consider supporting this use case in the future.)

```js
const observer = new FormObserver(
  ["focusout", "change"],
  [
    /** Marks a field as "visited" when a user leaves it. */
    (event) => event.target.setAttribute("data-visited", String(true)),

    /** Sets the dirty state of a field when its value changes. */
    (event) => {
      const dirtyAttr = "data-dirty";
      const field = event.target;

      if (field instanceof HTMLInputElement) {
        return field.setAttribute(
          dirtyAttr,
          field.type === "radio" || field.type === "checkbox"
            ? String(field.checked !== field.defaultChecked)
            : String(field.value !== field.defaultValue),
        );
      }

      if (field instanceof HTMLTextAreaElement) {
        return field.setAttribute(dirtyAttr, String(field.value !== field.defaultValue));
      }

      // Note: This approach requires you to explicitly set the `selected` attribute for your `option`s
      if (field instanceof HTMLSelectElement) {
        const dirtyValue = Array.prototype.some.call(field.options, (o) => o.selected !== o.defaultSelected);
        return field.setAttribute(dirtyAttr, String(dirtyValue));
      }

      // You can also add custom logic for any Web Components that act as form fields
    },
  ],
);

const form = document.getElementById("my-form");
observer.observe(form);

// Later, when some logic needs to know the visited/dirty fields
const fields = Array.from(form.elements);
const visitedFields = fields.filter((f) => f.hasAttribute("data-visited"));
const dirtyFields = fields.filter((f) => f.getAttribute("data-dirty") === String(true));

// Run logic with visited/dirty fields ...
```

(The above implementation is an adaptation of [Edmund Hung's brilliant approach](https://github.com/edmundhung/conform/issues/131#issuecomment-1557892292).)

To get an idea of how these event listeners would function, you can play around with them on the [MDN Playground](https://developer.mozilla.org/en-US/play?id=I15VQ64lWQShncvhr9JnLQQYWOoJQhpU1hHDLWKGF4D229TmIjON7qmRqK2mVceWNXsaP6jIjm%2FOjZ%2Bi). Feel free to alter this implementation to fit your needs.

You can learn more about what can be done with forms using pure JS on our [Philosophy](../extras/philosophy.md#avoid-unnecessary-overhead-and-reinventing-the-wheel) page.

## Getting the Most out of the `defaultErrors` Option

Typically, we want the error messages in our application to be consistent. Unfortunately, this can sometimes cause us to write the same error messages over and over again. For example, consider a message that might be displayed for the `required` constraint:

```html
<form>
  <label for="first-name">First Name</label>
  <input id="first-name" type="text" required aria-describedby="first-name-error" />
  <div id="first-name-error" role="alert"></div>

  <label for="last-name">Last Name</label>
  <input id="last-name" type="text" required aria-describedby="last-name-error" />
  <div id="last-name-error" role="alert"></div>

  <label for="email">Email</label>
  <input id="email" type="email" required aria-describedby="email-error" />
  <div id="email-error" role="alert"></div>

  <!-- Other Fields ... -->
</div>
```

We might configure our error messages like so

```js
const observer = new FormValidityObserver("focusout");
observer.configure("first-name", { required: "First Name is required." });
observer.configure("last-name", { required: "Last Name is required." });
observer.configure("email", { required: "Email is required." });
// Configurations for other fields ...
```

But this is redundant (and consequently, error-prone). Since all of our error messages for the `required` constraint follow the same format (`"<FIELD_NAME> is required"`), it would be better for us to use the [`defaultErrors`](./README.md#form-validity-observer-options-default-errors) configuration option instead.

```js
const observer = new FormValidityObserver("focusout", {
  defaultErrors: {
    required: (field) => `${field.labels?.[0].textContent ?? "This field"} is required.`;
  },
});
```

This gives us one consistent way to define the `required` error message for _all_ of our fields. Of course, it's possible that not all of your form controls will be labeled by a `<label>` element. For instance, a `radiogroup` is typically labeled by a `<legend>` instead. In this case, you may choose to make the error message more generic

```js
const observer = new FormValidityObserver("focusout", {
  defaultErrors: { required: "This field is required" },
});
```

Or you may choose to make the error message more flexible

```js
const observer = new FormValidityObserver("focusout", {
  defaultErrors: {
    required(field) {
      if (field instanceof HTMLInputElement && field.type === "radio") {
        const radiogroup = input.closest("fieldset[role='radiogroup']");
        const legend = radiogroup.firstElementChild.matches("legend") ? radiogroup.firstElementChild : null;
        return `${legend?.textContent ?? "This field"} is required.`;
      }

      return `${field.labels?.[0].textContent ?? "This field"} is required.`;
    },
  },
});
```

And if you ever need a _unique_ error message for a specific field, you can still configure it explicitly.

```js
const observer = new FormValidityObserver("focusout", {
  defaultErrors: { required: "This field is required" },
});

observer.configure("my-unique-field", { required: "This field has a unique `required` error!" });
```

### Default Validation Functions

The `validate` option in the `defaultErrors` object provides a default custom validation function for _all_ of the fields in your form. This can be helpful if you have a reusable validation function that you want to apply to all of your form's fields. For example, if you're using [`Zod`](https://zod.dev) to validate your form data, you could do something like this:

```js
const schema = z.object({
  "first-name": z.string(),
  "last-name": z.string(),
  email: z.string().email(),
});

const observer = new FormValidityObserver("focusout", {
  defaultErrors: {
    validate(field) {
      const result = schema.shape[field.name].safeParse(field.value);
      // Extract field's error message from `result`
      return errorMessage;
    },
  },
});
```

By leveraging `defaultErrors.validate`, you can easily use Zod (or any other validation tool) on your frontend. If you're using an SSR framework, you can use the exact same tool on your backend. It's the best of both worlds!

### Zod Validation with Nested Fields

For more complex form structures (e.g., "Nested Fields" as objects or arrays), you will need to write some advanced logic to make sure that you access the correct `safeParse` function. For example, if you have a field named `address.name.first`, then you'll need to recursively follow the path from `address` to `first` to access the correct `safeParse` function. The [`shape`](https://zod.dev/?id=shape) property (for objects) and the [`element`](https://zod.dev/?id=element) property (for arrays) in Zod will help you accomplish this. Alternatively, you can flatten your object structure entirely:

```js
const schema = z.object({
  "address.name.first": z.string(),
  "address.name.last": z.string(),
  "address.city": z.string(),
  // Other fields...
});
```

This enables you to use the approach that we showed above without having to write any recursive logic. It's arguably more performant than defining and walking through nested objects, but it requires you to be doubly sure that you're spelling all of your fields' names correctly. Also note that the logic for handling arrays in this example would still take a little effort and may require some recursion. However, this logic shouldn't be too difficult to write.

If there's sufficient interest from the community, then we may add some Zod helper functions to our packages to take this burden off of developers.

### Zod Validation Using Existing Libraries

Another option is to use an existing library that validates forms with Zod (e.g., `@conform-to/zod`) and to extract the error messages from that tool. For example, you might do something like the following:

```js
import { FormValidityObserver } from "@form-observer";
import { parseWithZod } from "@conform-to/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const observer = new FormValidityObserver("focusout", {
  defaultErrors: {
    validate(field) {
      const results = parseWithZod(new FormData(field.form), schema);
      // Grab the correct error message from `results` object by using `field.name`.
      return errorMessage;
    },
  },
});
```

## Keeping Track of Form Data

Many form libraries offer stateful solutions for managing the data in your forms as JSON. But there are a few disadvantages to this approach:

1. **Your application's bundle size increases.**
2. **Your application's performance decreases.** This is especially true in React apps (or similar apps).
3. **Applications using PureJS don't have strong state management libraries by default.** So a stateful form library may not be usable in all situations.
4. **Progressive enhancement is often lost.** Once you start thinking of form data as JSON from a state management library (instead of using the data structure that the browser provides), you usually end up with a web form that can't work without JS. This negatively impacts the accessibility of your site.

None of these problems exist when you use the browser's built-in solution for managing your form's data.

### How the Browser's Form Data Works

Any form control with a valid `name` that is associated with an `HTMLFormElement` automatically has its data associated with that form. Examples of form controls include `input`s, `select`s, [qualifying Web Components](https://web.dev/articles/more-capable-form-controls), and more. Consider the following code snippet:

```html
<form id="example-form">
  <textarea name="comment"></textarea>
  <custom-field name="some-entity"></custom-field>

  <select name="choices" multiple>
    <option value="pancakes">Pancakes</option>
    <option value="waffles">Waffles</option>
    <option value="cereal">Cereal</option>
  </select>
</form>

<input name="email" type="email" form="example-form" />
```

Assuming that the `custom-field` Web Component was [properly configured](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/attachInternals), the `textarea`, the `custom-field`, the `select`, and the external `input` will all have their data associated with the `#example-form` form element. To access this form data, we can use the browser's [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData/FormData) class -- which will allow us to get each part of a form's data by `name`.

```js
const form = document.querySelector("form#example-form");
const formData = new FormData(form);

const email = formData.get("email"); // Get the data from the `email` input
const choices = formData.getAll("choices"); // Get ALL of the options chosen in the multi-select
```

See how much easier this is than relying on a state management tool? :smile: There's [_even more_](../extras/philosophy.md#avoid-unnecessary-overhead-and-reinventing-the-wheel) that you can do with the browser's native form features. But for now, let's keep focusing on the `FormData` topic.

If you want a more JSON-like representation of the form data, you can also use [`Object.fromEntries()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/fromEntries).

```js
const data = Object.fromEntries(formData);
console.log("Email: ", data.email);
console.log("Comment: ", data.comment);
```

However, if you try to convert the `FormData` into a JSON-like structure, then you'll need to be aware of how the browser handles form data for certain inputs. For example, [only checked checkboxes have their data associated with their forms](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox#additional_attributes). Additionally, to get all of the data associated with a multi-select, you must use [`FormData.getAll()`](https://developer.mozilla.org/en-US/docs/Web/API/FormData/getAll). `Object.fromEntries()` assumes that each form control's data is accessed with `FormData.get()`, so you'll need to correct the multi-select data (and checkbox data) in your generated JSON object.

```js
const form = document.querySelector("form#some-other-example-form");
const formData = new FormData(form);

// JSON-ify form data and correct it where needed
const dataAsJSON = Object.fromEntries(formData);
dataAsJSON.checkbox = formData.get("checkbox") != null;
dataAsJSON.multiselect = formData.getAll("multiselect");
```

To know which form controls are "tricky" (like checkboxes and multi-selects) and which ones are "normal" (like textboxes and single-selects), you can visit MDN's documentation for the form control(s) that you're working with. That said, the vast majority of form controls behave "normally". So most of the time you won't need to think of these edge cases. (Plus, since the edge cases are so few, they'll typically be easier to remember.)

### Using JSON-ified `FormData` without Ruining Progressive Enhancement

Now we know how to access a form's data using the browser's native features. The browser gives us form data that automatically stays up to date _for free_ without any need for a state management tool. And we can even transform the data to a JSON-like structure if we want to. (Remember: In the end, you should send the regular `FormData` to the backend as is so that your application will be progressively enhanced. Generally, you should avoid sending form data to the backend as JSON.)

However, this approach introduces a question... What do we do with this form data on the server? Node.js servers are certainly able to work with the `FormData` object. However, many developers prefer to work with JSON objects on the server instead of using `FormData.get()` and `FormData.getAll()`.

The solution is actually quite simple: Instead of sending JSON from the frontend to the backend, we can create a utility function for the backend that _transforms_ `FormData` into valid JSON whenever we want. As long as we have access to 1&rpar; the `FormData` object on the incoming request and 2&rpar; the expected _schema_ for our form data, we can transform any `FormData` object into a valid JSON object. (If you're using an old Node.js server that can't use the `FormData` class, then you can still take a similar approach with whichever kind of object you're working with for form data.)

```ts
function parseFormDataIntoJSON<T extends Schema>(formData: FormData, schema: T): FormDataAsJSON<T>;
```

This approach gives us the best of both worlds: We gain a web form that functions without JS, and we gain an ergonomic JSON representation of the form data on the backend. For those who are interested, we'll spend the remainder of this section providing some ideas on how to implement `parseFormDataIntoJSON`. There are multiple ways to do this depending on the needs of your application. We're simply giving you the _starting point_. (That said, if there is enough interest from the community, we will consider supporting a fully-featured, fully-tested version of this function in the `Form Observer` utilities.)

### Implementing `parseFormDataIntoJSON` in Simple Use Cases: Primitive Values

Implementing `parseFormDataIntoJSON` is actually very easy for primitive values. By "primitive values", we mean values that can be represented without using an array or a JSON object. In addition to `number`s, `string`s, and `boolean`s, this includes types like `Date`s and `File`s.

Imagine that we want to account for the aforementioned value types on the server. We can create a `Schema` type that is used to define the _expected structure_ of our incoming form data, and we can create utility types that map a `Schema` to a regular JSON object. (Note: If you aren't using TypeScript or don't care for type safety, you can skip this part.)

```ts
type Schema = {
  [key: string]: { type: "number" | "string" | "boolean" | "date" | "file" };
};

type SchemaMap = { number: number; string: string; boolean: boolean; date: Date; file: File };
type FormDataAsJSON<T extends Schema> = { [K in keyof T]: SchemaMap[T[K]["type"]] };
```

Note that we will not be accounting for optional values in our example. But one way to do so could be to include an `optional` property in the `Schema` type:

```ts
type Schema = {
  [key: string]: { type: "number" | "string" | "boolean" | "date" | "file"; optional?: boolean };
};
```

We can use these utility types to define our `parseFormDataIntoJSON` function. We'll provide this function with the `FormData` on the incoming request, and we'll also give it a physical `Schema` object that tells the function how to transform the `FormData` into a valid JSON object. The way to perform the transformation is straightforward: Loop over every part of the `Schema`, using the information in each component to dictate how the `FormData` should be transformed.

```ts
const transformers = {
  string: (formValue: FormDataEntryValue): string => formValue as string,
  number: (formValue: FormDataEntryValue): number => Number(formValue),
  boolean: (formValue: FormDataEntryValue | null): boolean => formValue != null,
  date: (formValue: FormDataEntryValue): Date => new Date(formValue as string),
  file: (formValue: FormDataEntryValue): File => formValue as File,
};

function parseFormDataIntoJSON<T extends Schema>(formData: FormData, schema: T): FormDataAsJSON<T> {
  const keys = Object.keys(schema);
  const jsonObject: Record<string, unknown> = {};

  keys.forEach((k) => {
    const value = schema[k];
    const formValue = formData.get(k);

    if (formValue) return (jsonObject[k] = transformers[value.type](formValue)); // Don't set `null` values
    return value.type === "boolean" ? (jsonObject[k] = false) : undefined;
  });

  return jsonObject as ReturnType<typeof parseFormDataIntoJSON<T>>;
}
```

You can test this out with a Schema object like the following:

```ts
const exampleSchema = {
  file: { type: "file" },
  name: { type: "string" },
  amount: { type: "number" },
  subscribe: { type: "boolean" },
  creation: { type: "date" },
} satisfies Schema;

parseFormDataIntoJSON(myFormData, exampleSchema);
```

### Implementing `parseFormDataIntoJSON` in Advanced Use Cases: Objects

Unfortunately, the browser has no native way to represent object data or array data in forms. So in order to achieve this experience, we have to be creative with the `name`s that we use for our form controls, and we have to be even more intentional with our `Schema` type.

Typically, when we work with objects in JavaScript, we access properties by writing `object.property`. So it makes sense to use this as our rule for defining "object data" in our progressively enhanced forms.

```html
<form>
  <input name="user.name.first" type="text" required />
  <input name="user.name.last" type="text" required />
</form>
```

Here, we're saying that `user` is an object. It has a `name` property that is an object containing a `first` property and a `last` property. Now all we need to do is update our types and the `parseFormDataIntoJSON` function to convert this kind of `FormData` into a JSON object.

One way to approach this is with recursion. We already have types and logic in place to create a JSON object from a `FormData` object that is only "1 level deep". So what we're really trying to do now is support nested object data in forms. This should be pretty easy to do given our foundation.

```ts
type Schema = {
  [key: string]: { type: "number" | "string" | "boolean" | "date" | "file" } | { type: "object"; properties: Schema };
};

// The `SchemaMap` type will not change.

type FormDataAsJSON<T extends Schema> = {
  [K in keyof T]: T[K] extends { type: "object" }
    ? FormDataAsJSON<T[K]["properties"]>
    : T[K] extends { type: keyof SchemaMap }
      ? SchemaMap[T[K]["type"]]
      : never;
};

// The `transformers` will not change.

function parseFormDataIntoJSON<T extends Schema>(formData: FormData, schema: T, scope?: string): FormDataAsJSON<T> {
  const keys = Object.keys(schema);
  const jsonObject: Record<string, unknown> = {};

  keys.forEach((k) => {
    const value = schema[k];
    const name = scope ? `${scope}.${k}` : k;

    // Recursively generate JSON objects
    if (value.type === "object") return (jsonObject[k] = parseFormDataIntoJSON(formData, value.properties, name));

    // Generate "primitive values"
    const formValue = formData.get(name);
    if (formValue) return (jsonObject[k] = transformers[value.type](formValue)); // Don't set `null` values
    return value.type === "boolean" ? (jsonObject[k] = false) : undefined;
  });

  return jsonObject as ReturnType<typeof parseFormDataIntoJSON<T>>;
}
```

Notice that we didn't have to change our code too much. We simply updated `parseFormDataIntoJSON` (and the necessary types) to recursively generate JSON objects from any nested `Schema`s. We also keep track of our level of nesting with the new `scope` parameter. This enables us to grab the correct value using `FormData.get()`. For example, we can properly call `FormData.get("user.name.first")` while we recurse through the `user` object thanks to the `scope` parameter.

Our new logic works with the following example schema:

```ts
const exampleSchema = {
  file: { type: "file" },
  name: { type: "string" },
  amount: { type: "number" },
  subscribe: { type: "boolean" },
  creation: { type: "date" },
  user: {
    type: "object",
    properties: {
      id: { type: "string" },
      name: {
        type: "object",
        properties: {
          first: { type: "string" },
          last: { type: "string" },
        },
      },
    },
  },
} satisfies Schema;

parseFormDataIntoJSON(myFormData, exampleSchema);
```

### Improving the Return Type of the `FormData` Transformer

If you've been following along with TypeScript, you may have noticed that although the _output_ types (from `parseDataIntoJSON` and `FormDataAsJSON`) are correct, they look a little convoluted when you hover over them. To solve this problem, we can use TypeScript's [`infer`](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types) keyword to force it to give us the _exact_ object type as an output. Although this makes the output type look prettier, it does add some complexity to our type definitions; so you should only consider doing this if it will truly help you. Note that your types will still be accurate whether you do this or not.

```ts
type FormDataAsJSON<T extends Schema> = {
  [K in keyof T]: T[K] extends { type: "object" }
    ? FormDataAsJSON<T[K]["properties"]> extends infer O
      ? { [P in keyof O]: O[P] }
      : never
    : T[K] extends { type: keyof SchemaMap }
      ? SchemaMap[T[K]["type"]]
      : never;
};

// ...

function parseFormDataIntoJSON<T extends Schema>(
  formData: FormData,
  schema: T,
  scope?: string,
): FormDataAsJSON<T> extends infer O ? { [P in keyof O]: O[P] } : never {
  // ...
}

// When we hover `output`, we'll now get a type that is much more readable
const output = parseFormDataIntoJSON(myFormData, exampleSchema);
```

The technique above basically forces TypeScript to `infer` the _exact_ object type for our output. The `never` case should never be reached. Again, this approach is optional.

### Implementing `parseFormDataIntoJSON` in Advanced Use Cases: Arrays

This is the last case that we need to support in our example, and it is by far the most complicated one. What makes this use case complicated is that there are situations where the browser supports array data and situations where it does not. For example, the browser supports multi-selects and multi-file uploads. Values for these pieces of data can be represented with a regular `name`. However, if we want to represent an array of data in an unsupported way, or if we want to support an array of object data (such as an array of work experience data), then we'll need to get creative with the `name`s of the form controls again.

For array data that the browser supports, we'll use regular `name`s. For array data that _isn't_ supported by the browser, we can use the same convention that we used for object data. That is, we'll use the property-access syntax (e.g., `array[index]`) to structure the `name`s of our form controls.

```html
<!-- Native Array Form Data -->
<select name="options" multiple>
  <option value="1">One</option>
  <option value="2">Two</option>
  <option value="3">Three</option>
</select>

<!-- Array of Primitive Data -->
<input name="nicknames[0]" />
<input name="nicknames[1]" />

<!-- Array of Object Data-->
<input name="jobs[0].company" required />
<input name="jobs[0].role" required />
```

First, let's update the types. Things get _a little_ bit more involved, but not too much.

```ts
type Schema = {
  [key: string]:
    | { type: "number" | "string" | "boolean" | "date" | "file" }
    | { type: "object"; properties: Schema }
    | { type: "array"; items: Exclude<Schema[string], { type: "array" }> };
};

// The `SchemaMap` type will not change.

type FormDataAsJSON<T extends Schema> = {
  [K in keyof T]: T[K] extends { type: "object" }
    ? FormDataAsJSON<T[K]["properties"]> extends infer O
      ? { [P in keyof O]: O[P] }
      : never
    : T[K] extends { type: "array" }
      ? T[K]["items"] extends { type: keyof SchemaMap }
        ? Array<SchemaMap[T[K]["items"]["type"]]>
        : T[K]["items"] extends { type: "object" }
          ? Array<FormDataAsJSON<T[K]["items"]["properties"]> extends infer O ? { [P in keyof O]: O[P] } : never>
          : never
      : T[K] extends { type: keyof SchemaMap }
        ? SchemaMap[T[K]["type"]]
        : never;
};
```

Don't get scared. The changes are more straightforward than you think. For the `Schema` type, we updated it to support arrays. Similar to the `object` Schema type, the `array` Schema type holds a nested Schema in its `items` property. But this property is intentionally forbidden from using additional arrays directly. This means that we _don't_ support matrices/tensors (e.g., an array of arrays) in forms. (It's hard to imagine a case in which such structures would be helpful in forms.) But we _do_ support arrays of objects which themselves contain arrays.

In the `FormDataAsJSON` type, all that we've done is add logic for the array case. If we have an array of _primitives_ (`T[K]["items"] extends { type: keyof SchemaMap }`), then the type just returns an array of primitves. If we have an array of _objects_ (`T[K]["items"] extends { type: "object" }`), then we return an array of recursively generated object types. Arrays of arrays are not supported and will return `never` as a type. If we don't have an array in the `Schema` input at all, then the `FormDataAsJSON` type behaves the same way it did beforehand.

With the types figured out, let's update the logic in `parseFormDataIntoJSON`.

```ts
function parseFormDataIntoJSON<T extends Schema>(
  formData: FormData,
  schema: T,
  scope?: string,
): FormDataAsJSON<T> extends infer O ? { [P in keyof O]: O[P] } : never {
  const keys = Object.keys(schema);
  const jsonObject: Record<string, unknown> = {};

  keys.forEach((k) => {
    const value = schema[k];
    const name = scope ? `${scope}.${k}` : k;

    if (value.type === "object") return (jsonObject[k] = parseFormDataIntoJSON(formData, value.properties, name));
    if (value.type !== "array") {
      const formValue = formData.get(name);
      if (formValue) return (jsonObject[k] = transformers[value.type](formValue)); // Don't set `null` values
      return value.type === "boolean" ? (jsonObject[k] = false) : undefined;
    }

    // Value must be an Array
    jsonObject[k] = [];

    // Data is an array of object data
    if (value.items.type === "object") {
      for (let i = 0; ; i++) {
        const item: Record<string, unknown> = parseFormDataIntoJSON(formData, value.items.properties, `${name}[${i}]`);
        const values = Object.values(item).filter((v) => v !== false && !(Array.isArray(v) && v.length === 0));

        // The object is effectively "empty", implying that there is no "i-th item"
        if (values.length === 0) break;

        // An "i-th object" was generated
        (jsonObject[k] as unknown[])[i] = item;
      }

      return;
    }

    // Data was included as an "array" composed from multiple fields
    if (formData.has(`${name}[0]`)) {
      for (let i = 0; formData.has(`${name}[${i}]`); i++) {
        const formValue = formData.get(`${name}[${i}]`) as FormDataEntryValue;
        (jsonObject[k] as unknown[])[i] = transformers[value.items.type](formValue);
      }

      return;
    }

    // Data was included as an "array" belonging to a single field
    const formDataValues = formData.getAll(name);
    for (let i = 0; i < formDataValues.length; i++) {
      (jsonObject[k] as unknown[])[i] = transformers[value.items.type](formDataValues[i]);
    }
  });

  return jsonObject as ReturnType<typeof parseFormDataIntoJSON<T>>;
}
```

As you can see, the logic for supporting arrays is much more involved be cause we need to cover all of our bases.

In the case where we need to support an array of object data (e.g., `jobs[0].company` and `jobs[0].role`), we recursively create those objects in a loop until there are no more items in the array. To verify that we've finished looping through the "array" of object form data, we simply check that the object returned from our recursive call is empty. However, `boolean`s and `array`s will always appear on an object that "should be empty" because a `boolean` will always default to `false` and an `array` will always default to an empty array. So we exclude those 2 scenarios from our check.

Next, we deal with the case where we have an array of primitive values that the browser doesn't support. This means fields with `name`s like `nicknames[0]`. Here, we loop over the array of primitives -- transforming them as needed until no more items are left in the array. To determine when we've finished looping through the "array" of data, we check whether or not the `ith` item exists within the `FormData` object.

Finally, we handle the case of array data that the browser does support. This means fields with regular `name`s. Yet again, we transform all of the primitive values in the array to their expected type.

You can test this function out with the following example Schema:

```ts
const exampleSchema = {
  file: { type: "file" },
  name: { type: "string" },
  amount: { type: "number" },
  subscribe: { type: "boolean" },
  creation: { type: "date" },
  user: {
    type: "object",
    properties: {
      id: { type: "string" },
      name: {
        type: "object",
        properties: {
          first: { type: "string" },
          last: { type: "string" },
        },
      },
    },
  },
  jobs: {
    type: "array",
    items: {
      type: "object",
      properties: {
        company: { type: "string" },
        role: { type: "string" },
        nicknames: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  },
} satisfies Schema;
```

We also have an [interactive example in Solid.js](https://playground.solidjs.com/anonymous/4420336d-0bda-449a-85af-75e7384dd3fa) that you can use to see how the `parseFormDataIntoJSON` function works in real time. (The example uses this function on the frontend instead of the backend.)

Remember that this is only an _example_ of how to transform `FormData` into JSON. You can alter the example that we've given you above to fit your needs, or you can take a totally different approach. If you're using a tool like [zod](https://zod.dev), then you can even add server validation into the mix with ease. The benefit of using a `FormData` parser is that it allows you to maintain a progressively enhanced application -- even for complex forms! And it also gives you greater flexibility/control for your use cases.

All that said, bear in mind that you should be able to write server logic just fine by relying on the `FormData` object alone. Doing so saves you from having to create complex types, an intermediate parser function, and intermediate Schema objects (or from having to rely on someone else to do that for you). The type safety that comes from the more complex approach is only helpful insofar as your types and your logic are carefully and accurately defined. But there could still be edge cases that your abstractions may not account for.

If JSON seems more easy to work with, remember that we're coming from an age where JSON was used _everywhere_ as we tried to manage complex state in SPAs instead of on the server. Thus, JSON may only _seem_ easier to use because it is familiar. If you try working with the `FormData` object as is, you may find that it's easy enough to use on its own, and that foregoing data transformations will bring you some performance gains. The approach you take is up to you; it's all a set of trade-offs.

## Recommendations for Conditionally Rendered Fields

It's very common for moderately-sized forms to have fields that are conditionally displayed to users. This allows a user to be presented only with the form fields that are relevant to them at any given time. In React applications, form fields are often rendered conditionally with the following approach:

```jsx
{
  condition ? (
    <fieldset>
      <input name="field-1" />
      <input name="field-2" />
    </fieldset>
  ) : null;
}
```

However, this approach causes the owning `<form>` element to lose the `FormData` associated with these fields when they're hidden. If you still need the data associated with these fields when they aren't visible to the user, then we would recommend _hiding_ these fields instead.

```jsx
/* Note: You can also hide the element with CSS or the `style` attribute if you like */
<fieldset hidden={conditionFailed}>
  <input name="field-1" />
  <input name="field-2" />
</fieldset>
```

In addition to keeping the data associated with `field-1` and `field-2` in your `<form>`, this approach saves your JS framework from doing extra work. In particular, your framework will only need to toggle a single attribute when `conditionFailed` changes. This is more performant than requiring your framework to repeatedly add (or remove) DOM nodes as your condition changes.

Note that if any of your conditionally-displayed fields partake in form validation _and_ [`form.noValidate`](#enabling-accessible-error-messages-during-form-submissions) is `false`, then you might need to `disable` these fields when you hide them. This is because browsers will still block form submissions for invalid form controls that are unfocusable. (A `hidden` or `display: none` field cannot be focused -- not even programmatically with JS.) Form controls that are `disabled` or `readonly` are excluded from this behavior since [the browser does not validate such fields](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/willValidate).

If it's possible, it's worthwhile to consider if the conditionally-displayed fields in your form can be managed with navigation (instead of JS) so that your form will work for users who don't have JS. (For some forms, this may be more difficult than what it's worth.)

## Recommendations for Styling Form Fields and Their Error Messages

Oftentimes, CSS gives us a way to tie into what the DOM is doing. This makes our CSS clearer and prevents us from having to write redundant CSS classes. For instance, to style a `disabled` textbox, we wouldn't write

```css
input.disabled[type="text"] {
  /* Styles */
}
```

No, no, no. Instead, we would write

```css
input[type="text"]:disabled {
  /* Styles */
}
```

This approach is much more clear. It ties into standardized CSS selectors, it prevents us from writing CSS classes that are either meaningless or at risk for name clashing, and it saves us from having to write additional JS that toggles CSS classes on HTMLElements.

I think we all understand _why_ we would want to reach for `:disabled` instead of `.disabled`. But did you know that we have something similar when it comes to invalid fields and error messages? The [`aria-invalid`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-invalid) attribute is what communicates to the [accessibility tree](https://developer.mozilla.org/en-US/docs/Glossary/Accessibility_tree) that a form field is invalid. Sometimes, you'll see CSS classes like `.error` being used to style invalid fields. But that's actually just as unhelpful as the `.disabled` class that we saw earlier. Instead of writing

```css
input.error[type="text"] {
  /* Styles */
}
```

we should be writing

```css
input[type="text"][aria-invalid="true"] {
  /* Styles */
}
```

Again, this approach ties into standardized CSS selectors, prevents us from creating unnecessary CSS classes, and saves us from writing JS that toggles CSS classes. But this approach has another added benefit: _It protects us from accidentally creating web applications that are **inaccessible** to Screen Reader Users_.

To understand what I mean, let's think about our `.disabled` example again. The problem with using a `.disabled` class in CSS is that we have no guarantee that the field is actually disabled. This means that it's possible to show the "disabled styles" when the field isn't disabled, and it's possible _not_ to show the "disabled styles" when the field _is_ disabled. The only way to write CSS that _guarantees_ that the correct styles are displayed at the correct time is to use `:disabled`.

The same thing holds for `.error`. The problem with `.error` is that it provides no guarantee that a field is actually invalid. With `.error`, it's possible to show the "invalid styles" when the accessibility tree (and consequently Screen Reader Users) _don't_ see an invalid field, and it's also possible to fail to show these styles when they are needed. The only way to write CSS that _guarantees_ that the correct styles are displayed at the correct time is to write styles [based on the `aria-invalid` attribute](https://www.w3schools.com/cssref/sel_attribute_value.php). This way, the user experience remains accurate and consistent for both Visual Users _and_ Screen Reader Users.

### What about Styling Error Messages?

Don't worry. You don't need random CSS classes for your error messages either. Yet again, you can stick to using reliable accessibility attributes. But before we show you the attributes, let's explain why any attributes are even needed at all.

Typically, when a field becomes invalid, you'll want your user to know _as soon as possible_. For instance, consider a situation where you have a moderately-sized form. As the user supplies values for each field, you'll want to let them know if a field is invalid when they leave it. One way to do this is to display the relevant error message whenever an _invalid_ field is [`blur`rred](https://developer.mozilla.org/en-US/docs/Web/API/Element/blur_event). That way, the user gets to know what they did wrong immediately, and they get to correct their errors one at a time as they progress through the form. This is a simple experience that doesn't overwhelm the user.

If you don't display any error messages to the user until _after_ they've submitted the form, then they'll be _flooded_ with error messages that appear simultaneously. This can be an overwhelming user experience, especially if the user was hoping to be _completely_ done with the form by the time that they clicked "Submit".

It's obvious to us why the former experience is significantly better than the latter experience for Visual Users. However, the experience for Screen Reader Users is often overlooked. Screen Reader Users do not see everything at once like Visual Users. Instead, they navigate through each "accessible item" one at a time. So what happens if we show an error message _after_ a Screen Reader User leaves a form field? Well, they focus a _different_ field first, and _then_ the error message gets displayed. This means that the Screen Reader User will already have _passed_ a field's error message by the time we display it. In other words, the user won't notice the error message until much later (unless they backtrack).

The solution to this problem is to tell the Screen Reader to announce an error message whenever it appears or changes. And for that, we can use [`[role="alert"]`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/alert_role). _This_ is the CSS attribute to which we can tie our styles, and it's arguably more accurate than `.error-message`, which has no meaning to HTML or the accessibility tree.

```css
input[type="text"][aria-invalid="true"] + [role="alert"] {
  color: red;
  /* Other Styles */
}
```

```html
<!-- Remember: `aria-invalid` is automatically handled by the `FormValidityObserver` -->
<label for="name">Name</label>
<input id="name" name="name" type="text" required aria-describedby="name-error" />
<div id="name-error" role="alert"></div>
```

(The [`A + B`](https://www.w3schools.com/cssref/sel_element_pluss.php) selector styles the element immediately following `A`.)

Yet again, we have a solution that guarantees a good, consistent user experience for _both_ Visual Users and Screen Reader Users. One quick note: Some developers might prefer to use [`[aria-live="polite"]`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-live) over `[role="alert"]`. You're free to use that approach if you like. But it's worth pointing out that since your errors should be appearing one at a time (and since you'll want your users to know the error message that occurred immediately), there's no perceivable harm or disadvantage in using the `alert` role.

### Making the Error Message Styles More Robust

So now we know how to style our invalid fields _and_ how to style our error messages. But how do we do this in a reusable, reliable way? The `next-sibling combinator` (`+`) is not sufficient on its own. For example, consider a situation where we want to place two fields side-by-side on the same line in a [`grid`](https://developer.mozilla.org/en-US/docs/Web/CSS/grid) or [`flexbox`](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Flexbox).

```html
<div class="some-grid">
  <label for="name">Name</label>
  <input id="name" name="name" type="text" required aria-describedby="name-error" />
  <div id="name-error" role="alert"></div>

  <label for="email">Email</label>
  <input id="email" name="email" type="email" required aria-describedby="email-error" />
  <div id="email-error" role="alert"></div>
</div>
```

When we put these fields directly inside a grid or a flexbox, _all 6 elements_ (the `label`s, `input`s, and `div`s) function as _distinct_ items in the grid/flexbox layout. This is because all of the elements are siblings of each other. Generally speaking, this is _not_ the behavior that what we want, and this problem gets even worse when we consider field enhancements like adornments. Instead, we'd like each "unit" to act as a single grid/flex item within the overall layout. To accomplish this, we can wrap each unit in a parent element.

```html
<div class="some-grid">
  <div>
    <label for="name">Name</label>
    <input id="name" name="name" type="text" required aria-describedby="name-error" />
    <div id="name-error" role="alert"></div>
  </div>

  <div>
    <label for="email">Email</label>
    <input id="email" name="email" type="email" required aria-describedby="email-error" />
    <div id="email-error" role="alert"></div>
  </div>
</div>
```

But how do we style these "units" reusably? Well, unfortunately, there aren't any semantic HTMLElements or accessibility attributes that we can use in this scenario. The [`fieldset`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) element and the [`group`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/group_role) role are probably the closest thing that we have. But both of these would be inappropriate because they communicate that a _group_ of fields are present, not a single field. So element selectors and attribute selectors are out of the question. We don't recommend using Tailwind in this scenario either because it only becomes advantageous if you create components for your fields. And we've personally found that in the long run, using components for fields becomes inflexible and unnecessarily redundant in the long run.

So... we're stuck with using CSS classes this time. Something like `.form-field` will do just fine.

```html
<div class="some-grid">
  <div class="form-field">
    <label for="name">Name</label>
    <input id="name" name="name" type="text" required aria-describedby="name-error" />
    <div id="name-error" role="alert"></div>
  </div>

  <div class="form-field">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" required aria-describedby="email-error" />
    <div id="email-error" role="alert"></div>
  </div>
</div>
```

```scss
.form-field {
  > label {
    /* Label Styles */
  }

  > input[type="text"],
  > input[type="email"] {
    /* Input Styles */

    &[aria-invalid="true"] {
      /* Invalid Input Styles */
    }
  }

  &:has([aria-invalid="true"]) > [role="alert"] {
    /* Error Message Styles */
  }
}
```

This approach to styling form fields makes it much easier to re-use our error message styles in layouts, and you will also find that it helps with styling other things like complex field `label`s. The above styles are written in [SCSS](https://sass-lang.com/documentation/) for simplicity. However, with [CSS Nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting) support being right around the corner, the code you see above will be valid CSS very soon. See [`:has`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) and [this list of CSS selectors](https://www.w3schools.com/cssref/css_selectors.php) for more details.

That was a lot of information, but hopefully it was helpful! Having a sane, reusable, maintainble way to style your form fields is very important.

## Usage with Web Components

Unlike some of the other form validation libraries out there, the `FormValidityObserver` is compatible with native [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components). In addition to the guidelines given in the [`FormObserver` documentation](../form-observer/guides.md#usage-with-web-components), there are a few things to keep in mind when using Custom Elements with the `FormValidityObserver`.

#### You Must Expose the Validation Properties of Your Custom Element

Custom Elements do not expose their [`ValidityState`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/validity) by default, nor do they expose their [`validationMessage`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/validationMessage) or [`willValidate`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/willValidate) properties. Because the `FormValidityObserver` needs these details to perform proper validation, your Custom Element will need to expose them like so:

```js
class CustomField extends HTMLElement {
  static formAssociated = true;
  #internals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    // Other Setup ...
  }

  get form() {
    return this.#internals.form;
  }

  get validity() {
    return this.#internals.validity;
  }

  get validationMessage() {
    return this.#internals.validationMessage;
  }

  get willValidate() {
    return this.#internals.willValidate;
  }
}

customElements.define("custom-field", CustomField);
```

The `FormValidityObserver` _requires_ the `ValidityState` of Custom Elements to be exposed via the `validity` property because this is consistent with the behavior of native form controls. This is already a best practice if you're writing Custom Elements that others will be using since it creates a more intuitive developer experience. It is recommended to keep the `ElementInternals` private and to use a getter (_without_ a setter) for the `validity` property to prevent unwanted mutations from the outside. The same goes for the `validationMessage` and `willValidate` properties.

> Note: One benefit of exposing the `validationMessage` property is that you typically won't need to call `FormValidityObserver.configure` for your Web Components. This is because the observer falls back to displaying the `validationMessage` when no configured error messages are found.

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

  // Validation Properties ...

  /** @type {ElementInternals["reportValidity"]} */
  reportValidity() {
    return this.#internals.reportValidity();
  }
}

customElements.define("custom-field", CustomField);
```

#### You Must Expose the `name` of Your Custom Element

Because the `FormValidityObserver` does not validate nameless fields, you must expose your Custom Element's `name`:

```js
class CustomField extends HTMLElement {
  static formAssociated = true;
  #internals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    // Other Setup ...
  }

  /** Sets or retrieves the name of the object. @returns {string} */
  get name() {
    return this.getAttribute("name") ?? "";
  }

  set name(value) {
    this.setAttribute("name", value);
  }

  // Validation Properties ...
}

customElements.define("custom-field", CustomField);
```

#### Consider Exposing a `setCustomValidity` Method (Optional)

No Custom Element that acts as a form control has a `setCustomValidity` method by default. Instead, it has a [`setValidity`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/setValidity) method which handles _all_ of the ways that the element's `ValidityState` can be marked as valid or invalid.

Technically speaking, a robust Custom Element can manage all of its `ValidityState` and error messaging internally; so a public `setCustomValidity` method isn't necessary. For this reason, the `FormValidityObserver` does not require you to expose this method on your class.

That said, if you're writing Web Components that others will be using, then it's a best practice to expose a `setCustomValidity` method. This is because it's impossible to predict all of the ways that other developers will use your Custom Element. A `setCustomValidity` method that mimics the behavior of native form controls will be more intuitive for your end users and will satisfy whatever custom error handling needs they may have.

```js
class CustomField extends HTMLElement {
  static formAssociated = true;
  #internals;

  constructor() {
    super();
    this.#internals = this.attachInternals();
    // Other Setup ...
  }

  // Other Properties ...

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

This is a simple example that can be improved upon if desired. For instance, if you want to play it safe, you can coerce the `error` argument to a string. To fully mimic the browser's native behavior, the `setCustomValidity` method should also check to see if there are any other broken validation constraints before attempting to clear the error message.

#### Be Mindful of Accessibility

When working with Web Components that also act as form fields, you should be careful to ensure that _the element which acts as a form field is also the element that will receive the field-related ARIA attributes_.

For example, if you're creating a [`combobox`](https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Roles/combobox_role) component that's intended to act as a superior `<select />` field, then you'd want to design your Web Component such that the element with the `combobox` role is the element that sets up the `ElementInternals` _and_ that receives all of the field-related ARIA attributes (such as `aria-invalid`). This will typically make it easier for you to build accessible components, especially if you're leveraging helpful features like the [`invalid` event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/invalid_event).

As far as the `FormValidityObserver` is concerned, it assumes that your Web Components follow this structure. More specifically, it assumes that the element which holds the `ElementInternals` is the element whose ARIA attributes should be automatically updated. This typically isn't something you'll need to think about unless your custom form control is a complex component composed of multiple sub-components.
