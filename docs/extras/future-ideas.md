# Future Ideas

This is a document separate from this project's [TODOs](../../TODO.md). These are ideas that I'm much more likely to implement in the future provided that A&rpar; I have sufficient time for them and/or B&rpar; They're of sufficient interest to community.

Currently, I'm trying to wrap up the basic foundation and features of this project. I've been having some new ideas that would require updates to the core and, more importantly, updates to the documentation. These updates (particularly the updates to the docs) would take more time than what I currently have to offer. So I'll capture the thoughts that I had while _initially_ trying to implement these ideas. And I'll return to them at a later date if doing so seems reasonable.

Note that these are ideas that I've actually thought through and that I already know how to solve -- at least _generally_. Ideas that are more vague should probably still go in the TODOs document.

## Provide Better Support for Custom Renderers in Various JS Frameworks

Originally, when I created the `FormValidityObserver`, I assumed that all JavaScript frameworks would be able to work seamlessly with the way that I rendered error messages to the DOM. For example, if an error message was rendered to the DOM using Lit's [`render`](https://lit.dev/docs/api/templates/#render) function, then it should be safe for me to remove that error message from the DOM (when the corresponding field becomes valid) by calling `errorContainer.textContent = ""`, right? After all, it's just JavaScript, right? Wrong.

Apparently, there are many frameworks like [`Lit`](https://lit.dev/) and [`Preact`](https://preactjs.com/) which assume that once they've rendered content to a particular DOM node, they will _permanently_ be the tool that renders content to that DOM node. This means, for instance, that after `Lit` has `render`ed content to an `errorContainer`, it becomes illegal for the `FormValidityObserver` to render content to that node in any way that does not use said `render` function (e.g., `errorContainer.textContent = ""` or `errorContainer.replaceChildren()`). Violating this rule will cause later calls to `render` to fail entirely. `Lit` and `Preact` are likely not the only tools that exhibit this behavior.

Consequently, if I wanted the `FormValidityObserver` to support rendering error messages to the DOM using a JS framework's renderer, I would need to refactor the core to prevent a DOM Node from being manipulated manually after a framework `render`ed content to it. This would require 2 changes: 1&rpar; A change to the `clearFieldError()` method and 2&rpar; A change to how error messages can be configured and displayed.

First, I would need to change `clearFieldError()`. Originally, this method called `errorContainer.textContent = ""`, and it was always called when a field became valid. By updating this method to call the observer's `renderer` function with `null` instead (or with a `Symbol` representing an "empty value"), I would be able to avoid breaking the `render` functions that various JS frameworks use. This change was fairly easy to do, and it is already committed to the main branch since it gives better flexibility to developers.

The second change is the more involved one. Originally, when I created the `ErrorDetails` object, I assumed that a `string` error message should _never_ need to be rendered to the DOM with a special `render` function. (This was _before_ I knew that renderers existed which require _complete_ ownership of the DOM Node into which they render content.) Now I know that mindset is no longer accurate. This means a couple of things. For one, it means that we need to improve the `ErrorDetails` type:

```ts
type ErrorDetails<M, E extends ValidatableField = ValidatableField> =
  | ErrorMessage<string, E>
  | { render: true; message?: ErrorMessage<M, E> }
  | { render?: false; message?: ErrorMessage<string, E> };
```

Although it might be weird to make the `message` property optional, we have no other choice if we want to support custom renderers. This is because the `message` placed on an `ErrorDetails` object will _always_ replace the browser's default error message for a given constraint. Thus, if a developer wants to render the browser's default error message to the DOM using their framework's renderer, their configuration object would need to be `{ render: true }`. This can only be supported if the `message` property is optional. (The reason for supporting an optional `message` property when `render` is `false` is to allow framework integrations of our core package to always render error messages by default if it's more ergonomic to do so.)

The other question to answer is how to set expectations for developers. It's pretty easy to update our code like so:

```ts
// Inside #resolveValidation
this.setFieldError(
  field.name,
  /** @type {any} */ error.message ?? field.validationMessage,
  /** @type {any} */ error.render,
);
```

But how would we set expectations for developers? Should we warn them that their `renderer` function should always take `string`s into account? What would the implications be for the generic `M` type and how it is derived? What updates would need to be made to our documentation? I believe these questions are answerable... But they would require more time than we currently have to answer them. Whatever the answer is, it needs to be crafted carefully.

In the meantime, we aren't supporting this use case... yet. It's better to have an API that doesn't unexpectedly break than it is to have an API that has complex hurdles leading to buggy code. However, for developers who are willing to try jumping these hurdles (there are a few ways), we've at least updated the `clearFieldError()` method as an intermediate step.

### Additional Random Thoughts about the Topic

1. Should we expose a `useRendererByDefault` option (or something similarly-named, like `preferRenderer`) for the `FormValidityObserver`? Doing so could potentially simplify our code. (We'd probably just have to update internal calls to `setFieldError`. We'd also have to update the default value for `render` within the `setFieldError` method itself.) If we handled this right, then our JS Framework Integrations wouldn't need to map the `errorMessages` argument to different values for the core `configure` method (at least... when it comes to how default rendering works). Instead, the integrations could just supply the `useRendererByDefault` option directly to the `FormValidityObserver` constructor -- allowing the core to do the heavy lifting. If we go with this approach, we'd have to find a way to define the `ErrorDetails` type based on this option (or do something else that provides the expected developer experience in TypeScript). If this approach saves on lines of code (and thus on JS bundle sizes), then it's probably worth the TypeScript headache if it gives us one. (The headache shouldn't be too bad? Hopefully?)

2. Don't forget that you'll likely have to update your tests if make such a change. Yep... Fun. But if you choose your implementation wisely (e.g., the previous point), you might only need to update one set of tests (e.g., the tests for `setFieldError()`). Well... And the TS type tests, potentially.
