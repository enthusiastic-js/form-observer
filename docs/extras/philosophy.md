# Philosophy and History

Here you'll find my philosophy for the `FormObserver` and its derivatives (i.e., the `FormStorageObserver` and the `FormValidityObserver`). This document also details the history of thow these tools came to be.

Since the approach that this library takes is _very_ different from the approach that other form libraries usually take, I felt compelled to give extensive reasons here for the decisions that I made. Of course, you don't have to read _all_ of this document (or any of it, for that matter 😅) unless you're interested.

This project has 3 primary goals: 1&rpar; Keep things simple, 2&rpar; Make the API transparent, and 3&rpar; Don't add unnecessary overhead or reinvent the wheel.

## Simplicity

Ideally, a form library remains as minimalistic and familiar as possible without sacrificing the power or reach of the solutions that it provides. A _minimal_ API will prevent consumers from becoming overwhelmed, and it will also make the project more maintainable. Additionally, a _familiar_ API can be seamlessly adopted in various types of applications. Libraries that satisfy these constraints will typically have much smaller bundle sizes by default.

This is why I designed the `FormObserver` to have a simple API that's similar to that of the standardized observers, such as the [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) and the [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver). My hope was that developers familiar with these APIs would be able to understand and work with the `FormObserver` more quickly -- perhaps without ever needing to read the documenation on our site!

In the name of keeping things minimalistic, the `FormObserver` doesn't try to satisfy every single use case for forms under the sun. Instead, it provides the _building blocks_ needed to solve complex problems for forms more easily. That way, the _developer_ gets to decide how complex or simple (bloated or small) they want their form logic to be.

Similarly, the `FormObserver`'s derivatives don't try to solve every form problem under the sun either. Instead, they focus on specific use cases. The `FormStorageObserver` is _solely_ concerned with storing data in `localStorage`; the `FormValidityObserver` is _solely_ concerned with form validation; and both of these tools try to keep their API as small (yet powerful) as possible. If a developer needs both of these features in the same form, they can simply instantiate both observers and use them with the form of interest. This is already what people have to do with `MutationObserver`s and `IntersectionObserver`s that have significantly different logic.

## Transparency

One thing that I don't personally favor with some form validation libraries is that they do a lot of things behind the scenes. For instance, they might automatically apply the `novalidate` attribute to your `<form>` elements without letting you know, or they'll consume your fields' `ref` props without letting you know, or they'll give you a submission handler instead of letting you write your own. This can lead to a confusing and/or limited developer experience.

Peronsally, I prefer for everything to be explicit so that it's _clear to everyone_ what's happening in the application. So to me, a form library should keep things predictable by refusing to apply default attributes/props to the developer's elements whenever possible. When default attributes or props would _benefit_ the developer, documentation should be put in place to clarify what defaults are being provided. (The documentation for this should exist in the JSDocs so that the developer doesn't need to leave their IDE.) This is why the [JS Framework Integrations](../form-validity-observer/integrations/README.md) for the `FormValidityObserver` _don't_ consume the precious `ref` attribute (or its equivalent in other frameworks). It's also why I was careful to document how the `autoObserve` utility works in those integrations; and I've intentionally made this utility optional so that developers can make their code even more explicit if they please.

Similarly, developers shouldn't be given submission handlers that obscure the application's logic. Instead, developers should be given a set of modular, sufficiently-robust functions that will allow them to craft clear, succinct, predictable submission handlers on their own. When this is done well, developers will still get to write a small amount of code, and they will _also_ gain clearer insight into (and greater control over) what their code is doing. This is why, for instance, the `FormValidityObserver` exposes a `validateFields` method instead of exposing a `handleSubmit` function.

Of course, these are just my opinions. I understand that others may prefer the opposite of what I've described.

## Avoid Unnecessary Overhead and Reinventing the Wheel

Believe it or not, modern browsers have almost everything that you need to manage complex forms. Consequently, state management tools are completely unnecessary, and form libraries (stateful or not) are often unnecessary as well. This is important because it means that you can improve your application's performance and bundle size by reaching for the browser's API instead of a complex form library. As long the DX of the browser's API is sufficiently good, this is a win.

Curious about how much the browser can actually do? The following 9 use cases commonly found in complex forms are already handled by the browser:

### 1&rpar; Accessing a Form's Data

