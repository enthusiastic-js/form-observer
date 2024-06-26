# Svelte + Form Validity Observer

A _convenience_ API for reducing code repetition in a [Svelte](https://svelte.dev/) application using the [`FormValidityObserver`](../README.md).

## Function: `createFormValidityObserver(type, options)`

Creates an enhanced version of the `FormValidityObserver`, known as the `SvelteFormValidityObserver`. It accepts the exact same arguments as the [`FormValidityObserver`'s constructor](../README.md#constructor-formvalidityobservertypes-options).

### Return Type: `SvelteFormValidityObserver<M, R>`

An enhanced version of the `FormValidityObserver`, designed specifically for Svelte applications. It has the same Type Parameters as the `FormValidityObserver`. As with the `FormValidityObserver`, the type of `M` is derived from the [`renderer`](../README.md#form-validity-observer-options-renderer) option, and the type of `R` is derived from the [`renderByDefault`](../README.md#form-validity-observer-options-render-by-default) option.

#### Copied Methods

The following methods on the `SvelteFormValidityObserver` are the exact same as the methods on the `FormValidityObserver`. These methods are [bound](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Function/bind) to the observer instance to allow for safe [object destructuring](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#object_destructuring):

- [`observe(form)`](../README.md#method-formvalidityobserverobserveform-htmlformelement-boolean)
- [`unobserve(form)`](../README.md#method-formvalidityobserverunobserveform-htmlformelement-boolean)
- [`disconnect()`](../README.md#method-formvalidityobserverdisconnect-void)
- [`validateFields(options)`](../README.md#method-formvalidityobservervalidatefieldsoptions-validatefieldsoptions-boolean--promiseboolean)
- [`validateField(name, options)`](../README.md#method-formvalidityobservervalidatefieldname-string-options-validatefieldoptions-boolean--promiseboolean)
- [`setFieldError(name, message, render)`](../README.md#method-formvalidityobserversetfielderrorename-string-message-errormessagestring-eerrormessagem-e-render-boolean-void)
- [`clearFieldError(name)`](../README.md#method-formvalidityobserverclearfielderrorname-string-void)

#### Function: `autoObserve(form: HTMLFormElement, novalidate?: boolean): `[`ActionReturn`](https://svelte.dev/docs/svelte-action#types-actionreturn)

A Svelte [`action`](https://learn.svelte.dev/tutorial/actions) used to simplify the process of setting up and cleaning up a form's `FormValidityObserver`. It does this by calling [`observe`](../README.md#method-formvalidityobserverobserveform-htmlformelement-boolean) and [`unobserve`](../README.md#method-formvalidityobserverunobserveform-htmlformelement-boolean) automatically with the form on which it is used.

The `novalidate` parameter indicates that the [novalidate](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/form#novalidate) attribute should be applied to the `form` element when JavaScript is available to the client. By default, its value is `true`. (For details on why this attribute is significant, see [_Enabling Accessible Error Messages during Form Submissions_](../guides.md#enabling-accessible-error-messages-during-form-submissions).)

> Note: If you use this `action`, you should **not** need to call `observe`, `unobserve`, or `disconnect` directly.

**Example**

```svelte
<form use:autoObserve>
  <!-- Other Elements-->
</form>

<script>
  import { createFormValidityObserver } from "@form-observer/svelte";
  const { autoObserve } = createFormValidityObserver("focusout");
</script>
```

Remember that `autoObserve` is simply a convenience utility for calling `observe` and `unobserve` automatically. You're free to setup and teardown the `FormValidityObserver` manually if you prefer.

#### Function: `configure<E>(name: string, errorMessages: SvelteValidationErrors<M, E, R>): SvelteFieldProps`

An enhanced version of [`FormValidityObserver.configure`](../README.md#method-formvalidityobserverconfigureename-string-errormessages-validationerrorsm-e-r-void) for `Svelte`. In addition to configuring a field's error messages, it generates the props that should be applied to the field based on the provided arguments.

> Note: If the field is _only_ using the configured [`defaultErrors`](../README.md#form-validity-observer-options-default-errors) and/or the browser's default error messages, it _does not_ need to be `configure`d.

The `SvelteValidationErrors<M, E, R>` type is an enhanced version of the core [`ValidationErrors<M, E, R>`](../types.md#validationerrorsm-e-r) type. Here is how `SvelteValidationErrors` compares to `ValidationErrors`.

##### Properties That Mimic the `ValidationErrors` Properties

The following properties on the `SvelteValidationErrors` type _accept the exact same values_ as the corresponding properties on `ValidationErrors` type.

- `badinput`
- `validate`

**Example**

```svelte
<form use:autoObserve>
  <!-- Note: Accessible <label>s and error containers were omitted from this example. -->
  <input {...configure("username", { validate: validateNewUsername })} />
  <input name="password" type="password" />
  <input {...configure("confirm-password", { validate: validateConfirmPassword })} />

  <input type="date" {...configure("date", { badinput: "Please provide a valid date." })} />
</form>

<script lang="ts">
  import { createFormValidityObserver } from "@form-observer/svelte";

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
</script>
```

##### Properties That _Enhance_ the `ValidationErrors` Properties

All the other properties on the `SvelteValidationErrors` type are enhancements of the corresponding properties on the `ValidationErrors` type, so they follow slightly different rules. For clarity, these "other properties" are:

- `required`
- `minlength`
- `min`
- `maxlength`
- `max`
- `step`
- `type`
- `pattern`

The rules are as follows:

1&rpar; When a constraint is configured with an [`ErrorDetails`](../types.md#errordetailsm-e-r) object, the object must include a `value` property specifying the value of the constraint. In this scenario, both the field's constraint value _and_ its error message are configured.

```svelte
<form use:autoObserve>
  <!-- Note: Accessible <label>s and error containers were omitted from this example. -->
  <input {...configure("name", { required: { value: true, message: requiredField, render: true } })} />
  <input {...configure("email", { type: { value: "email", message: "Email is invalid", render: false } })} />
  <input {...configure("comment", { maxlength: { value: 80, message: "Comment must be 80 characters or less" } })} />
</form>

<script lang="ts">
  import { createFormValidityObserver } from "@form-observer/svelte";
  import type { ValidatableField } from "@form-observer/svelte";

  const { autoObserve, configure } = createFormValidityObserver("focusout");
  const requiredField = (field: ValidatableField) => `<p>${field.labels[0]?.textContent ?? "Field"} is required.</p>`;
</script>
```

**Note: A constraint can only be configured with an error message when you use the object syntax.** The exception to this rule is the `required` constraint, which allows you to _imply_ a value of `true` when you supply an error message value directly to the constraint.

```svelte
<form use:autoObserve>
  <!-- Note: Accessible <label>s and error containers were omitted from this example. -->
  <input {...configure("first-name", { required: requiredField })} />
  <input {...configure("last-name", { required: "Don't ignore me..." })} />
  <input {...configure("email", { required: { value: true, message: requiredField } })} />
</form>

<script lang="ts">
  import { createFormValidityObserver } from "@form-observer/svelte";
  import type { ValidatableField } from "@form-observer/svelte";

  const { autoObserve, configure } = createFormValidityObserver("focusout");
  const requiredField = (field: ValidatableField) => `${field.labels[0]?.textContent ?? "Field"} is required.`;
</script>
```

2&rpar; When a constraint is configured with a [primitive value](https://developer.mozilla.org/en-US/docs/Glossary/Primitive), then _only_ the field's constraint value is configured. When the constraint is broken, the browser's default error message for that constraint will be displayed.

This syntax only exists for convenience. You are free to use the regular HTML attributes instead if you like.

```svelte
<form use:autoObserve>
  <!-- Note: Accessible <label>s and error containers were omitted from this example. -->
  <input {...configure("email-1", { required: requiredField, type: "email" })} />
  <input {...configure("email-2", { required: requiredField })} type="email" />
  <input name="email-3" type="email" required />
</form>

<script lang="ts">
  import { createFormValidityObserver } from "@form-observer/svelte";
  import type { ValidatableField } from "@form-observer/svelte";

  const { autoObserve, configure } = createFormValidityObserver("focusout");
  const requiredField = (field: ValidatableField) => `${field.labels[0]?.textContent ?? "Field"} is required.`;
</script>
```

##### The `SvelteFieldProps` Return Type of `configure`

The return type of `configure` is simply an object containing the props that should be applied to the configured field. In addition to the field's `name`, this object will include any validation props that were configured by the function (e.g., `required`, `min`, `pattern`, etc.).
