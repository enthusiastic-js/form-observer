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
- [`setFieldError(name, message, render)`](../README.md#method-formvalidityobserversetfielderrorename-string-message-errormessagestring-eerrormessagem-e-render-boolean-void)
- [`clearFieldError(name)`](../README.md#method-formvalidityobserverclearfielderrorname-string-void)

#### Function: `autoObserve(novalidate?: boolean): (formRef: HTMLFormElement | null) => void`

A "[React Action](https://thomason-isaiah.medium.com/do-you-really-need-react-state-to-format-inputs-9d17f5f837fd?source=user_profile---------0----------------------------)" used to simplify the process of setting up and cleaning up a form's `FormValidityObserver`. It does this by calling [`observe`](../README.md#method-formvalidityobserverobserveform-htmlformelement-boolean) and [`unobserve`](../README.md#method-formvalidityobserverunobserveform-htmlformelement-boolean) automatically with the form on which it is used.

The `novalidate` parameter indicates that the [novalidate](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#novalidate) attribute should be applied to the `form` element when JavaScript is available to the client. By default, its value is `true`. (For details on why this attribute is significant, see [_Enabling Accessible Error Messages during Form Submissions_](../guides.md#enabling-accessible-error-messages-during-form-submissions).)

> Note: If you use this `action`, you should **not** need to call `observe`, `unobserve`, or `disconnect` directly.

**Example**

```tsx
import { Component } from "react";
import { createFormValidityObserver } from "@form-observer/react";

// Function Components
function MyFormFunction() {
  const { autoObserve } = createFormValidityObserver("focusout");
  return <form ref={autoObserve()}>{/* Other Elements */}</form>;
}

// Class Components
class MyFormClass extends Component {
  #observer = createFormValidityObserver("focusout");
  render() {
    const { autoObserve } = this.#observer;
    return <form ref={autoObserve()}>{/* Other Elements */}</form>;
  }
}
```

Due to React's unique re-rendering system, if you're using the `autoObserve` utility in a component that is expected to re-render, then you might need to memoize its returned `ref` callback to have consistent results. In functional components, you can memoize the callback with `useMemo` (or `useCallback`). In class components, you can effectively "memoize" the callback by assigning it to the class instance during its instantiation.

```tsx
import { useMemo, Component } from "react";
import { createFormValidityObserver } from "@form-observer/react";

function MyFormFunction() {
  const { autoObserve } = useMemo(() => createFormValidityObserver("focusout"), []);
  const formRef = useMemo(autoObserve, [autoObserve]);
  // or formRef = useCallback(() => autoObserve(), [autoObserve]);
  return <form ref={formRef}>{/* Other Elements */}</form>;
}

class MyFormClass extends Component {
  #observer = createFormValidityObserver("focusout");
  #formRef = this.#observer.autoObserve();
  render() {
    return <form ref={this.#formRef}>{/* Other Elements */}</form>;
  }
}
```

Remember that `autoObserve` is simply a convenience utility for calling `observe` and `unobserve` automatically. You're free to setup and teardown the `FormValidityObserver` manually if you prefer.

#### Function: `configure<E>(name: string, errorMessages: ReactValidationErrors<M, E>): ReactFieldProps`

An enhanced version of [`FormValidityObserver.configure`](../README.md#method-formvalidityobserverconfigureename-string-errormessages-validationerrorsm-e-void) for `React`. In addition to configuring a field's error messages, it generates the props that should be applied to the field based on the provided arguments.

> Note: If the field is _only_ using the configured [`defaultErrors`](../README.md#form-validity-observer-options-default-errors) and/or the browser's default error messages, it _does not_ need to be `configure`d.

The `ReactValidationErrors<M, E>` type is an enhanced version of the core [`ValidationErrors<M, E>`](../types.md#validationerrorsm-e) type. Here is how `ReactValidationErrors` compares to `ValidationErrors`.

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

1&rpar; When a constraint is configured with an [`ErrorDetails`](../types.md#errordetailsm-e) object, the object must include a `value` property specifying the value of the constraint. In this scenario, both the field's constraint value _and_ its error message are configured.

```tsx
import { createFormValidityObserver } from "@form-observer/react";
import type { ValidatableField } from "@form-observer/react";

function MyForm() {
  const { autoObserve, configure } = createFormValidityObserver("focusout");
  const requiredField = (field: ValidatableField) => `<p>${field.labels[0]?.textContent ?? "Field"} is required.</p>`;

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
import type { ValidatableField } from "@form-observer/react";

function MyForm() {
  const { autoObserve, configure } = createFormValidityObserver("focusout");
  const requiredField = (field: ValidatableField) => `${field.labels[0]?.textContent ?? "Field"} is required.`;

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
import type { ValidatableField } from "@form-observer/react";

function MyForm() {
  const { autoObserve, configure } = createFormValidityObserver("focusout");
  const requiredField = (field: ValidatableField) => `${field.labels[0]?.textContent ?? "Field"} is required.`;

  return (
    <form ref={autoObserve()}>
      {/* Note: Accessible <label>s and error containers were omitted from this example. */}
      <input {...configure("email-1", { required: requiredField, type: "email" })} />
      <input {...configure("email-2", { required: requiredField })} type="email" />
      <input name="email-3" type="email" required />
    </form>
  );
}
```

##### The `ReactFieldProps` Return Type of `configure`

The return type of `configure` is simply an object containing the props that should be applied to the configured field. In addition to the field's `name`, this object will include any validation props that were configured by the function (e.g., `required`, `minLength`, `maxLength`, `pattern`, etc.).

## Custom Hook: `useFormValidityObserver(types, options)`

A custom React Hook that creates an enhanced version of the `FormValidityObserver` and [memoizes](https://react.dev/reference/react/useMemo) its value.

```tsx
import { useMemo } from "react";
import { useFormValidityObserver } from "@form-observer/react";

function MyForm() {
  const { autoObserve, configure } = useFormValidityObserver("focusout");

  return (
    // If your component does not re-render, you don't need to memoize `autoObserve`'s return value.
    <form ref={useMemo(autoObserve, [autoObserve])}>
      <input {...configure("first-name", { required: "We need to know who you are!" })} />
    </form>
  );
}
```

The purpose of the memoization is two-fold:

1. When the component employing `useFormValidityObserver` re-renders (whether due to state changes or prop updates), the memoization prevents the observer from being re-created/reset. (This is likely not a practical concern if `configure` is only used inside your component's returned JSX.)
2. Because the outputs of `useFormValidityObserver` are memoized, they won't cause unnecessary re-renders in [memoized children](https://react.dev/reference/react/memo), nor will they cause or unnecessary function re-runs in hooks that depend on them (such as `useEffect`, `useCallback`, and custom hooks that have dependency arrays).

If you don't need to worry about these scenarios, then you are free to use [`createFormValidityObserver`](#function-createformvalidityobservertypes-options) instead; it will give you the exact same result (unmemoized). If you _do_ need to worry about these scenarios, then bear in mind that **the observer will be recreated whenever the arguments to the hook change, whether by value _or_ by reference**.

Note that this is a very small hook created solely for your convenience. If you want, you can use `useMemo` directly to wrap any calls to `createFormValidityObserver` instead. For more details on memoization, see React's documentation on [`useMemo`](https://react.dev/reference/react/useMemo) and [`memo`](https://react.dev/reference/react/memo). You can also read [_When to useMemo and useCallback_](https://kentcdodds.com/blog/usememo-and-usecallback) by Kent C. Dodds.

## Usage with Class Components

We understand that not everyone has bought into the hype surrounding React Hooks + Functional Components. There also may be some of you who would _like_ to use hooks but are required to use class components due to practical business constraints. So we intentionally designed `createFormValidityObserver` to work with _both_ class components _and_ functional components. The process that you'll use to get things running is similar to the process that you would use with any other kind of observer:

1. Create the observer (using `createFormValidityObserver`) and give your class a reference to it. (We recommend making this reference [private](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields).)
2. Observe the form during the mounting phase of your component. (Optionally, you may also apply the [`novalidate`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#novalidate) attribute to the form element during this phase.)
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
    this.#form.current?.setAttribute("novalidate", ""); // Optional
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

The second approach is to automate the observer's setup and cleanup with [`autoObserve`](#function-autoobservenovalidate-boolean-formref-htmlformelement--null--void):

```tsx
import { Component } from "react";
import { createFormValidityObserver } from "@form-observer/react";

class MyForm extends Component {
  readonly #observer = createFormValidityObserver("focusout");
  readonly #formRef = this.#observer.autoObserve();

  render() {
    const { configure } = this.#observer;

    return (
      // If your component does not re-render:
      // You can destructure `autoObserve` and do `<form ref={autoObserve()}>` directly
      <form ref={this.#formRef}>
        <input {...configure("first-name", { required: "We need to know who you are!" })} />
      </form>
    );
  }
}
```

This simplified approach enables you to avoid using (or cluttering) the `componentDidMount` and `componentWillUnmount` methods of your class components, resulting in fewer lines of code.

For those concerned about memoization, note that as long as the observer is created only once (i.e., during the class's construction only), memoization is not a concern for class components.
