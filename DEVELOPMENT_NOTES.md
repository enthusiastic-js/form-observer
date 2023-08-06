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

### Why Are You Returning `boolean`s from `FormObserver.observe` and `FormObserver.unobserve`?

Originally, my plan for the `FormObserver` was for it to have an API similar to the other official observers in JS, like [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver), [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver), and [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver). And indeed, the API of `FormObserver` closely matches the APIs of the official observers. But what's unique about my implementation is that `FormObserver.observe()` and `FormObserver.unobserve()` both return `boolean` instead of returning `void`.

My reason for doing this is that I designed `FormObserver` with `inheritance` in mind. The `FormObserver` itself was made to be useful and flexible for all circumstances. But there might be extensions of the `FormObserver` that could be specifically and comprehensively designed to handle certain use cases reusably -- such as the `FormStorageObserver` and the `FormValidationObserver`. And having the base class's `observe()` and `unobserve()` methods return `boolean`s results in a cleaner experience for anyone extending `FormObserver`.

All [reasonable] extensions of `FormObserver` are going to need to attach event listeners to the `Document` of the observed `form`s; so it makes more sense for all child classes to accomplish this by leveraging the base class's logic (through `super.observe()`) instead of duplicating code. Additionally, many [reasonable] extensions of `FormObserver` will also want to know whether or not a `form` is already being observed when the `observe()` method is called. (If the `form` is already being observed, then the method should `return` early to avoid running unnecessary or even potentially harmful logic.) Since the base `FormObserver` class knows whether or not the `form` provided to `FormObserver.observe()` is already being observed, it makes sense for the child class to get that information from the parent instead of trying to figure it out on its own. The simplest way to accomplish this (without exposing private fields) was to make the base `FormObserver.observe()` method return a `boolean` indicating whether or not the `form` it received was already being observed when the method was called. For similar reasons, `FormObserver.unobserve()` also returns a `boolean`.

Without the support of `protected` fields in JavaScript (whereby child classes could look at `this.#observedForms` directly to know whether or not a `form` was already being observed), it makes the most sense to communicate information to children through the returned values of the parent's methods (in this specific scenario). But even if JS supported `protected` fields, our current implementation results in the smallest/simplest amount of code/logic. (The `FormObserver.observe()` method already checks `this.#observedForms` for us; it doesn't make sense to have `ChildFormObserver.observe()` do the same thing again. That's just wasteful.)

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

### What's Going on with [`FormObserver.test.tsx`](./src/__tests__/FormObserver.test.tsx)?

There are a few testing patterns that I've employed in this file which are probably a little unusual. So I wanted to open you (and my future self) up to what I'm doing in this file, and _WHY_ I'm doing what I'm doing. I'll split these thoughts up into different sub sections.

#### Excessive Setup and Excessive Setup-related Assertions before Running any Tests

You'll notice that over 100 lines of code are given simply to _setting up_ the tests: creating constants, running assertions on those constants, creating assertion-guarded helper functions, etc. And someone may wonder, "Why all the hassle?" Well, the reasoning for the hassle is two fold:

**First, I want a good and consistent developer experience _even for my tests_**.

**Someone** has to maintain these tests. And _you_ as the reader, are obviously seeking to learn something from these tests if you're bothering to take the time to read them. Therefore, _everyone_ loses if the tests look awful, and everyone wins if the tests look great.

A lot of the tests here end up doing the same thing: They render a form, they instantiate a `FormObserver`, they perform user interactions, and they run assertions. Sure, I could have each test use a uniquely rendered DOM, a `FormObserver` instantiated with unique arguments, and a multitude of unique user interactions. But this adds cognitive overhead for any developers trying to add/update tests. For _every_ test, they'd have to answer questions such as, "How many `form`s will I create?", "How many fields will I render for each `form`?", "What arguments should I pass to the `FormObserver` constructor?", "Should I try a different user interaction for this other test?", etc. All of these questions cause unnecessary mental strain and impede the development process.