It is unnecessary to keep track of a form's data with state management. This is because you can access a form's data easily with the [`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData) class. Simply call the constructor with the `HTMLFormElement` of interest, and you'll have _all_ of your form's data available at your fingertips. (This includes [form data belonging to Web Components](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/setFormValue).)

```js
const form = document.querySelector("form");
const formData = new FormData(form);

// Get the data associated with a specific field
console.log(formData.get("email"));

// Transform the data into a key-value object
const data = Object.fromEntries(formData);
console.log(data.email);
```

### 2&rpar; Accessing a Form's Fields

_All_ of the fields associated with a form (including [Web Components that act like fields](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/attachInternals)) can be accessed with the [`HTMLFormElement.elements`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements) property. Not only does this property allow you to access form controls [by `name`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormControlsCollection/namedItem) ...

```js
const inputAccessedWithMethod = form.elements.namedItem("email");
const inputAccessedByProperty = form.elements.email;
console.log(inputAccessedWithMethod === inputAccessedByProperty); // `true`
```

But it also functions as an enumerable, array-like object. This makes it very easy to search for a subset of fields based on specific criteria.

```js
// Accessing the first field
const firstField = form.elements[0];

// Operating on all form fields in a loop
for (let i = 0; i < form.elements.length; i++) console.log(form.elements[i]);

// Searching for form fields based on specific criteria
const allFields = Array.from(form.elements);
const visitedFields = allFields.filter((f) => f.hasAttribute("data-visited")); // We'll talk more about this later
const invalidFields = allFields.filter((f) => !f.validity.valid); // Or (f) => f.getAttribute("aria-invalid") === "true"
```

Remember that a field outside of a form element can still be associated with the form as long as the field has a [`form` attribute](https://www.w3schools.com/tags/att_form.asp) that points to the owning form's `id`. (This attribute can also be used with Web Components.)

```html
<form id="example">
  <!-- Implicitly Associated with the Form (`form` attribute omitted from a child field) -->
  <input name="implicit-association" />

  <!-- Explicitly Associated with the Form (`form` attribute points to example form) -->
  <input name="explicit-internal-association" form="example" />

  <!-- Explicitly NOT Associated with the Form (`form` attribute points elsewhere) -->
  <input name="ignored" form="some-other-form" />
</form>

<!-- Explicitly Associated with the Form (`form` attribute points to example form) -->
<input name="explicit-external-association" form="example" />
```

This means that no matter how complex your application's component tree is, you can always associate form controls with your form of choice easily. Then, you can access those form controls by using the `HTMLFormElement.elements` property.

### 3&rpar; Accessing a Form from Its Fields

Not only does a `form` element have access to all of its controls, but each control has access to its owning `form` (even if the control is a [Web Component](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/form)).

```html
<form>
  <label for="username">Username</label>
  <input id="username" name="username" type="text" />
</form>
```

```js
const input = document.getElementById("username");
console.log(input.form === document.querySelector("form")); // `true`
```

This is **powerful** because it means that _if you have access to a single form control **anywhere** in your application, then you also have access to the **entire** owning form's [data](#1-accessing-a-forms-data) **and** its [fields](#2-accessing-a-forms-fields)_. This is far more flexible (and transferrable) than what typical state management tools (and even typical form libraries) have to offer, and it's much simpler as well.

This native browser functionality is useful for several purposes. For example, if you only have access to the `confirm-password` field in a certain part of your application, you can still compare it to the corresponding `password` field by using the `form` property.

```js
console.log(confirmPassword.value === confirmPassword.form.elements.password.value);
```

### 4&rpar; Validating Form Fields

You technically don't need a library to validate your form fields either. Browsers already have functionality in place to [validate](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState) your fields (including your [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/validity)). In my experience, this takes care of most use cases -- even for large companies. Here's a simple example.

```html
<form>
  <label for="email">Email</label>
  <input id="email" name="email" type="email" required />

  <label for="donation">Donation</label>
  <input id="donation" name="donation" type="text" inputmode="numeric" pattern="\d+" required />
</form>
```

```js
const form = document.querySelector("form");
const { email, donation } = form.elements;

// Example Email Validation
console.log(email.validity.valid); // `false`, because the field is empty. See `validity.valueMissing`.

email.value = "text";
console.log(email.validity.valid); // `false`, because the value is not an email. See `validity.typeMismatch`.

email.value = "email@example.com";
console.log(email.validity.valid); // `true`

// Example Donation Validation
donation.value = "These are letters, not numbers";
console.log(donation.validity.valid); // `false`, because the value does not satisfy the `pattern` regex. See `validity.patternMismatch`.

donation.value = "500";
console.log(donation.validity.valid); // `true`
```

Of course, the browser can't predict _every possible way_ that developers would want to validate their form fields, so there are cases where custom validation will be required. For example, you'll need custom validation to verify that a `confirm-password` field matches its corresponding `password` field, or to make sure that a username is available during user sign-up. For these cases, you will need to write your own JavaScript logic to run this custom validation, and you will need to use [`setCustomValidity`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setCustomValidity) to mark the field as invalid to the browser. (Note that you can also [set the `ValidityState`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/setValidity) of Web Components.)

```html
<form>
  <label for="username">Username</label>
  <input id="username" name="username" type="text" required />

  <!-- Note: You should consider including a `pattern` constraint for your `password` fields as well -->
  <label for="password">Password</label>
  <input id="password" name="password" type="password" required />

  <label for="confirm-password">Confirm Password</label>
  <input id="confirm-password" name="confirm-password" type="password" required />
</form>
```

```js
const form = document.querySelector("form");
await validateNewUsername(form.elements.username);
validateConfirmPassword(form.elements["confirm-password"]);

async function validateNewUsername(field) {
  const response = await fetch("/api/username-exists", { body: field.value });
  const usernameTaken = await response.text();
  field.setCustomValidity(usernameTaken === String(true) ? "Username is already taken" : "");

  console.log(field.validity.valid); // `false` if username was taken. Otherwise, `true` if other constraints pass. See `validity.customError`.
}

function validateConfirmPassword(field) {
  const password = field.form.elements.namedItem("password");
  field.setCustomValidity(field.value === password.value ? "" : "Passwords do not match.");

  console.log(field.validity.valid); // `false` if passwords did not match. Otherwise, `true` if other constraints pass. See `validity.customError`.
}
```

One of the many benefits of using the browser's native form validation is that you can see whether or not your form is valid by calling `form.checkValidity()`. (Form controls -- including Web Components -- also have their own version of this method.)

### 5&rpar; Providing Error Messages for Form Fields

Browsers automatically provide _localized_ error messages for your form fields whenever they fail constraint validation. The error message that the browser provides depends on the specific [constraint](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState) that failed validation, and it is exposed by the [`field.validationMessage`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLObjectElement/validationMessage) property. If you want to replace the browser's error message with your own (or if you need to mark a field as invalid after running custom validation logic), you can use [`setCustomValidity()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setCustomValidity) (or [`setValidity()`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/setValidity) for Web Components).

