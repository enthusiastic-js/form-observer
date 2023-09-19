# React + Form Validity Observer

A _convenience_ API for reducing code repetition in a [React](https://react.dev/) application using the [`FormValidityObserver`](../README.md).

Utilities:

- [`createFormValidityObserver`](#function-createformvalidityobservertypes-options)
- [`useFormValidityObserver`](#custom-hook-useformvalidityobservertypes-options)

Additional Topics:

- [`Usage with Class Components`](#usage-with-class-components)

## Function: `createFormValidityObserver(types, options)`

Creates an enhanced version of the `FormValidityObserver`, known as the `ReactFormValidityObserver`. It accepts the exact same arguments as the [`FormValidityObserver`'s constructor](../README.md#constructor-formvalidityobservertypes-options).

This function acts as the foundation for the [`useFormValidityObserver`](#custom-hook-useformvalidityobservertypes-options) hook. For those using class components, you can use `createFormValidityObserver` directly.

### Return Type: `ReactFormValidityObserver<M>`

An enhanced version of the `FormValidityObserver`, designed specifically for React applications. It has the same Type Parameters as the `FormValidityObserver`. As with the `FormValidityObserver`, the type of `M` is derived from the [`renderer`](../README.md#form-validity-observer-options-renderer) option.

#### Copied Methods

The following methods on the `ReactFormValidityObserver` are the exact same as the methods on the `FormValidityObserver`. These methods are [bound](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Function/bind) to the observer instance to allow for safe [object destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#object_destructuring):

- [`observe(form)`](../README.md#method-formvalidityobserverobserveform-htmlformelement-boolean)
- [`unobserve(form)`](../README.md#method-formvalidityobserverunobserveform-htmlformelement-boolean)
- [`disconnect()`](../README.md#method-formvalidityobserverdisconnect-void)
- [`validateFields(options)`](../README.md#method-formvalidityobservervalidatefieldsoptions-validatefieldsoptions-boolean--promiseboolean)
- [`validateField(name, options)`](../README.md#method-formvalidityobservervalidatefieldname-string-options-validatefieldoptions-boolean--promiseboolean)
- [`setFieldError(name, message, render)`](../README.md#method-formvalidityobserversetfielderrorname-string-message-errormessagestringerrormessagem-render-boolean-void)
- [`clearFieldError(name)`](../README.md#method-formvalidityobserverclearfielderrorname-string-void)

#### Function: `autoObserve(): (formRef: HTMLFormElement) => void`

A "[React Action](https://thomason-isaiah.medium.com/do-you-really-need-react-state-to-format-inputs-9d17f5f837fd?source=user_profile---------0----------------------------)" used to simplify the process of setting up and cleaning up a form's `FormValidityObserver`.

> Note: If you use this `action`, you should **not** need to call `observe`, `unobserve`, or `disconnect` directly.

**Example**

```tsx
import { createFormValidityObserver } from "@form-observer/react";

function MyForm() {
  const { autoObserve } = createFormValidityObserver("focusout");
  return <form ref={autoObserve()}>{/* Other Elements */}</form>;
}
```

#### Function: `configure(name: string, errorMessages: ReactValidationErrors<M>): ReactFieldProps`

An enhanced version of [`FormValidityObserver.configure`](../README.md#method-formvalidityobserverconfigurename-string-errormessages-validationerrorsm-void) for `React`. In addition to configuring a field's error messages, it generates the props that should be applied to the field based on the provided arguments.

> Note: If the field is _only_ using the browser's default error messages, it does _not_ need to be `configure`d.

The `ReactValidationErrors<M>` type is an enhanced version of the core [`ValidationErrors<M>`](../types.md#validationerrorsm) type. Here is how `ReactValidationErrors` compares to `ValidationErrors`.

##### Properties That Mimic the `ValidationErrors` Properties

The following properties on the `ReactValidationErrors` type _accept the exact same values_ as the corresponding properties on `ValidationErrors` type.

- `badinput`
- `validate`

**Example**

```tsx
import { createFormValidityObserver } from "@form-observer/react";

function MyForm() {
  const { autoObserve, configure } = createFormValidityObserver("focusout");

  function validateConfirmPassword(field: HTMLInputElement): string | void {
    const password = field.form?.elements.namedItem("password") as HTMLInputElement;
    return field.value === password.value ? undefined : "Passwords do not match.";
  }

  async function validateNewUsername(field: HTMLInputElement): Promise<string | void> {
    const response = await fetch("/api/username-exists", { body: field.value });
    const usernameTaken = await response.text();
    return usernameTaken === String(true) ? "Username is already taken" : undefined;
  }

  return (
    <form ref={autoObserve()}>
      {/* Note: Accessible <label>s and error containers were omitted from this example. */}
      <input {...configure("username", { validate: validateNewUsername })} />
      <input name="password" type="password" />
      <input {...configure("confirm-password", { validate: validateConfirmPassword })} />

      <input type="date" {...configure("date", { badinput: "Please provide a valid date." })} />
    </form>
  );
}
```

##### Properties That _Enhance_ the `ValidationErrors` Properties

All the other properties on the `ReactValidationErrors` type are enhancements of the corresponding properties on the `ValidationErrors` type, so they follow slightly different rules. For clarity, these "other properties" are:

- `required`
- `minlength`
- `min`
- `maxlength`
- `max`
- `step`
- `type`
- `pattern`

The rules are as follows:

1&rpar; When a constraint is configured with an [`ErrorDetails`](../types.md#errordetailsm) object, the object must include a `value` property specifying the value of the constraint. In this scenario, both the field's constraint value _and_ its error message are configured.

```tsx
import { createFormValidityObserver } from "@form-observer/react";
import type { FormField } from "@form-observer/react";

function MyForm() {
  const { autoObserve, configure } = createFormValidityObserver("focusout");
  const requiredField = (field: FormField) => `<p>${field.labels[0]?.textContent ?? "Field"} is required.</p>`;

  return (
    <form ref={autoObserve()}>
      {/* Note: Accessible <label>s and error containers were omitted from this example. */}
      <input {...configure("name", { required: { value: true, message: requiredField, render: true } })} />
      <input {...configure("email", { type: { value: "email", message: "Email is invalid", render: false } })} />
      <input
        {...configure("comment", { maxlength: { value: 80, message: "Comment must be 80 characters or less" } })}
      />
    </form>
  );
}
```

**Note: A constraint can only be configured with an error message when you use the object syntax.** The exception to this rule is the `required` constraint, which allows you to _imply_ a value of `true` when you supply an error message value directly to the constraint.

```tsx
import { createFormValidityObserver } from "@form-observer/react";
import type { FormField } from "@form-observer/react";

function MyForm() {
  const { autoObserve, configure } = createFormValidityObserver("focusout");
  const requiredField = (field: FormField) => `${field.labels[0]?.textContent ?? "Field"} is required.`;

  return (
    <form ref={autoObserve()}>
      {/* Note: Accessible <label>s and error containers were omitted from this example. */}
      <input {...configure("first-name", { required: requiredField })} />
      <input {...configure("last-name", { required: "Don't ignore me..." })} />
      <input {...configure("email", { required: { value: true, message: requiredField } })} />
    </form>
  );
}
```

2&rpar; When a constraint is configured with a [primitive value](https://developer.mozilla.org/en-US/docs/Glossary/Primitive), then _only_ the field's constraint value is configured. When the constraint is broken, the browser's default error message for that constraint will be displayed.

This syntax only exists for convenience. You are free to use the regular HTML attributes instead if you like.

```tsx
import { createFormValidityObserver } from "@form-observer/react";
import type { FormField } from "@form-observer/react";

function MyForm() {
  const { autoObserve, configure } = createFormValidityObserver("focusout");
  const requiredField = (field: FormField) => `${field.labels[0]?.textContent ?? "Field"} is required.`;

  return (
    <form use:autoObserve>
      {/* Note: Accessible <label>s and error containers were omitted from this example. */}
      <input {...configure("email-1", { required: requiredField, type: "email" })} />
      <input {...configure("email-2", { required: requiredField })} type="email" />
      <input name="email-3" type="email" required />
    </form>
  );
}
```

#### The `ReactFieldProps` Return Type of `configure`

The return type of `configure` is simply an object containing the props that should be applied to the configured field. In addition to the field's `name`, this object will include any validation props that were configured by the function (e.g., `required`, `minLength`, `maxLength`, `pattern`, etc.).

## Custom Hook: `useFormValidityObserver(types, options)`

A custom React Hook that creates an enhanced version of the `FormValidityObserver` and [memoizes](https://react.dev/reference/react/useMemo) its value.

```tsx
import { useFormValidityObserver } from "@form-observer/react";

function MyForm() {
  const { autoObserve, configure } = useFormValidityObserver("focusout");

  return (
    <form ref={autoObserve()}>
      <input {...configure("first-name", { required: "We need to know who you are!" })} />
    </form>
  );
}
```

The purpose of the memoization is two-fold:

1. When the component employing `useFormValidityObserver` re-renders (whether due to state changes or prop updates), the memoization prevents the observer from being re-created/reset. (This is likely not a practical concern if `configure` is only used inside your component's returned JSX.)
2. When the outputs of `useFormValidityObserver` are passed to a child component, the memoization prevents unnecessary re-renders in React that are caused by reference inequalities between similar objects. Similarly, this memoization will also prevent hooks that have dependencies on these outputs from unnecessarily re-running.

If you don't need to worry about these scenarios, then you are free to use [`createFormValidityObserver`](#function-createformvalidityobservertypes-options) instead; it will give you the exact same result (unmemoized). If you _do_ need to worry about these scenarios, then bear in mind that **the observer will be recreated whenever the arguments to the hook change, whether by value _or_ by reference**.

Note that this is a very small hook created solely for your convenience. If you want, you can use `useMemo` directly to wrap any calls to `createFormValidityObserver` instead. For more details on memoization, see React's documentation on [`useMemo`](https://react.dev/reference/react/useMemo) and [`memo`](https://react.dev/reference/react/memo). You can also read [_When to useMemo and useCallback_](https://kentcdodds.com/blog/usememo-and-usecallback) by Kent C. Dodds.

## Usage with Class Components

We understand that not everyone has bought into the hype surrounding React Hooks + Functional Components. There also may be some of you who would _like_ to use hooks but are required to use class components due to practical business constraints. So we intentionally designed the `createFormValidityObserver` utility to work with _both_ class components _and_ functional components. The process that you'll use to get things running is similar to what you'd do with any other kind of observer:

1. Create the observer (using `createFormValidityObserver`) and give your class a reference to it. (We recommend making this reference [private](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields).)
2. Observe the form during the mounting phase of your component.
3. Unobserve the form during the unmounting phase of your component.

There are two ways to go about this. The first is to do all 3 steps manually. This approach is a bit more verbose:

```tsx
import { Component, createRef } from "react";
import { createFormValidityObserver } from "@form-observer/react";

class MyForm extends Component {
  readonly #form = createRef<HTMLFormElement>();
  readonly #observer = createFormValidityObserver("focusout");

  componentDidMount() {
    this.#observer.observe(this.#form.current as HTMLFormElement);
  }

  componentWillUnmount() {
    this.#observer.disconnect();
  }

  render() {
    const { configure } = this.#observer;

    return (
      <form ref={this.#form}>
        <input {...configure("first-name", { required: "We need to know who you are!" })} />
      </form>
    );
  }
}
```

The second approach is to automate the observer's setup and cleanup with [`autoObserve`](#function-autoobserve-formref-htmlformelement--void):

```tsx
import { Component } from "react";
import { createFormValidityObserver } from "@form-observer/react";

class MyForm extends Component {
  readonly #observer = createFormValidityObserver("focusout");

  render() {
    const { autoObserve, configure } = this.#observer;

    return (
      <form ref={autoObserve()}>
        <input {...configure("first-name", { required: "We need to know who you are!" })} />
      </form>
    );
  }
}
```

This simplified approach enables you to avoid using (or cluttering) the `componentDidMount` and `componentWillUnmount` methods of your class components, resulting in fewer lines of code.

For those concerned about memoization, note that as long as the observer is created only once (i.e., during the class's construction only), memoization is not a concern for class components.