Additionally, that overhead which I just described also gets translated to all _readers_ of the test code. For _every_ test, readers will have to carefully look through the code to understand _what_ is being rendered to the DOM, what _kind_ of user interactions are being used, and more. And all of the unique values used will drastically increase the lines of code that readers will need to comprehend. Again, this is unnecessary mental strain.

_Life is made much easier by creating global constants and helper functions_. By creating global constants and helpers, I'm saying, "Here is the general environment that you should expect to be working in for _all_ tests". Every developer will know what values to use for each test, every developer will know how to _setup_ each new test, and every _reader_ will understand how every test operates. Global constants and helpers should be leveraged in tests whenever they yield greater clarity.

**Second, I want to _guard_ the experience of all developers (_even in my tests_) AND I want to guard the experience of my _users_**.

Usually, it's redundant to "guard" the constants that you've created by running assertions on them. For instance, the following setup is redundant:

```ts
it("Does something", () => {
  const testItems = ["one", 2, true];
  expect(testItems).toHaveLength(3);
});
```

The declaration of `testItems` itself already proves that it has a length of 3. Although I _could_ add the assertion, that would be redundant. This redundancy would increase the lines of code for the test and therefore increase the risk of adding cognitive overhead for readers. And this loss would be experienced without any real benefit. Generally speaking, we should avoid redundant assertions in our tests.

However, there may be cases where these so called "redundant assertions" are helpful. Perhaps it isn't readily apparent from the name of your test and/or the name of your variables that you're trying to create a certain environment that _must_ be obeyed for this test to be reliable. In cases like these, assertions related to your test setup can be helpful. (Note that sometimes this problem can simply be solved with better test/variable names or with a test that's designed better. Nonetheless, sometimes setup-related assertions are helpful and even necessary for achieving this goal of "environment enforcement".)

In the case of `FormObserver.test.tsx`, since I'm using global constants and helper functions that I expect to be used across **ALL** of the tests, I want to _enforce_ a reliable testing environment across **ALL** of the tests. Attempting to enforce the same proper environment in each individual test would result in duplicated lines of code. Therefore, all of these "environment-enforcing" assertions are moved to the `beforeAll` block and to the helper function blocks (whichever makes the most sense for a given assertion). Having this enforcement makes it apparent to all developers _what the expectations are_ for the test (both for those improving the tests and for those simply reading the code). The constants simply communicate, "Here's what to use for each test". The assertions go a step further by communicating, "Here is the environment within which you _must_ operate and within which you are _guaranteed_ to operate for each test."

Enforcing a proper testing environment isn't only helpful for the developers on this project, but it's also helpful for the end users. The `FormObserver` class serves as the foundation for the _entire_ project. Every other kind of form-related observer which this project provides extends the `FormObserver`. And consequently, all of the integrations with frontend frameworks that this project provides _also_ depend on the `FormObserver`. The base `FormObserver` class is the most important class in this project. Therefore, guarding it heavily (with a _healthy_ amount of paranoia) even when it comes to test setup is in _everyone_'s best interest. Such heavy guarding also helps prevent the tests from being broken during updates (which, again, is in everyone's best interest).

#### Conditional Assertions Based on the Current `testCase`

You'll notice that the large majority of my tests are run in a [`describe.each`](https://jestjs.io/docs/api#describeeachtablename-fn-timeout) block. I've set things up this way to prove that each "variation" (or "overload") of the `FormObserver` satisfies the expected test criteria in its own way.

The point of the `describe.each` block is to reduce code duplication. _All_ variations of the `FormObserver` will need to satisfy the same test criteria. Thus, we prefer

```ts
describe.each(["test-variation-1", "test-variation-2", "test-variation-3"])("Test variation: %s", (testVariation) => {
  it("Does something", () => {
    /* ... */
  });
});
```

over

```ts
describe("test-variation-1", () => {
  it("Does something", () => {
    /* ... */
  });
});

describe("test-variation-2", () => {
  it("Does something", () => {
    /* ... */
  });
});

describe("test-variation-3", () => {
  it("Does something", () => {
    /* ... */
  });
});
```