When a browser reports field errors with its error bubbles, it will display whatever is in the `field.validationMessage` property. Of course, you're free to render the `validationMessage` to the DOM instead of relying on the browser's error bubbles.

Because we already have the `validationMessage` property, there isn't really a need for libraries or state management tools to keep track of the error messages associated with your fields.

### 6&rpar; Reporting Error Messages to Users

You can report the error messages associated with your form's fields at any moment by calling [`form.reportValidity()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/reportValidity) or [`field.reportValidity`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/reportValidity) (again, also available to [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/reportValidity)). When a form is invalid, `form.reportValidity()` will call attention to the _first_ invalid field belonging to the form by focusing the field and displaying its `validationMessage` in a bubble. Similarly, when a field is invalid, `field.reportValidity()` will call attention to the field by focusing it and displaying its `validationMessage` in a bubble. (Note that `reportValidity` does nothing if the related form/field is valid.)

The browser will automatically block form submissions for forms with invalid fields. If a user attempts to submit an invalid form, the browser will call `form.reportValidity()` instead. If you prefer to handle this logic yourself, you can apply the [`novalidate`](https://www.w3schools.com/tags/att_form_novalidate.asp) attribute to your form and run your own logic in a submission handler. (The `novalidate` attribute _does not_ disable form validation. It simply prevents the browser from blocking form submissions on its own.)

```html
<form novalidate>
  <!-- Form Controls -->
</form>
```

```js
document.querySelector("form").addEventListener("submit", handleSubmit);

function handleSubmit(event) {
  const form = event.currentTarget;

  if (!form.checkValidity()) {
    event.preventDefault();
    // Display error messages in your own way ...
  }
}
```

### 7&rpar; Identifying Fields That Will Not Participate in Validation

There are situations where a field should not cause a form to fail validation. For example, a field is not relevant for form submission or form validation if it is [disabled](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/disabled). The [`field.willValidate`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLObjectElement/willValidate) property can be used to identify fields (or [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/willValidate)) that will not participate in form validation.

### 8&rpar; Identifying Visited Fields

If we're being honest, a "visited" or "touched" field is simply a field that has been [`blurred`](https://developer.mozilla.org/en-US/docs/Web/API/Element/blur_event). Form validation libraries often use state management to keep track of visited fields, but this isn't necessary when we already have [custom data attributes](https://developer.mozilla.org/en-US/docs/Learn/HTML/Howto/Use_data_attributes) to store this information for us.

```js
document.addEventListener("focusout", markVisitedFields);

function markVisitedFields(event) {
  if (!event.target.form) return; // Only run listener on form controls
  event.target.setAttribute("data-visited", "");
}

/* Some time later when we want to see which fields have been visited... */
const form = document.querySelector("form");
const visitedFields = Array.from(form.elements).filter((f) => f.hasAttribute("data-visited"));
```

`data-*` attributes also make it easy to reset any fields that are marked as visited. For example, we might want to do this whenever a form is [reset](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/reset_event).

```js
const form = document.querySelector("form").addEventListener("reset", handleReset);

function handleReset(event) {
  const form = event.currentTarget;
  for (let i = 0; i < form.elements.length; i++) form.elements[i].removeAttribute("data-visited");
}
```

### 9&rpar; Identifying Dirty Fields

"Dirty Fields" are simply fields which no longer match their default values. Form validation libraries often use state management to keep track of dirty fields. However, browsers already give you a way to do this since they expose the default values of fields through properties like `defaultValue`, `defaultChecked` (e.g., for radio buttons and checkboxes), and `defaultSelected` (e.g., for `<select>` elements). Consequently, all that's needed to check whether or not a field is dirty is something like

```js
input.value !== input.defaultValue;
```

When combined with `data-*` attributes (e.g., `data-dirty`), this approach gives us another easy way to keep track of an entire form's dirty fields _without_ state management. We have an example of [managing dirty fields](../form-validity-observer/guides.md#keeping-track-of-visiteddirty-fields) in our documentation.

> Note: Since Web Components define their own custom properties, each individual Web Component can choose how it wants to expose a `defaultValue` property (or something similar).

### X&rpar; And There's More That You Can Explore...

There's even more that can be done _easily_ with just the browser! I've only covered the basic use cases for forms here. If you're interested in learning more about what you can do with forms, see [MDN's documentation](https://developer.mozilla.org/en-US/docs/Learn/Forms).

For now, let's consider how all of this relates to the philosophy behind the `FormObserver`, and especially the `FormValidityObserver`.

## Why State Management Tools Aren't Ideal

In light of what browsers are already capable of, neither the `FormObserver` nor its derivatives use any kind of state management tool. Why? Because there are two significant problems that come with using state management tools.

First, if your forms are ever split into several subcomponents, then using state management tools to manage your form data will often force you to use non-trivial tools like [React's Context](https://react.dev/learn/scaling-up-with-reducer-and-context) and [Svelte's Readable Stores](https://learn.svelte.dev/tutorial/readable-stores) for data synchronization. But why add this complexity to your application when browsers already provide easy form data management? As we discussed earlier, all of the information that you need -- information on form values, visited fields, dirty fields, and more -- is readily available to you once you start using the `FormData` class and the `form.elements` property. Thus, your codebase will end up being much simpler (and consequently, much more maintainble) if you rely on the browser's features instead of relying on a state management tool. Relying on the browser also saves you from having to learn a new API whenever you change JS frameworks.

Second, state management tools run the risk of harming your application's performance. One of the greatest offenders here is React, which will re-render all child components whenever the owning parent re-renders in response to a state change in your form. Even if you use memoization techniques, you're still incurring the cost of memoization when you could bypass all of these costs by leaning into what browsers already provide. Your state management tool might be more performant than React's (such as Svelte's or Solid's), but it will still incur memory allocation costs for a problem that -- again -- the browser already solves. **_Perhaps_** it would be reasonable to leverage state management tools if the browser had an overly verbose or complex API. But the browser's API for forms allows you to access whatever you need quite easily; so state management isn't really worth the cost here.

## Why Libraries That Don't Rely on the Browser Aren't Necessarily Ideal Either

The `FormObserver` and its derivatives lean into the browser's native features as much as possible. This is because form libraries that don't rely on the browser's form features will effectively have to reinvent those features. And there are several problems with that. Here are a few:

- **Bundle Size**: No matter how small it is, a library that reinvents the browser's features will increase an application's bundle size with logic that the browser already takes care of. The more browser features that the library tries to reinvent, the larger the bundle size will become. (This is especially the case for the browser's more complex form features.)
- **Unintuitive Developer Experience**: Because there are a lot of browser features that form libraries would need to reinvent, these libraries can end up accidentally creating unintuitive developer experiences. For instance, they can [accidentally cause a `disabled` field to participate in form submissions](https://github.com/react-hook-form/react-hook-form/issues/6690) even though [the web specification forbids this](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/disabled). Other times, they can provide stateful form data to users that is desynchronized from the DOM's form data (because the library isn't leaning into the browser at all). These are problematic nuances that can confuse developers -- especially those who want to interact directly with their form controls. And these nuances can easily be missed if the library isn't being _carefully_ developed with the web spec in mind.
- **Framework Lock-in**: Most of the time, form libraries are designed with certain JS frameworks in mind. For example, [`React Hook Form`](https://react-hook-form.com/) is tied to React, and [`Vee Validate`](https://vee-validate.logaretm.com/v4/) is tied to Vue. This is disadvantageous for developers because they can't support as many users as they would like; and it's disadvantageous for users because _they'll often have to learn a new API whenever they want (or **need**) to use a different JS framework (or pure JS itself)_.

### A Sidenote about Using Components in JS Frameworks

Although most form controls are best created with regular HTML and CSS, there are some complex form controls that are best created as components. (A more pleasing `Select` component would be an example.) It's possible that some of the form libraries out there manage form data independently from the browser to support components that act like form controls. But even if that reason is used as justification, it still doesn't negate the disadvantages discussed earlier.

The better solution to the problem of complex form controls is [Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components) because they're able to [function as form controls](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/attachInternals) and thus adopt all of the browser's [powerful form features](https://web.dev/articles/more-capable-form-controls). The truth is that no matter how beautifully it is designed, a JS Framework Component cannot behave as a valid form control (unless it's a wrapper for a Web Component), and this means that JS Framework Components will always cause problems. They'll lack support for many things, such as the [`<label>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label) element, participation in form submissions, and browser autofilling. It's possible to hack solutions to these problems, but you'll end up with something more complex, buggy, and unmaintainable than what you would have had if you used a Web Component. And some problems cannot be solved with hacks.

If you use Web Components, then the need for libraries that manage their own versions of form data disappears entirely.

## Where the Browser Falls Short: Reporting _Accessible_ Error Messages

Perhaps the only drawback of relying _solely_ on the browser (without any additional JavaScript) is that the error messages which the browser displays in bubbles do not typically provide a good user experience, nor are they sufficiently accessible. Moreover, the browser can only display one error message bubble at a time. Thankfully, this doesn't mean that you need to opt out of the browser's features altogether. Instead, you can create helper functions that automatically display _accessible_ error messages for you.

## The Form Validity Observer's Approach

Because the browser's form API is so comprehensive, it would be a waste to throw the whole thing out. A much better approach would be to use as many of the browser's features as possible, and to provide _enhancements_ for those features where needed. This is what the `FormValidityObserver` seeks to do.

It starts off with the [`setFieldError`](../form-validity-observer/README.md#method-formvalidityobserversetfielderrorename-string-message-errormessagestring-eerrormessagem-e-render-boolean-void) method, which accessibly marks form fields as [`aria-invalid`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-invalid) and renders [_accessible_ error messages](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA21#example-2-identifying-errors-in-data-format) for those fields to the DOM -- either as raw strings or as HTML. You can consider it the enhanced version of the browser's `setCustomValidity()` method.

Then there's [`clearFieldError`](../form-validity-observer/README.md#method-formvalidityobserverclearfielderrorname-string-void), which accessibly marks a field as valid (`[aria-invalid="false"]`) and removes its error message from the DOM. You can consider it the enhanced version of calling `setCustomValidity()` with an empty string.

Of course, these methods provide little benefit by themselves to developers. Sure, developers will be able to _display_ accessible error messages for their fields. But these methods leave the tedious responsibility of validating forms to the developer. This is where the [`validateField`](../form-validity-observer/README.md#method-formvalidityobservervalidatefieldname-string-options-validatefieldoptions-boolean--promiseboolean) method comes in. Instead of reinventing the browser's validation features, it simply leverages the [`ValidityState`](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState) of the field being validated. It also takes into account any custom validation logic with which the field has been `configured`. If the field fails validation, `validateField` calls `setFieldError`; otherwise, it calls `clearFieldError`. You can consider `validateField` to be the enhanced version of `field.checkValidity()`.

Developers may want to focus a field that fails validation and scroll it into view, just like the browser's `field.reportValidity()` method does. For this use case, the `validateField()` method comes with an optional `{ focus: boolean }` option that mimics this behavior. When `focus` is `true`, the field will be focused and scrolled into view if it fails validation. The scrolling behavior can be tailored to an application's needs by passing a custom [`scroller`](../form-validity-observer/README.md#form-validity-observer-options-scroller) function to the `FormValidityObserver`'s constructor. (The `scroller` option appears at the constructor level instead of the field level because scrolling behavior should be consistent within a given form.) This is another enhancement over the browser's capabilities. In short `validateField({ focus: true })` = an enhanced `field.reportValidity` and `validateField()` = an enhanced `field.checkValidity`.

The next natural step is to provide a way to validate an _entire form_. For that, we have [`validateFields`](../form-validity-observer/README.md#method-formvalidityobservervalidatefieldsoptions-validatefieldsoptions-boolean--promiseboolean). Just as with `validateField`, `validateFields()` is effectively an enhanced version of `form.checkValidity()`, and `validateFields({ focus: true })` is effectively an enhanced version of `form.reportValidity()`. This method stays simple by relying on the `validateField` method to validate each field.

If the developer opts out of accessible error messaging, the `setFieldError` and `clearFieldError` methods will fallback to `field.setCustomValidity()`, and `validateField({ focus: true })`/`validateFields({ focus: true })` will fallback to `field.reportValidity()`/`form.reportValidity()`.

As an added bonus, the `FormValidityObserver` exposes a [`configure`](../form-validity-observer/README.md#method-formvalidityobserverconfigureename-string-errormessages-validationerrorsm-e-void) method that enables developers to configure the error messages that should be displayed when a field fails validation. (Any unconfigured error messages will fallback to the `validationMessage` that the browser provides.) It also allows a custom validation function to be configured for the field.

Seeing the big picture here? The `FormValidityObserver` is basically a wrapper for the browser's native features when accessible error messages aren't being used. When accessible error messages are needed, it functions as an _enhancement_ (not a replacement) of the browser's features to satisfy that need. As a bonus, it includes configurable scrolling/rendering functionality as well.

By only exposing the methods needed to compensate for the browser's insufficiencies, the `FormValidityObserver` is able to remain small, reusable, and easy to use. It assumes that every other problem (related to form validation) that developers will face is solved (ergonomically) by the browser's APIs.

## How Does This Relate to the Form Observer?

Originally, there were no plans to create a `FormObserver` at all. I just wanted to make form validation easier for the projects that I worked on. Specifically, I wanted a solution that was more ergonomic when it came to displaying accessible error messages for invalid fields. My solution needed to adhere to 2 constraints: 1&rpar; The solution should _embrace_ the browser's native features, and 2&rpar; The solution should work in _all_ JavaScript applications (not just Svelte or React).

At the same time, I was also working through _another_ problem: I needed something that could save a user's form progress in `localStorage`. And as I thought through these two problems simultaneously, I discovered that there was a greater common problem: As developers, we typically want to run some kind of sophisticated logic whenever users interact with our forms. Sometimes we want to run form validation when users interact with our forms; other times, we want to store their progress; other times, we may need something else.

This motivated me to make the `FormObserver` the core of my project. If I could create something that would always run specialized logic when a user interacted with my fields, then I could use that tool in _any_ situation -- not just in the context of form validation or `localStorage`.

After I created the `FormObserver`, I went back to solving my original problems for form validation and form progress storage. This led to the birth of the `FormValidityObserver` and the `FormStorageObserver` respectively. Although no single library is the silver bullet to all problems, I'm quite happy with what I've made, and I think my solution comes pretty close to the ideal. :&rpar; The `FormValidityObserver` in particular is the first tool to provide sophisticated, accessible form validation to developers working in _any_ kind of JavaScript application (present _or_ future) _while leaning into the browser's native features_. (At least, as far as I know...)
