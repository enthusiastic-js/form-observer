# Design Decisions

If you've already read my [`Development Notes`](./DEVELOPMENT_NOTES.md), then you'd probably guess that this file serves a similar purpose. And indeed, this file serves the exact same purpose as `Development Notes`, but it was split out from that file so that I could give special attention to key design decisions that I've made over time.

"Why am I using this implementation now? Was there a better one in the past, or is the current one better?" These sorts of questions get asked when returning to a codebase after spending an extended period of time away from it. And I want to have answers to these kinds of questions when I return to my code. (This also gives me confidence that _hopefully_ I know what I'm doing, and that I can move forward with confidence that my current approach to the proejct at least makes _some_ sense.)

Note that as you see the arguments laid out here, I'm more so trying to convince my future self than I am trying to convince you. If the arguments convince you too, hopefully that means I'm saying things that are valid.

**This file is only updated when previously-established designs are overturned/re-written**. Therefore, as a rule, when something goes through its first iteration, this file _will not_ be updated.

This file is similar to a `Changelog`: It specifies the dates (in descending order) at which certain noteworthy design changes were made, and it explains the reasoning behind those changes. Maybe you'll find this helpful; maybe you won't. In either case, I likely will. :)

It's possible that the need for this is already captured in the concept of `PR` (Pull Request) history. We will try to run with this approach _and_ the approach of PRs before coming to a final decision on what to use to accomplish this history-preserving goal.

## 2023-01-29

### Use a Single Collection of Mapped Event Listeners Instead of Creating Mapped Listeners for Each `HTMLFormElement`

This is a change that we believe will improve performance.

The previous implementation was less than ideal because it generated event listeners for _every_ observed `HTMLFormElement`. So if we had a `FormObserver` with 2 listeners, and that observer was used on 4 `HTMLFormElements`, we would have attached 8 event listeners to the `Document`. (Although it is less likely that someone will observe multiple forms simultaneously, this is still a concern worth giving attention to.) This is a bit ironic because one of the main reasons for using event delegation is to boost performance by _reducing_ the number of listeners that we attach to the DOM. We concluded that there has to be a better implementation for `FormObserver.observe` than creating multiple versions of a callback that virtually do the same thing, _taking up memory_ for those callbacks, and then _attaching those callbacks_ to the `Document`. If the listener created for `form1` basically does the same thing as the listener created for `form2`, then we should only need 1 listener -- not 2 uniquely generated listeners.

Here's the thought behind our new solution of using a single, common set of mapped listeners: When the `constructor` of the `FormObserver` is called, we already know what the `listener`s look like from the constructor arguments. So we should be able to map all of the listeners to an event-delegation-compliant representation _once_ during instantation _only_. The only thing that this singular collection of mapped listeners needs is a reference to the `HTMLFormElement`s being observed. For that, we should use a `Set` because it is generally more performant than an `Array` or a `Map`, and it fits our exact needs. (With the listeners only being defined once, we don't need a `Map` from the `HTMLFormElement`s to the listeners anymore; we just need a way to know whether an `HTMLFormElement` is already being observed.)

The only problem with this approach is that we can no longer do

```ts
if (event.target.form !== form) return;
```

because we are _refusing_ to create unique listeners for each individual `HTMLFormElement`. Instead, we'll need to leverage the new `Set` like so:

```ts
if (!this.#watchedElements.has(event.target.form)) return;
```

Doing a simple comparison of references (the previous implementation) is likely faster than performing a `.has` check on a `Set`. However, we have decided to accept this tradeoff. The reason is scalability. Consider these two scenarios:

#### `Set.has` with Few Observed `HTMLFormElement`s

When the developer is watching only _one_ `HTMLFormElement`, then the old implementation is almost certainly more performant. However, it's not that much effort to search a `Set` that only has a size of _1_. The performance difference here is likely negligible.

#### `Set.has` with Many Observed `HTMLFormElement`s

But consider what happens _as the number of observed `HTMLFormElement`s increases_ -- and **especially** if multiple listeners are used at once. In this scenario, the reference comparison is still faster than a `Set.has` check (and even more so now due to the increased `Set` size), but the allocation used up in the previous implementation becomes _multiplicatively_ worse. For example: A `FormObserver` that watches 3 `HTMLFormElement`s and has 4 listeners will have to provide allocation for 12 listeners with the old implementation.

With the new implementation, allocation will only be needed for 4 listeners. Moreoever, the `Set` will only be searching through a collection of size 3; so the search should still be quick. This suggests that the `Set`-based approach scales much better than the previous implementation.

Performance aside, we think this new approach just makes more sense. From a practical standpoint, the `FormObserver` class already knows the general structure of the `listeners` that it's attaching. It really only needs a reference to the `HTMLFormElement`s being observed. Additionally, it's less redundant (and more clear) if the class only maps these listeners _once_ and then keeps a reference to that mapped set of functions (compared to the old implementation). Switching from a reference comparison to a still-efficient `Set.has` check is worth it for maintaining this simplicity.

#### Additional Thoughts

Beyond having to use a `Set.has` check now, we've also removed support for the `this` argument. That is, `this` will no longer be guaranteed to point to `form.ownerDocument`. This decision was made to simplify our code. If someone truly wants to access the form's `Document`, they can just do `event.targert.form.ownerDocument` or `event.target.ownerDocument`.

Some additional questions that might be asked:

##### Have You Considered `HTMLFormElement`s with Tons of Fields?

Someone may raise the concern, "Have you considered that an `HTMLFormElement` could have _tons_ of form fields? How will the new `Set`-based implementation impact performance then?" If that is anyone's concern, you have to bear in mind that a user will typically be interacting with only 1 form field at a time. And as long as an aggressive event type like `"input"` isn't being used, the listeners will be firing rather infrequently. So the points that I made earlier pretty much carry the same weight.

Even if an event type like `"input"` was being listened to, the performance should still be fine overall -- as React has proven. If someone _did_ run into performance issues while listening to an `InputEvent`, the issue would most likely be the listener(s) being used. Otherwise, the issue would likely be that an irrationally large amount of `HTMLFormElement`s were being observed simultaneously. It's highly unlikely that the performance problem would be caused by the fact that we're now using `Set.has` instead of a reference comparison.

##### Why Put the Mapper inside the Constructor? Why Not Make It a Private Method?

The `enhanceListeners` utility function is really only needed when a `FormObserver` is instantiated. There's no reason to allocate space for it for the duration of the instance's life. Thus, we're only allocating space for the function while the `constructor` is being called. As a bonus, defining the utility function _within_ the constructor clarifies to the reader that this utility is _only_ used in the constructor (as opposed to being something that could be used randomly during the instance's life).