The former (i.e., the `describe.each` implementation) is especially advantageous as the number of tests increase _or_ the number of describe blocks increase. As you can probably tell, it has several benefits:

1. **It enforces that all necessary tests are present**. With a `describe.each` block, we can enforce that the `"Does something"` test runs _and passes_ for every `describe` block generated by the testing loop. _Without_ a `describe.each` block, we would need to _remember_ to write each test _manually_ for each individual `describe` block.
2. **It enforces consistent spelling and casing for all tests**. With a `describe.each` block, I can guarantee that a test named `"Does something"` is properly spelled and cased for every `describe` block generated by the testing loop. _Without_ `describe.each`, I would need to enforce spelling and casing _manually_ for this test in _every single `describe` block_. As the number of tests and `describe` blocks increase, this becomes a difficult, error-prone (and likely neglected) task.
3. **It reduces code duplication**. Without using `describe.each`, you will duplicate code for every `describe` block you create, for every `it` (test) block you create, and very likely for every [setup-related] line of code that you write in each `it` block. The `describe.each` example that I showed above is 5 lines of code; the 2nd example is 17 lines of code -- more than **triple** the size of the `describe.each` implementation. The significance of this only increases as you add more lines of code, more `it` blocks, and _especially_ more `describe` blocks.
4. **It keeps each test in one place**. Leveraging `describe.each` reduces the amount of scrolling that developers need to do to find the right test. To find the correct `"Does something"` test, developers only need to look in _one place_. This is obviously not the case with the 2nd example, where the developer would have to search in 3 places to find the correct test. The example that I showed earlier was pretty small and simple; but for a file with many `describe` blocks and many tests, it could be hard for a developer to find the `"Does something"` test in the `"test-variation-2"` description block.

Unfortunately, because the implementation details of the `FormObserver` vary slightly depending on the constructor overload used, there are slight variations in how the tests need to be implemented in some cases. Because of this, I sometimes need to use conditional statements based on the current `testCase` (i.e., the current iteration of the `describe.each` loop) to know what kind of test implementation is needed for that specific `testCase`. I also need a `getFormObserverByTestCase` helper to make sure that the _right kind_ of `FormObserver` is instantiated for each `testCase`. As you can see, this isn't the most attractive approach to writing tests. Nonetheless, I've stuck with this approach because I believe it makes the most sense for my use case.

Here are some alternatives I considered, and why I didn't go with them:

1. **Ditch the `describe.each` block to avoid the awkward conditional statements**. We've already looked at a list of reasons for _why_ the `describe.each` block is far more advantageous than manually writing individual `describe` blocks with duplicated test names (or even completely duplicated tests). It's far less error prone to just use `describe.each`. And for some (if not all) of the tests, `describe.each` makes the code smaller and more readable. Given all of the shared test cases needed for the different variations of `FormObserver`, I simply _cannot_ take a non-looping approach.
2. **Conjure up a way to write consistent tests _without_ the need for awkward conditional statements**. Doing this would require some kind of `for` or `forEach` loop, variables that allow us to use consistent names for all of our tests, and perhaps a function to simplify the test-structuring process. However, by the time you come up with such an implementation, you more or less end up with `describe.each`. The implementation _might_ be better. But even if it is, a newcoming developer (or my future self) will still need to _learn_ how that implementation works. `Jest` is already a familiar testing tool with clear documentation. It will be much easier for a new developer to adjust to `describe.each` than it will be for them to adjust to an edge-case spin-off of `describe.each`.

If you think you know a better implementation for testing `FormObserver` whose mixture of pros and cons is more palitable than what's already present, then feel free to share it! :smile:

### Why Does the `FormValidityObserver` Only Observe 1 Form at a Time?

Allowing the `FormValidityObserver` to observe more than 1 `form` at a time would require all validation data to be scoped _not only_ by field information (e.g., `field.name`), but also by form information (e.g., `form.name`). With something like the `FormStorageObserver`, this isn't really a big concern because the class is very simple to use and is not significantly complicated by supporting this functionality. Moreover, since the `FormStorageObserver` saves data to `localStorage` instead of a place exclusive to each instance of the class, the data _must_ be scoped by form information (i.e., `form.name`) anyway. However, the story is quite different for the `FormValidityObserver`.

