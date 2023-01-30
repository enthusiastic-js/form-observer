# Development Notes

I like to keep track of what I'm doing and why I'm doing it. Doing this achieves multiple purposes such as:

- Clarifying _why_ I was constrained/required to use a particularly abnormal (or even bad) approach for a given solution to a coding problem.
- Pointing out _good_ practices that I didn't know about until I started working on the project.
- Providing "bookmarks" that serve as answers to questions which I'm likely to ask again in the future.
- Opening _you_, the reader, up to my thought processes so that you can learn new things alongside me.

## Answers to Curious Questions

### Why are you attaching event handlers to the `Document` instead of attaching them directly to `HTMLElement`s?

The approach of attaching event handlers to the `Document` is called `event delegation`, and it's commonly used in the popular, well-loved JS frameworks today. Here are two reasons to consider event delegation in the context of this project:

1. **Performance**. A form can be large and can contain several fields that need to be watched. We can create an event handler, dynamically search for every field belonging to an `HTMLFormElement`, and then attach the handler to each and every one of those fields. However, that's a lot of unnecessary effort (and memory consumption). It's much better for performance to just attach _one_ event listener to the `Document` for _all_ of the necessary fields. This also helps us avoid the need for DOM queries.

2. **Feature Support**. If we didn't use event delegation, then we would not only need to attach individual event handlers to every field _belonging to_ the `HTMLFormElement` (as well as _avoid_ attaching listeners to non-fields), but we would _also_ need to watch the `HTMLFormElement` for any fields that could be added to it or removed from it as well. And this is a **HUGE** problem... because even if we used [`MutationObservers`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) to watch the `HTMLFormElement`'s children, _we still wouldn't be able to detect when an element **outside** of the `HTMLFormElement` was newly added (or removed) with a [`form` **attribute**](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#form) matching the `HTMLFormElement`'s `id`_. With event delegation, we don't have to worry about this problem. All events are going to bubble up to the `Document` anyway; so at the `Document` level, we'll be able to deal with dynamically added/removed form fields automatically. (Even for cases like `focus`, you can still respond to `focusin`/`focusout`.) And if `event.stopPropagation` is a realistic concern, [developers can still rely on `event capturing`](https://www.quirksmode.org/js/events_order.html#link4). Again, this helps us avoid the need for DOM query selectors.

Note that in our codebase, we attach listeners specifically to an `HTMLFormElement`'s [`ownerDocument`](https://developer.mozilla.org/en-US/docs/Web/API/Node/ownerDocument) instead of attaching them to the [global `document` object](https://developer.mozilla.org/en-US/docs/Web/API/Window/document). This approach is generally more reliable.

Other JS frameworks and developers who use event delegation will often allude to the concerns mentioned above in some way. Some helpful reading on the topic:

- [Checking event target selectors with event bubbling in vanilla JavaScript](https://gomakethings.com/checking-event-target-selectors-with-event-bubbling-in-vanilla-javascript/)
- [Why is JavaScript event delegation better than attaching events to each element?](https://gomakethings.com/why-is-javascript-event-delegation-better-than-attaching-events-to-each-element/)

### Why are you using [class _expressions_](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/class) instead of [class _declarations_](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#defining_classes) in some places?

Unfortunately, at the time of this writing, TypeScript does not support adding generic types to the constructor of a `class`. See [this stackoverflow question](https://stackoverflow.com/a/64229224/17777687) and [this GitHub issue](https://github.com/microsoft/TypeScript/issues/10860) ... [this GitHub issue too](https://github.com/microsoft/TypeScript/issues/40451).

However, by using a combination of class expressions and well-typed `interfaces`, library authors can more or less provide the experience of overloadable, generically-typed class constructors to their end-users (as the answer to the stackoverflow question above points out). Whenever I run into this concern, I use class expressions instead of class declarations.
