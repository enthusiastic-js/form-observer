# Form Validity Observer Integrations (for Convenience)

We currently provide _convenience APIs_ for the following JS Frameworks:

- [Svelte](./svelte.md) (`@form-observer/svelte`)
- [React](./react.md) (`@form-observer/react`)
- [Vue](./vue.md) (`@form-observer/vue`)
- [Solid](./solid.md) (`@form-observer/solid`)
- [Lit](./lit.md) (`@form-observer/lit`)
- [Preact](./preact.md) (`@form-observer/preact`)

## Do I _Need_ a Framework Integration?

**No.** As [we mentioned earlier](../README.md#consistent-api-across-all-frameworks), the `FormValidityObserver` is compatible with _all_ JS Frameworks and with pure JS out of the box. So there's no need to install a framework wrapper to utilize its full power. That said, a framework wrapper can still be useful for the sake of _convenience_. Here's what we mean...

When you're working with pure HTML and pure JS, you'll have code that looks like something this:

```html
<form>
  <label for="username">Username</label>
  <input id="username" name="username" type="text" required aria-describedby="username-error" />
  <div id="username-error" role="alert"></div>

  <label for="email">Email</label>
  <input id="email" name="email" type="email" required aria-describedby="email-error" />
  <div id="email-error" role="alert"></div>

  <!-- Other Fields -->
</form>
```

```js
const observer = new FormValidityObserver("focusout");
const form = document.querySelector("form");
form.setAttribute("novalidate", "");
observer.observe(form);

const required = (field) => `${field.labels[0]?.textContent ?? "Field"} is required.`;
observer.configure("username", { required });
observer.configure("email", { required, type: "Please provide a valid email." });
// Other Configurations
```

The code above is pretty simple. However, the fact that we have to keep track of the field names and attributes in two separate places is a minor nuisance. Since this isn't a major inconvenience, and since [we have to keep track of these things separately](../../extras/development-notes.md#why-doesnt-the-core-formvalidityobserver-apply-the-proper-attributes-to-form-fields) if we want the app to be progressively enhanced, this is a nuisance that can be ignored. But when we're working with JS frameworks that support props spreading, we can resolve this problem. Consider the [`Svelte`](https://svelte.dev/) code below:

```svelte
<form bind:this={form}>
  <label for="username">Username</label>
  <input id="username" name="username" type="text" required aria-describedby="username-error" />
  <div id="username-error" role="alert" />

  <label for="email">Email</label>
  <input id="email" name="email" type="email" required aria-describedby="email-error" />
  <div id="email-error" role="alert" />

  <!-- Other Fields -->
</form>

<script>
  import { onMount } from "svelte";
  import { FormValidityObserver } from "@form-observer/core";

  let form;
  const observer = new FormValidityObserver("focusout");
  onMount(() => {
    form.setAttribute("novalidate", "");
    observer.observe(form);
    return () => observer.disconnect();
  });

  const required = (field) => `${field.labels[0]?.textContent ?? "Field"} is required.`;
  observer.configure("username", { required });
  observer.configure("email", { required, type: "Please provide a valid email." });
  // Other Configurations
</script>
```

This can be simplified if we augment the `configure` function to generate the correct validation props:

```svelte
<form use:autoObserve>
  <label for="username">Username</label>
  <input id="username" {...configure("username", { required })} aria-describedby="username-error" />
  <div id="username-error" role="alert" />

  <label for="email">Email</label>
  <input
    id="email"
    {...configure("email", { required, type: { value: "email", message: "Please provide a valid email" } })}
    aria-describedby="email-error"
  />
  <div id="email-error" role="alert" />

  <!-- Other Fields -->
</form>

<script>
  import { createFormValidityObserver } from "@form-observer/svelte";
  const { autoObserve, configure } = createFormValidityObserver("focusout");
  const required = (field) => `${field.labels[0]?.textContent ?? "Field"} is required.`;
</script>
```

Now our field names, field attributes, and error messages are all configured in the same place. In addition to reducing code redundancy, this approach also removes the potential for application errors caused by typos. To top things off, we added a `Svelte Action` to simplify the setup/cleanup process as well.

_This_ is the problem that our framework integrations try to solve. You don't have to download our framework-specific packages to use the `FormValidityObserver` effectively, but you might find the integrations useful for the sake of convenience. Since the code that our framework-specific packages provide is _very_ minimalistic, you're also free to write your own utility function(s) that accomplish similar purpose(s). (Feel free to use our codebase as a point of reference if you want.)

## What If My Framework Doesn't Support Props Spreading?

Unfortunately, if your framework does not support props spreading (like [Angular](https://github.com/angular/angular/issues/14545)), then you'll have to do things the old-fashioned way: You'll need to...

1. Obtain a reference to the `HTMLFormElement` that you want to observe.
2. Call `FormValidityObserver.observe(form)` when the reference to your form element becomes available (typically during the component's "mounting phase").
3. Give your form fields any necessary validation attributes. (Also add accessible error container elements if desired.)
4. Optionally, configure the error messages for your fields with `FormValidityObserver.configure()`.
5. When your component unmounts, call `FormValidityObserver.disconnect()` (or `FormValidityObserver.unobserve(form)`) to cleanup the listeners that are no longer being used.

This is the approach being taken in our "Pure HTML + Pure JS" example at the beginning of this document. These steps and the provided code example should give you everything you need to get started.

## Where's My JavaScript Framework?

As you know, JS frameworks are always being created at an incredibly rapid pace; so we can't provide a convenience wrapper for _every_ framework that's out there. However, the steps to create your own convenience functions for the `FormValidityObserver` in your preferred framework are pretty straightforward. Well, the JS logic itself is straightforward. If you're using TypeScript, you will have to do a little bit of type dancing (which we will explain).

We'll walk you through the process by going step-by-step on how we made our `Svelte` integration. As we walk you through this example, we'll be using `TypeScript`. If you're only familiar with JavaScript, you can still follow along. The code we provide below will work in JavaScript if you remove all of the type declarations and type assertions.

### 1&rpar; Create a Function That Will Generate an Augmented `FormValidityObserver`

The first step is easy. Just create a function that instantiates and returns a `FormValidityObserver`. Because this function will only be creating an augmented `FormValidityObserver`, it should accept the same arguments as the class's [constructor](../README.md#constructor-formvalidityobservertypes-options). The return type will be an `interface` that represents the enhanced observer, but we won't add anything to it yet.

```ts
import type { EventType, OneOrMany, ValidatableField, FormValidityObserverOptions } from "@form-observer/core";
import FormValidityObserver from "@form-observer/core/FormValidityObserver";

function createFormValidityObserver<
  T extends OneOrMany<EventType>,
  M = string,
  E extends ValidatableField = ValidatableField,
  R extends boolean = false,
>(types: T, options?: FormValidityObserverOptions<M, E, R>): SvelteFormValidityObserver<M, R> {
  const observer = new FormValidityObserver(types, options) as unknown as SvelteFormValidityObserver<M, R>;
  return observer;
}

interface SvelteFormValidityObserver<M = string, R extends boolean = false>
  extends Omit<FormValidityObserver<M, R>, "configure"> {}
```

Note: Since we will be augmenting the `FormValidityObserver.configure()` method, we are _not_ copying its type definition to the `SvelteFormValidityObserver` interface.

### 2&rpar; Bind All Methods That Aren't Overriden to the Observer Instance (Optional)

**This step is only important if you want to destructure the object created by `createFormValidityObserver`. If you don't care about object destructuring, you can skip this step.** Below is an example of what we mean by object destructuring.

```ts
const { configure, validateFields } = createFormValidityObserver("focusout");
```

In order to ensure that all of the `FormValidityObserver`'s methods function properly when they are destructured, we should [bind](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Function/bind) any methods that we don't override to the observer.

```ts
// Imports ...

function createFormValidityObserver<
  T extends OneOrMany<EventType>,
  M = string,
  E extends ValidatableField = ValidatableField,
  R extends boolean = false,
>(types: T, options?: FormValidityObserverOptions<M, E, R>): SvelteFormValidityObserver<M, R> {
  const observer = new FormValidityObserver(types, options) as unknown as SvelteFormValidityObserver<M, R>;

  /* ---------- Bindings ---------- */
  // Form Observer Methods
  observer.observe = observer.observe.bind(observer);
  observer.unobserve = observer.unobserve.bind(observer);
  observer.disconnect = observer.disconnect.bind(observer);

  // Validation Methods
  observer.validateFields = observer.validateFields.bind(observer);
  observer.validateField = observer.validateField.bind(observer);
  observer.setFieldError = observer.setFieldError.bind(observer);
  observer.clearFieldError = observer.clearFieldError.bind(observer);

  return observer;
}

interface SvelteFormValidityObserver<M = string, R extends boolean = false>
  extends Omit<FormValidityObserver<M, R>, "configure"> {}
```

Note: Because we will be enhancing the `configure` method, we _have not_ attached it to the `observer` object that we return.

### 3&rpar; Create a Utility Function to Automatically Handle Setup and Cleaup (Optional)

In this step, we create a reusable utility function that will enable us to automatically handle the setup and cleanup of the observer that `createFormValidityObserver` generates. Just like the previous step, this step is not mandatory. But the process for accomplishing this step is very easy, as it only requires 2 sub-steps:

1. During the component's "mounting phase", call `observe` with the `HTMLFormElement` of interest. Optionally, you may also apply the [`novalidate`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#novalidate) attribute to the form element during this phase.
2. During the component's "unmounting phase", call `unobserve` (or `disconnect`).

Most JS frameworks create a way for you to accomplish this easily with utility functions. In [`React`](https://react.dev/reference/react-dom/components/common#ref-callback) or [`Vue`](https://vuejs.org/api/built-in-special-attributes.html#ref), you would pass a `ref` callback to an `HTMLFormElement`. In `Svelte`, the idiomatic way to accomplish this is with [`actions`](https://learn.svelte.dev/tutorial/actions):

```ts
import type { EventType, OneOrMany, ValidatableField, FormValidityObserverOptions } from "@form-observer/core";
import FormValidityObserver from "@form-observer/core/FormValidityObserver";
import type { ActionReturn } from "svelte/action";

function createFormValidityObserver<
  T extends OneOrMany<EventType>,
  M = string,
  E extends ValidatableField = ValidatableField,
  R extends boolean = false,
>(types: T, options?: FormValidityObserverOptions<M, E, R>): SvelteFormValidityObserver<M, R> {
  const observer = new FormValidityObserver(types, options) as unknown as SvelteFormValidityObserver<M, R>;

  /* ---------- Bindings ---------- */
  // Apply all bindings...

  /* ---------- Enhancements ---------- */
  observer.autoObserve = (form, novalidate = true) => {
    observer.observe(form);
    if (novalidate) form.setAttribute("novalidate", "");

    return {
      destroy() {
        observer.unobserve(form);
      },
    };
  };

  return observer;
}

interface SvelteFormValidityObserver<M = string, R extends boolean = false>
  extends Omit<FormValidityObserver<M, R>, "configure"> {
  autoObserve(form: HTMLFormElement, novalidate?: boolean): ActionReturn;
}
```

Now, instead of doing something verbose like this:

```svelte
<form bind:this={form}>
  <!-- Other Elements-->
</form>

<script>
  import { onMount } from "svelte";
  import { createFormValidityObserver } from "@form-observer/svelte";

  let form;
  const observer = createFormValidityObserver("focusout");
  onMount(() => {
    observer.observe(form);
    return () => observer.disconnect();
  });
</script>
```

We can simply do this:

```svelte
<form use:autoObserve>
  <!-- Other Elements-->
</form>

<script>
  import { createFormValidityObserver } from "@form-observer/svelte";
  const { autoObserve } = createFormValidityObserver("focusout");
</script>
```

Note: Because we now have the `autoObserve` utility, the exposed `observe`, `unobserve`, and `disconnect` methods become unnecessary in most circumstances. If you're creating your own utility function, you can feel free to delete those methods from the observer that you expose and update the `SvelteFormValidityObserver` interface to [`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys) them.

Because we promise a consistent API between the pure JS version of our package and the framework integrations for our package, we do not remove these methods from `@form-observer/svelte` (or our other integrations). However, you are free from such constraints.

In this example, we added the `novalidate` option to the `autoObserve` action to help with displaying accessible error messages to our users. If you're unfamiliar with the significance of this attribute, see [_Enabling Accessible Error Messages during Form Submissions_](../guides.md#enabling-accessible-error-messages-during-form-submissions) for more details.

### 4&rpar; Create an Enhanced Version of the `configure` Method

This is the most involved part of the process, though it still isn't too complicated. Here, we want to enhance the `FormValidityObserver.configure` method so that we can configure a field's constraints _and_ its error messages whenever `configure` is called. You can accomplish this in any way you please. We use [`React Hook Form`'s model](https://react-hook-form.com/docs/useform/register#options) because we believe it's intuitive and the most flexible.

With this model, we can write something like the following to configure a field's contraints and error messages:

```jsx
<input {...configure("amount", { pattern: { value: "\\d+", message: "Number is invalid" } })} />
```

The benefit of this approach, as we mentioned earlier, is that our configuration for the form field is collocated with the markup for that field. This approach works perfectly whether the field is client-rendered or server-rendered. Ideally, our API should also support raw constraint values if the developer wants to use the browser's default error message(s) for some constraint(s).

```jsx
<input {...configure("email", { type: { value: "email", message: "Invalid Email" }, required: true })} />
```

Of course, as with the core `FormValidityObserver`, calls to `configure` can be skipped if the developer is _only_ using the using the configured [`defaultErrors`](../README.md#form-validity-observer-options-default-errors) and/or the browser's default error messages:

```html
<input name="email" type="email" required />
```

Note: Our `configure` method should _not_ support adding an error `message` for a constraint without the constraint's `value`. This is because the error message would never get used in that scenario.

Now that we've specified all of the requirements, let's implement this functionality. First off, we'll update the `SvelteFormValidityObserver` interface. Some new TypeScript types will have to be added here. If you're only using JavaScript, you can skip this part. :&rpar;

#### Adding the TypeScript Types for `configure`

```ts
import type {
  EventType,
  OneOrMany,
  ErrorMessage,
  ValidationErrors,
  ValidatableField,
  FormValidityObserverOptions,
} from "@form-observer/core";
import FormValidityObserver from "@form-observer/core/FormValidityObserver";
import type { Action } from "svelte/action";
import type { HTMLInputAttributes } from "svelte/elements";

// Definition of `createFormValidityObserver` ...

interface SvelteFormValidityObserver<M = string, R extends boolean = false>
  extends Omit<FormValidityObserver<M, R>, "configure"> {
  // Augments `FormValidityObserver.configure()`
  configure<E extends ValidatableField>(name: string, errorMessages: SvelteValidationErrors<M, E, R>): SvelteFieldProps;
  autoObserve(form: HTMLFormElement, novalidate?: boolean): ActionReturn;
}

// Augmented return type of `configure`
type SvelteFieldProps = Pick<
  HTMLInputAttributes,
  "name" | "required" | "minlength" | "min" | "maxlength" | "max" | "step" | "type" | "pattern"
>;

// Augments `ValidationErrors` type
export interface SvelteValidationErrors<M, E extends ValidatableField = ValidatableField, R extends boolean = false>
  extends Pick<ValidationErrors<M, E, R>, "badinput" | "validate"> {
  required?:
    | SvelteErrorDetails<M, HTMLInputAttributes["required"], E, R>
    | ErrorMessage<R extends true ? M : string, E>;
  minlength?: SvelteErrorDetails<M, HTMLInputAttributes["minlength"], E, R>;
  min?: SvelteErrorDetails<M, HTMLInputAttributes["min"], E, R>;
  maxlength?: SvelteErrorDetails<M, HTMLInputAttributes["maxlength"], E, R>;
  max?: SvelteErrorDetails<M, HTMLInputAttributes["max"], E, R>;
  step?: SvelteErrorDetails<M, HTMLInputAttributes["step"], E, R>;
  type?: SvelteErrorDetails<M, HTMLInputAttributes["type"], E, R>;
  pattern?: SvelteErrorDetails<M, HTMLInputAttributes["pattern"], E, R>;
}

// Augments `ErrorDetails` type
type SvelteErrorDetails<M, V, E extends ValidatableField = ValidatableField, R extends boolean = false> =
  | V
  | (R extends true
      ?
          | { render?: true; message: ErrorMessage<M, E>; value: V }
          | { render: false; message: ErrorMessage<string, E>; value: V }
      :
          | { render: true; message: ErrorMessage<M, E>; value: V }
          | { render?: false; message: ErrorMessage<string, E>; value: V });
```

You don't have to understand what these types do to use them. But if you're interested in understanding what's happening here, let's walk you through what we did.

##### Enhancing the Parameter Types for `configure`

Our `configure` method has changed the type of the `errorMessages` argument from `ValidationErrors` to `SvelteValidationErrors` so that we can configure a field's constraints and error messages simultaneously. The type that enables us to support this feature is `SvelteErrorDetails`.

`SvelteErrorDetails` is _almost_ the exact same type as [`ErrorDetails`](../types.md#errordetailsm-e-r). There are only two differences between `SvelteErrorDetails` and `ErrorDetails`:

<ol>
  <li>
    <p>
      When using the <code>object</code> syntax, <code>SvelteErrorDetails</code> now requires a constraint <code>value</code> property to be added to the object. This is an <em>enhancement</em> of the <code>ErrorDetails</code> type.
    </p>
    <p>
      Whenever an object is used for <code>SvelteErrorDetails</code>, developers will be able to specify a field's constraint alongside the error message for that constraint.
    </p>
  </li>
  <li>
    <p>
      When an object is <em>not</em> being used, <code>SvelteErrorDetails</code> details replaces <code>ErrorMessage</code> with <code>V</code>, where <code>V</code> represents the value of the constraint. This is an <em>alteration</em> of the <code>ErrorDetails</code> type.
    </p>
    <p>
      Whenever a raw value is used for <code>SvelteErrorDetails</code>, developers will be able to specify a field's constraint <em>without</em> providing the error message for that constraint. In this scenario, the browser's default error message (or the configured <a href="../README.md#form-validity-observer-options-default-errors">default error</a>) will be used for that constraint instead. Since it does not make sense to provide an error message without a constraint value,  the <code>SvelteErrorDetails</code> type does not support that "use case".
    </p>
  </li>
</ol>

Just as the `ErrorDetails` type forms the foundation of the [`ValidationErrors`](../types.md#validationerrorsm-e-r) type, so the `SvelteErrorDetails` type forms the foundation of the `SvelteValidationErrors` type. The type definition for `SvelteValidationErrors` is _almost_ the exact same as the type definition for `ValidationErrors`. In fact, the `badinput` and `validate` properties are exactly the same between the 2.

The primary way in which the `SvelteValidationErrors` type differs from the `ValidationErrors` type is that it takes constraint values into account (with the help of `SvelteErrorDetails`). It determines the value types that each constraint supports by looking at `Svelte`'s type definition for the `input` field's props (i.e., `HTMLInputAttributes`). (**Note: If you're using a different JS framework, you should use _that_ framework's type definitions for the `input` field's props instead.**)

Notice that the `required` constraint is slightly different from the others in that it supports one additional type: [`ErrorMessage`](../types.md#errormessagem-e). If the developer supplies an error message by itself for the `required` constraint, it is safe to assume that `required` is `true`. This is an assumption that can only be made safely with the `required` constraint because it is a `boolean`.

##### Enhancing the Return Type of `configure`

This explanation is a lot simpler. The `configure` function should return the correct props based on the arguments that it received. This would mean that it should return a `name` prop (based on the first argument to `configure`) along with any necessary constraint value props (based on the second argument to `configure`). Deriving this type is very easy. Simply take your framework's "Input Props Type" and extract only the properties you need. In Svelte, this looks like the following:

```ts
type SvelteFieldProps = Pick<
  HTMLInputAttributes,
  "name" | "required" | "minlength" | "min" | "maxlength" | "max" | "step" | "type" | "pattern"
>;
```

And we make _this_ the return type of `configure`:

```ts
interface SvelteFormValidityObserver<M = string, R extends boolean = false>
  extends Omit<FormValidityObserver<M, R>, "configure"> {
  configure<E extends ValidatableField>(name: string, errorMessages: SvelteValidationErrors<M, E, R>): SvelteFieldProps;
  autoObserve(form: HTMLFormElement, novalidate?: boolean): ActionReturn;
}
```

#### Adding the New Logic for `configure`

The hardest part of this process is defining the TypeScript types. With that out of the way, we can focus on the actual implementation for our augmented `configure` function:

(Note: If you encounter TypeScript type errors with the code below, we will address it soon.)

```ts
// Imports ...

export default function createFormValidityObserver<
  T extends OneOrMany<EventType>,
  M = string,
  E extends ValidatableField = ValidatableField,
  R extends boolean = false,
>(types: T, options?: FormValidityObserverOptions<M, E, R>): SvelteFormValidityObserver<M, R> {
  const observer = new FormValidityObserver(types, options) as unknown as SvelteFormValidityObserver<M, R>;

  /* ---------- Bindings ---------- */
  // Apply bindings for exposed methods ...

  /** **Private** reference to the original {@link FormValidityObserver.configure} method */
  const originalConfigure = observer.configure.bind(observer) as FormValidityObserver<M, R>["configure"];

  /* ---------- Enhancements ---------- */
  // Definition for `autoObserver` ...

  // Enhanced `configure` method
  observer.configure = (name, errorMessages) => {
    const keys = Object.keys(errorMessages) as Array<keyof SvelteValidationErrors<M, ValidatableField, R>>;
    const props = { name } as SvelteFieldProps;
    const config = {} as ValidationErrors<M, ValidatableField, R>;

    // Build `props` object and error `config` object from `errorMessages`
    for (let i = 0; i < keys.length; i++) {
      const constraint = keys[i];

      // Constraint Was Omitted
      if (errorMessages[constraint] == null) continue;
      if (constraint === "required" && errorMessages[constraint] === false) continue;

      /* ----- Custom Validation Properties ----- */
      if (constraint === "badinput" || constraint === "validate") {
        config[constraint] = errorMessages[constraint];
        continue;
      }

      /* ----- Standrd HTML Attributes ----- */
      // Value Only
      if (typeof errorMessages[constraint] !== "object" || !("message" in errorMessages[constraint])) {
        if (constraint === "required" && typeof errorMessages[constraint] !== "boolean") {
          config[constraint] = errorMessages[constraint];
        }

        props[constraint] = constraint === "required" ? true : errorMessages[constraint];
        continue;
      }

      // Value and Message
      if (constraint === "required" && errorMessages[constraint].value === false) continue;
      props[constraint] = errorMessages[constraint].value;
      config[constraint] = errorMessages[constraint];
    }

    originalConfigure(name, config);
    return props;
  };

  return observer;
}

// Type Definitions ...
```

If you're encountering TypeScript errors with the code above, we'll address that soon. Let's focus on what the logic is doing first.

Here in `configure`, we're looping over each of the properties provided in the `errorMessages` object so that we can A&rpar; Derive the error configuration that needs to be passed to the _original_ `FormValidityObserver.configure()` method, and B&rpar; Derive the field props that need to be returned from the _enhanced_ `configure` method. Hopefully, from the code and the comments, it's clear why the code is written as it is. But in case things aren't clear, here's a summary:

1. If the constraint _value_ is `null` or `undefined`, then the constraint was omitted by the developer. There is nothing to add to the local error `config` or the returned constraint `props`. A `required` constraint with a value of `false` is treated as if it was `undefined`.
2. If the _constraint_ is `badinput` or `validate`, then its _value_ can be copied directly to the error `config`. There are no `props` to update here since `badinput` and `validate` are not valid HTML attributes.
3. If the constraint _value_ is not a `SvelteErrorDetails` object, then we can assume that we have a raw constraint value. (For instance, we could have a raw `number` value for the `max` constraint.) The developer has indicated that they want to specify a field constraint without a custom error message; so only the constraint `props` are updated. <p>The exception to this rule is the `required` constraint. If the _constraint_ is `required` **and** the constraint _value_ is an `ErrorMessage`, then we assign this value to the error `config` instead of the `props` object. In this scenario, the _value_ for the `required` constraint is implicitly `true` (even if the value is an empty string).</p>
4. If the constraint _value_ is a `SvelteErrorDetails` object (determined by the existence of a `message` property in the object), then we can give the `value` property on this object to the `props` object. For simplicity, the error `config` can be given the entire constraint object in this scenario, even though it won't use the attached `value` property. Notice also that here, yet again, a `required` constraint with a value of `false` is treated as if the constraint was `undefined`.

After we finish looping over the properties in `errorMessages`, we configure the error messages for the field by calling the _core_ `FormValidityObserver.configure()` method with the error `config` object. Finally, we return any necessary form field `props`.

##### What's up with the TypeScript Errors?

**Note: If you're only using JavaScript (or you don't care about TS types), you can skip this part.**

If you've been following along using TypeScript, then you probably encountered a good number of errors within the `for` loop. To get a better idea of where the errors are coming from, let's consider this chunk of code:

```ts
if (constraint === "badinput" || constraint === "validate") {
  config[constraint] = errorMessages[constraint];
  continue;
}
```

When TypeScript sees `errorMessages[constraint]`, it sees `errorMessages["badinput" | "validate"]`, which narrows down to a _union_ between the `badinput` configuration and the `validate` configuration. Unfortunately, this union cannot safely be applied to the error `config` object -- as far as TypeScript is concerned. For instance, TypeScript cannot assign `errorMessages.validate` to `config.badinput` because the 2 types are incompatible. And although we know that this scenario will never come up in this code block, _TypeScript does not_. So it throws an error. In some way or another, this is the same problem that's happening in every other part of the `for` loop where you're seeing a TypeScript error.

A simple solution to this problem to help TypeScript is to narrow down each individual constraint

```ts
if (constraint === "badinput") {
  config[constraint] = errorMessages[constraint];
  continue;
}

if (constraint === "validate") {
  config[constraint] = errorMessages[constraint];
  continue;
}
```

However, this approach is unnecessarily redundant, and the redundancy gets much worse when we get to the raw HTML attributes. Such redundancy would make the code harder to maintain and increase the bundle size of our application; so being a TypeScript purist is _not_ worthwhile here.

The next alternative is to use `@ts-expect-error` at every location where TypeScript complains. This keeps the bundle size of our application intact, but it _also_ makes the code more difficult to read.

If we want to keep our code readable, then the next best solution is to use `any`. Yep, I know. The purist in me hates it too. But for the sake of readability, it's probably the best thing that we've got. The `any` type was designed for rare cases like these where JavaScript knows what TypeScript can never know. So let's update what we have:

```ts
observer.configure = (name, errorMessages) => {
  const keys = Object.keys(errorMessages) as Array<keyof SvelteValidationErrors<M, ValidatableField, R>>;
  const props = { name } as SvelteFieldProps;
  const config = {} as ValidationErrors<M, ValidatableField, R>;

  // Build `props` object and error `config` object from `errorMessages`
  for (let i = 0; i < keys.length; i++) {
    const constraint = keys[i];
    const constraintValue = errorMessages[constraint] as any;

    // Constraint Was Omitted
    if (constraintValue == null) continue;
    if (constraint === "required" && constraintValue === false) continue;

    /* ----- Custom Validation Properties ----- */
    if (constraint === "badinput" || constraint === "validate") {
      config[constraint] = constraintValue;
      continue;
    }

    /* ----- Standrd HTML Attributes ----- */
    // Value Only
    if (typeof constraintValue !== "object" || !("message" in constraintValue)) {
      if (constraint === "required" && typeof constraintValue !== "boolean") config[constraint] = constraintValue;
      props[constraint] = constraint === "required" ? true : constraintValue;
      continue;
    }

    // Value and Message
    if (constraint === "required" && constraintValue.value === false) continue;
    props[constraint] = constraintValue.value;
    config[constraint] = constraintValue;
  }

  originalConfigure(name, config);
  return props;
};
```

##### Handling Mismatched Constraint Properties

If your framework behaves unorthodoxically by using JS properties for the form field `props` instead of HTML attributes, then you will have to create an object that maps HTML attributes to JS properties for this function. But that update is easy to do. The only framework that we currently know would cause this problem is `React`. You can look at our code for the [`@form-observer/react`](https://github.com/enthusiastic-js/form-observer/tree/main/packages/react) package to see how we handle that issue.

`Svelte`, like many other frameworks, does not have this issue; so no additional code is necessary here.

### 5&rpar; Enjoy Your New `createFormValidityObserver` Utility Function!

And that's it! I'm sure all of that was straightforward for those of you who only use JS. For those of you who use TypeScript, I hope that the 4th step wasn't too daunting. Regardless, you now have the power to enhance the `FormValidityObserver` according to your needs.