The largest concern with the `FormValidityObserver` is that it becomes much more complex if the validation data has to be scoped by both field _and_ form information. Such a restriction would ultimately require users to supply form information to `register`, `setFieldError`, `clearFieldError`, and the like -- making these methods far less convenient. Additionally, it would make the code harder to read and maintain. All of this complexity arises for a use case that users probably don't care for anyway ... Thus, it generally makes life easier for everyone if only 1 form is observed at a time.

More than likely, people will be content to make a `FormValidityObserver` for each individual form that they want to validate. In fact, it seems more difficult to manage form state and form errors if you're combining the data for _all_ forms into a single place instead of letting each form naturally manage its own data.

These are the reasons that we only allow a `FormValidityObserver` to observe 1 form at a time.

### Why Are Radio Buttons Only Validated When They're inside a `fieldset` with Role `radiogroup`? (`FormValidityObserver`)

Admittedly, this was a somewhat strong design decision. It was made for two reasons: 1&rpar; It makes the _developer's_ web apps more _accessible_ and more semantically correct; 2&rpar; It simplifies the code in `FormValidityObserver`.

Accessible error messages for radio groups don't typically get placed next to individual radio buttons. Instead, there is an element that contains all of the radio buttons, and it's this container that displays the error messages related to the radio buttons that it holds. This container is also the element that should be marked as `aria-invalid` when there's an error with the radio group.

But how is the `FormValidityObserver` (or any JS package for that matter) supposed to know which element is acting as the container for all the radio buttons? Technically speaking, a developer could use _any_ element as the container, even if the element was neither semantically correct nor accessible. So it's impossible to know which element is a radio group's container without either: A&rpar; Making assumptions or B&rpar; Requiring the radio group's container to match specific criteria. We went with option B since there's no reliable way to work with option A.

The criteria we've required, however, are nothing more than what current web standards require. [According to the W3C Web Accessibility Initiative](https://www.w3.org/WAI/tutorials/forms/grouping/#radio-buttons) (WAI), radio button groups should _always_ be grouped using `<fieldset>`. This means that if you're writing a form that you want to adhere to proper HTML semantics _and_ that you want to be accessible, you'll need to use the `fieldset` element as your radio group container anyway.

