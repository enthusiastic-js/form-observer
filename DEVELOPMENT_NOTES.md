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

### Can You Explain Your Reasoning behind Your Slightly Complex `TypesToListeners<A>` Type?

Originally, the `TypesToListeners<A>` type looked something like this:

```ts
type TypesToListeners<A extends ReadonlyArray<EventType>> = {
  [I in keyof A]: FormFieldListener<A[I]>;
};
```

It was intended to map a tuple of `EventType`s (e.g., `["click", "beforeinput"]`) to a tuple of event listeners for `form` fields. However, this type was eventually updated to the following:

```ts
type TypesToListeners<A extends ReadonlyArray<EventType>> = A extends infer U extends ReadonlyArray<EventType>
  ? { [I in keyof U]: FormFieldListener<U[I]> }
  : never;
```

This new type is what actually accomplished my original purpose, but to some people this may look redundant. I want to assure everyone reading this document that this new type is **not** redundant by any means. Here's the reasoning for the update to `TypesToListeners<A>` ...

The 3rd constructor of the `FormObserver` looks like this:

```ts
interface FormObserverConstructor {
  new <T extends ReadonlyArray<EventType>>(
    types: T,
    listeners: TypesToListeners<T>,
    options?: OneOrMany<ListenerOptions>
  ): FormObserver;
}
```

This constructor was made to allow developers to watch their `form` fields for multiple `types` of events. In this constructor, `listeners` is a tuple of event listeners corresponding to the provided event `types`. For instance, if `types` was `["click", "beforeinput"]`, then the first listener in the tuple passed to `listeners` would expect a `MouseEvent` and the second listener would expect an `InputEvent`.

My intention with this detailed typing was to improve the developer experience when it came to TS types. If for any reason a developer decided that they wanted to inline everything passed to `FormObserver` then ideally they could do something like the following:

```ts
const formObserver = new FormObserver(["click", "beforeinput"] as const, [
  (clickEvent) => clickEvent.x,
  (inputEvent) => inputEvent.data,
]);
```

_without_ having to type the arguments to the listener functions. Because _I_ am defining the constructor for my end users, _I_ should cause my tool to infer the proper types for the provided `listeners` based on the `EventType`s that have already been supplied to the `types` argument. I wanted to give this advantage to my end users for _all_ of my constructors.

Unfortunately, with the old implementation of `TypesToListeners<A>`, I was unable to _guarantee_ proper typing for the `event` arguments of the `listeners` tuple. It was only after I updated `TypesToListeners<A>` to the _new_ implementation that everything was able to work as expected. From what I can tell, this is due to how TypeScript handles generics. If you're interested in the details, keep reading.

When we use generic functions/constructors in TypeScript, TypeScript has to _infer_ the proper generic type from the arguments passed to the function/constructor. So if we have

```ts
function myFunc<T extends string>(str1: string, str2: T);
myFunc("a", "b");
myFunc("b", "a");
```

then TypeScript won't know what `T` is for a given call to `myFunc` until we supply the `str2` argument. For our first call to `myFunc`, TS is able to reduce `T` down to the literal `"b"` string. For the second call, TS reduces `T` down to `"a"` instead. But what happens if _multiple_ arguments can be used to determine the type of `T`?

```ts
function myWeirderFunc<T extends string>(str1: T, str2: T);
myWeirderFunc("a", "b");
```

Now we've made life a little harder for TypeScript. Neither a type of `"a"` nor a type of `"b"` alone will make sense because it would cause the _other_ argument to be invalid. So to handle this, TypeScript infers the "least common denominator" that will satisfy all of the arguments. Here, `T` actually becomes `"a" | "b"`.

Now that's just a simple example. What about when you have a complex function definition? Perhaps a definition as complex as our third constructor for the `FormObserver`? That's right. You run into similar issues. If we use the constructor with our old implementation for `TypesToListeners<A>` like so:

```ts
type TypesToListeners<A extends ReadonlyArray<EventType>> = {
  [I in keyof A]: FormFieldListener<A[I]>;
};

interface FormObserverConstructor {
  new <T extends ReadonlyArray<EventType>>(
    types: T,
    listeners: TypesToListeners<T>,
    options?: OneOrMany<ListenerOptions>
  ): FormObserver;
}
```

then TypeScript will try to infer `T` from _both_ the `types` argument and the `listeners` argument. Needless to say, this is no easy task for TS; so it just ends up erring on the side of caution by infering `T` as `ReadonlyArray<EventType>` -- the constraint of `T` -- for the `listeners` if the listener functions are passed in without explicit types.

Thankfully, although the above doesn't work, the following _does_ work:

```ts
type TypesToListeners<A extends ReadonlyArray<EventType>> = A extends infer U extends ReadonlyArray<EventType>
  ? { [I in keyof U]: FormFieldListener<U[I]> }
  : never;

interface FormObserverConstructor {
  new <T extends ReadonlyArray<EventType>>(
    types: T,
    listeners: TypesToListeners<T>,
    options?: OneOrMany<ListenerOptions>
  ): FormObserver;
}
```

How is this so? Well, if you look at the _new_ version of `TypesToListeners<A>`, you'll notice that the final type that it provides _does not_ rely on the `T` type passed by the constructor (ultimately). Instead, it relies on `U`. Because of this, TypeScript _cannot_ infer `T` from `listeners` and must _solely_ infer `T` from `types`. And because `U` itself is inferred from `T` and shares the same general constraint, TypeScript is able to generate a proper `listeners` tuple based on the information that `U` gets from `T`.

If you found that explanation a bit confusing, consider the following call to the constructor with our new implementation:

```ts
const formObserver = new FormObserver(["click", "beforeinput"] as const, [(e) => e.x, (e) => e.data]);
```

Very losely speaking, you can look at TypeScript's logic like this:

1. Infer `T` from arguments
   - Can't infer `T` from `listeners`.
   - Can only infer `T` from `types`.
   - `T` must be `readonly ["click", "beforeinput"]`.
2. Determine type for `listeners`
   - The type of `listeners` is determined using `U`.
   - `U` is inferred from `T`.
   - I know `T` is `readonly ["click", "beforeinput"]`, therefore `U` must be `readonly ["click", "beforeinput"]`.
   - I know `U` is `readonly ["click", "beforeinput"]`, therefore `listeners` must be `readonly [FormFieldListener<"click">, FormFieldListener<"beforeinput">]`.

Because `listeners` is based on `U` and _not_ `T` (at least not directly), TypeScript can safely determine the _exact_ type for each `FormFieldListener` instead of trying to use `listeners` as a way to derive `T` (which previously resulted in TS getting confused and in TS generalizing `T` to `ReadonlyArray<EventType>` for the `listeners`).

Hopefully between my original explanation and the list of bullet points that I gave, things make a little more sense. But if they don't, you can always play around with this code (or with similar code) [on your own](https://www.typescriptlang.org/play). I guarantee you'll understand this more if you get some hands-on experience.
