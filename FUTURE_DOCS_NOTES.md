# Future Docs Notes

This is a TEMPORARY file intended to capture some thoughts that I want to put in the documentation of this package in the future. More specifically, this file contains important notes that I'm likely to forget by the time I actually write the docs. The notes that you see here are not necessarily the final form of the notes that will appear in the docs.

## `FormValidityObserver`

### Restrictions

All frontend tools for forms require you to adhere to certain guidelines in order for the tool to function correctly with your application. Our tool is no different. But instead of introducing you to multitudinous tool-specific props, components, or functions to accomplish this goal, we rely on what HTML provides out of the box wherever possible. Thus, if you're writing _accessible_, _progressively enhanced_ forms, then you'll already be following the guidelines that we require.

The idea here is to make form validation as quick and easy as possible for those who are already following good web standards, and to encourage good web standards for those who aren't yet leaning into all of the power and accessibility features of the modern web. Here are our unique requirements:

- Form fields that participate in validation _must_ have a `name` attribute.
  - If your forms are [progressively enhanced](https://learn.svelte.dev/tutorial/progressive-enhancement), you will already be satisfying this. Leveraging the `name` attribute is perhaps the best way for form-related tools to identify form fields without causing any friction for the developer. All well-known frontend form tools require this in some way or another.
- Only [valid form controls](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements) may participate in form field validation.
  - Again, if your forms are progressively enhanced, you will already be satisfying this. If you're new to progressive enhancement, then don't worry. It's very easy to update your code -- whether written with pure JS or with the help of a JS framework -- to satify this requirement.
- A radio button group will only be validated if it is inside a [`fieldset`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset) element with the [`radiogroup`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/radiogroup_role) role.
  - If your forms provide [accessible radio button groups](https://www.w3.org/WAI/tutorials/forms/grouping/#radio-buttons) to your users, you will already be satisfying this. We believe this requirement improves accessibility for end users and provides a clear way for the `FormValidityObserver` to identify radio groups _without_ sacrificing developer experience. (If you want deeper insight into why we made this decision, see [_Why Are Radio Buttons Only Validated When They're inside a `fieldset` with Role `radiogroup`?_](./docs/extras/development-notes.md#why-are-radio-buttons-only-validated-when-theyre-inside-a-fieldset-with-role-radiogroup-formvalidityobserver).)