The `fieldset` element [implicitly has the `group` ARIA role](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/fieldset#technical_summary). However, not all `fieldset`s pertain to radio buttons; and clearer information can be communicated to users if a `fieldset` for a group of radio buttons is explicitly specified as a [`radiogroup`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/radiogroup_role). Thus, in order to improve accessibility, and in order to help the `FormValidityObserver` distinguish between radio-related `fieldsets` and non-radio-related `fieldsets`, the `FormValiditObserver` requires validated radio button groups to be placed within a `fieldset` with `role="radiogroup"`.

### Why Are the Validation Rules for a Radio Button Group Required to Be on the First Radio Button in the Group? (`FormValidityObserver`)

This is a decision that was made to improve the performance and maintainability of the `FormValidityObserver`. Most form fields are singular. That is, a single value in a form is typically represented by a single field. The exception to this rule (and perhaps the only exception) is the radio button group, where a single value in a form is represented by multiple fields with the same `name`. The JavaScript standard recognizes this as the single exception for form fields by the fact that the only (non-null) return values for [`HTMLFormElement.elements.namedItem()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormControlsCollection/namedItem) are `Element` and `RadioNodeList`.

The question that arises from this is, "What radio button do we look to for a radio group's validation rules?" Do we look at all of the radio buttons? What if the radio buttons have conflicting validation rules? Do we resolve them? Combine them? Do we only look at a single radio button? If so, which one?

Ultimately, there is no _clear_, _reliable_ way to determine the correct validation rules to use for a radio group if _all_ radio buttons in the group can receive the rules. And even if there was a clear _and_ reliable approach, it would still not be performant to search through _all_ of the radio buttons to determine the correct validation rules to use whenever a radio group needs to be validated. Consequently, we chose to require the validation rules for a radio group to be applied to the first radio button in that group. It's simple. It's clear. And it's reliable. (This restriction is compatible with conditional rendering in JS frameworks as long as the radio button that is _currently_ first in the group has the appropriate attributes. But it is likely uncommon that the first radio button in a group will be conditionally rendered anyway.)

### Why Is `setCustomValidity` Called on the First Radio Button in a Radio Group? (`FormValidityObserver`)

[The browser does not currently support calling `setCustomValidity` from a `fieldset` element.](https://github.com/whatwg/html/issues/6870) Consequently, there is no way to use the browser's form error messaging system to display error messages on a radio group container. In fact, since the browser itself is unable to determine which element/container represents an entire _group_ of radio buttons, it always displays errors for a radio _group_ on the first radio button in the group. (This is different from displaying error messages for individual radio buttons, which can only happen when a radio button is manually given a custom error message. But practically speaking, this situation should never be caused or encountered.) Thus, when the `FormValidityObserver` uses `setCustomValidity` to display an error message for a radio group, it keeps in step with the browser's behavior by calling `setCustomValidity` from the first radio button in that group.

### Why Doesn't the Core `FormValidityObserver` Sanitize the HTML That It Renders?

The `FormValidityObserver` handles error messages rendered to the DOM in a rather secure fashion. When it knows that error messages will be rendered to the DOM as _raw strings_, it uses the secure and efficient [`Node.textContent`](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent) property for displaying error messages. Moreoever, when error messages will be rendered to the DOM as HTML, the `FormValidityObserver` will attempt to use the secure [`Element.setHTML`](https://developer.mozilla.org/en-US/docs/Web/API/Element/setHTML) method for displaying errors if it is available to the browser. However, if `Element.setHTML` is unavailable, then the `FormValidityObserver` will default to [`Element.innerHTML`](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML). This decision was made because it seemed the most practical.

[According to MDN](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Safely_inserting_external_content_into_a_page#html_sanitization), the [`dompurify`](https://github.com/cure53/DOMPurify) NPM package provides a trusted and reliable way to sanitize HTML. And when it comes to security, it's often wiser to leverage what's already well-established than it is to create something else that could be less reliable. However, including `dompurify` (or even writing our own sanitization function) adds to the `@form-observer/core`'s bundle size despite the fact that HTML santization may not even be needed. As long as the HTML being rendered to the DOM doesn't include the user's input or some other external source, `Element.innerHTML` is completely safe. In fact, there are popular JS frameworks that use `Element.innerHTML` safely to update the DOM.

Practicaly speaking, most of the use cases for rendering error messages to the DOM as HTML _would not_ require the message to include the user's input (or some other external source). So it seemed like overkill to include a DOM sanitization package (or custom function) in `@form-observer/core`. Just as [`React`](https://react.dev/) does not take responsibility for [`dangerouslySetInnerHTML`](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html), so we decided that developers _choosing_ to render dangerous HTML to the DOM can take responsibility for sanitizing their HTML. This way, no developer downloads extra JS that they don't need.

That said, the JS-framework implementations of the `FormValidityObserver` will try to leverage that framework's approach to rendering markup to the DOM where it is possible/practical. (Typically, a framework's approach to rendering markup will be inherently secure.)

### Why Doesn't `FormValidityObserver.register` Require a `form` to Be Observed?

If you've paid close attention, you'll notice that all of the methods on `FormValidityObserver` that relate to form field validation (`validateField`, `setFieldError`, `clearFieldError`, etc.) cannot be called until a valid `HTMLFormElement` is observed. The exception to this rule is the `register` method, which can be called regardless of whether or not a `form` is already being observed. Someone (including myself) may ask, "Why make an exception for `register`?" Well ... for a couple reasons:

#### 1&rpar; The `register` Method Doesn't _Need_ Access to the Underlying `HTMLFormElement`

The `validateField`, `setFieldError`, and `clearFieldError` methods require access to the underlying `form` element in order to work properly. The reason is that when a user passes the `name` argument to one of these methods, the method needs to identify the _correct_ field which has the _correct_ `name` _and_ which belongs to the _correct_ `form`. The simplest and most accurate way to determine the correct field by `name` is to leverage the `namedItem` method exposed by the _currently-observed_ `form`. Consequently, these methods require a `form` to be observed before being called. (Even if these methods could somehow work _without_ observing a `form`, it still wouldn't really make sense to start validating fields without identifying the `form` of interest anyway.)

By contrast the `register` method _does not_ require access to the underlying `form` element. All that `register` needs to do is keep track of the error messages associated a field's constraints. It can organize these constraints into key-value pairs, where the `key` is the `name` of the form field and the `value` is the group (object) of error messages associated with said field. Thus, there is no need for `register` to require a `form` to be observed.

#### 2&rpar; Requiring a `form` to Be Observed before Calling `register` Breaks SSR and Initial Page Load in JS Frameworks

All JS frameworks require a component to be mounted _before_ the developer can access any underlying DOM nodes that the component renders. This, of course, makes sense. The developer cannot operate on a DOM node that doesn't exist yet. Thus, the developer must wait to operate on DOM nodes until _after_ the component has finished mounting and finished rendering actual elements to the DOM.

Unfortunately, this places a restriction on `FormValidityObserver`. The most convient way to use `register` in a JS framework is as follows:

```tsx
<input {...register("my-name", { pattern: { value: "\\d+", message: "Use proper pattern please." } })} />
```

However, with this approach, the call to `register` would happen _during_ the initial client-side render (i.e., _before_ the component has mounted and thus _before_ any `form` elements can be observed) and during SSR (where there is no concept of a browser or DOM node at all). This means that -- if we _required_ a `form` to be observed before calling `register` -- all calls to `register` would fail during SSR / initial page load, resulting in confusing errors to developers using JS frameworks.

This is the strongest reason _not_ to require a `form` to be observed before calling `register`. And from the aforementioned points, such a decision basically affords no harm to the developer. Thus, we decided to allow `register` to be called without a observing a `form` first.

### Why Doesn't the Core `FormValidityObserver` Apply the Proper Attributes to Form Fields?

If you read _[Why Doesn't `FormValidityObserver.register` Require a `form` to Be Observed?](#why-doesnt-formvalidityobserverregister-require-a-form-to-be-observed)_, then you're aware that the `register` method of the `FormValidityObserver` can be enhanced to _automatically_ apply the proper attributes to a registered field based on the rules that are supplied in the method call. Although this _is_ done in our framework-specific implementations, it is _not_ done in the core class. Some of you (including myself) may wonder why.

The reason for this decision is user experience (for the end users interacting with a web app's form). If a web server doesn't use a JS framework and it only serves raw, static HTML and JavaScript files individually, then there is no way for the core `FormValidityObserver` to guarantee that the rendered form fields have the correct attributes during the initial page load. The observer could use `field.setAttribute` to apply the correct attributes _after_ the initial page load. But such a solution is not reliable for users who fail to download the necessary JS files.

In order to ensure the best user experience by helping out those who have JS disabled or who are randomly unable to download JS, a developer would have to manually set the proper attributes for the form fields in the HTML file anyway. If the developer does this, then `register` doesn't need to do anything. (And the developer most definitely _should_ do this for their users. That way, the users at least get _some_ helpful native browser validation if they don't have any access to JS. With this approach, the server will also receive less invalid requests from forms.) So, the [_intentional_] assumption is that the developer _will_ shoot for the better user experience -- implying that the _core_ `FormValidityObserver`'s `register` method doesn't have to set any attributes. However, just in case the developer doesn't do this, `register` will at least warn devs about any validation attributes missing from a registered form field. That is the best that we can do while also _encouraging_ more user-friendly web apps.
