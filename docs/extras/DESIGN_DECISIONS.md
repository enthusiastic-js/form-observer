# Design Decisions

If you've already read my [`Development Notes`](./DEVELOPMENT_NOTES.md), then you'd probably guess that this file serves a similar purpose. And indeed, this file serves the exact same purpose as `Development Notes`, but it was split out from that file so that I could give special attention to key design decisions that I've made over time.

"Why am I using this implementation now? Was there a better one in the past, or is the current one better?" These sorts of questions get asked when returning to a codebase after spending an extended period of time away from it. And I want to have answers to these kinds of questions when I return to my code. (This also gives me confidence that _hopefully_ I know what I'm doing, and that I can move forward with confidence that my current approach to the project at least makes _some_ sense.)

Note that as you see the arguments laid out here, I'm more so trying to convince my future self than I am trying to convince you. If the arguments convince you too, hopefully that means I'm saying things that are valid.

**This file is only updated when previously-established designs are overturned/rewritten**. Therefore, as a [general] rule, when something goes through its first iteration, this file _will not_ be updated.

This file is similar to a `Changelog`: It specifies the dates (in descending order) at which certain noteworthy design changes were made, and it explains the reasoning behind those changes. Maybe you'll find this helpful; maybe you won't. In either case, I likely will. :&rpar;

It's possible that the need for this is already captured in the concept of `PR` (Pull Request) history. We will try to run with this approach _and_ the approach of PRs before coming to a final decision on what to use to accomplish this history-preserving goal.

## 2023-08-20

### Deprecate the `FormValidityObserver.validateFields(names: string[])` Overload

Originally, when we were first thinking through the designs of the `FormValidityObserver`, the `validateFields(names)` overload was a _convenience_ function. At the time, we were already intending to have `validateFields` loop over all of the _"registered"_ (now `configured`) field names. So we figured, "Why not let the developers loop over a _subgroup_ of those fields"?

Well... Things have changed. And the biggest change on this front is that the `FormValidityObserver` no longer requires a field to be `configured` for it to participate in validation. Supporting new features -- such as focusing the first field that fails validation in a form -- has made it more difficult to support validating all of a form's fields (1st overload) _and_ validating a specific set of named fields (2nd overload) simultaneously. Given that we don't want this additional complexity in the `FormValidityObsever`, given that the `validateFields(names)` overload isn't likely to be used often, and given that the overload can be written rather easily in userland, we are now deprecating `validateFields(names)` to make our own codebase more maintainable. Here's the justifification:

In a situation where a developer would run

```js
formValidityObserver.validateFields(["first-field", "second-field"]);
```

they could just as easily run

```js
["first-field", "second-field"].forEach((name) => formValidityObserver.validateField(name, options));
```

Admittedly, the latter option is _slightly_ more verbose than the former option. However, both options can be written easily in 1 line. And the latter option is technically more _explicit_ (because any reader of the code immediately knows _exactly_ what's happening).

Since the developer knows which combinations of fields include asynchronous validators, they can easily handle the `Promise`-based version as well:

```js
const names = ["first-field", "second-field"];
await Promise.allSettled(names.map((name) => formValidityObserver.validateField(name, options)));
```

Again, this is more explicit, and it's very simple. So we don't think that dropping support for the `validateFields(names)` overload will actually be disadvantageous for anyone. We feel comfortable dropping support for the overload in light of this.

## 2023-08-07

### Rename `FormValidityObserver.register` to `FormValidityObserver.configure`

We're mainly making this note so that the history of this document is not confusing. What was previously referred to as the `register` method is now the `configure` method as of today.

We believe that this new name makes much more sense because this method isn't actually _registering_ the field with anything. Instead, it's registering _error messages_ for a given field. But because of existing libraries like `React Hook Form` and `Final Form`, some developers may get confused and think that `FormValidityObserver.register()` is actually necessary to ensure that our library works properly. Thus, we changed the name to something more easily understood: `configure`. One could say that the method configures the error messages for the specified field. But one can also say that the method is configuring the field itself with the provided error message details. So `configure` seems to work well here.

## 2023-08-06

### Remove Attribute-Constraint Reconciliation (Also Called "Attribute-Rule Reconciliation") from `FormValidityObserver.register()`

This change was made for the sake of DX and Performance.

Previously, the `FormValidityObserver.register()` method would run some strict checks on the field whose error messages were being registered. Specifically, the observer would throw an error if the field being configured did not exist in the observed `form` _or_ if said field lacked any constraint-related attributes that seemed necessary based on the provided error message configuration. In the end, we have deemed this approach to be overinvasive and unprofitable. There are 2 primary reasons for this:

#### 1&rpar; This "Feature" Breaks Conditional Rendering

There are some applications which conditionally render form fields based on some of the values that the user has already supplied to the `form`. Some developers may want to register error messages for fields _that have not yet been rendered_. This is a valid use case. But throwing an error when a configured field is not found in the `form` will make it impossible to satisfy this use case.

Although it is likely less common, similar concerns could also be brought up for conditionally applied _attributes_.

#### 2&rpar; This "Feature" Creates Unnecessary Overhead

It probably isn't _that_ bad to loop over the values of the `errorMessages` object passed to the `register` method in order to perform what we called "attribute-constraint reconciliation". But still... for a feature that no one asked for -- and probably that no one really cares for -- it's a net loss in performance... with no real benefit. (Technically speaking, our previous approach was also not all-encompassing anyway. We won't dive into that though.)

Those two things considered, we've reverted `register` to a simple method that updates the `FormValidityObserver`'s local store of field-associated error messages. Generally speaking, attribute-constraint reconciliation won't be a concern for anyone using a JS Framework. Developers who aren't using JS frameworks can make sure that they aren't registering unused error messages on their own. We don't need to aggressively handle this for them.

## 2023-03-08

### Only Allow `FormStorageObserver` to Support `localStorage`

Contrary to the rule I declared at the beginning of this document, this actually isn't a response/update to previously committed code. _However_, this _is_ a divergence from the original ideas that I had for the `FormStorageObserver`.

Originally, my hope was for the `FormStorageObserver` class to support _all_ kinds of `form` data storage. By default, the class would use `localStorage` to store `form` data; but the user would be able to supply _any_ custom interface that had the `setItem`, `getItem`, and `removeItem` methods -- just like `localStorage`. This way, they'd be able to store `form` data in any way that they wanted (for instance, in an in-memory object) -- not just with `localStorage`. Unfortunately, after trying to work with the idea, I concluded that it wasn't practical or worthwhile, and I abandoned the idea entirely.

When it comes to storing or retrieving `form` data, we _need_ to know the kind of data being stored because this influences how the data is transformed during data storage/retrieval. That is, we need to know "Is this data for a checkbox?" ("Should I store this as a stringified `boolean`?"), "Is it data for a multi-select?" ("Should I store this as a stringified `array`?"), "Is it data for a regular text input?" ("Should I store this as a stringified `string` [sic]?"), etc. This information is _necessary_ to make sure that the form fields are _correctly_ initialized whenever data is loaded from the "storage" into the actual fields. For instance, a checkbox will need its `checked` property/attribute updated with a valid `boolean` during loading, whereas a regular text input will need its `value` property/attribute updated with a valid `string`.

Additionally, the `setItem`, `getItem`, and `removeItem` methods of the `localStorage` interface expect to be working with stringified data. But perhaps not everyone wants to work with stringified data. For instance, maybe they want the `setItem` method to accept a generic data type instead of just a `string`. (In other words, perhaps they want to store and retrieve data as a literal `boolean` instead of as a stringified `boolean`.)

This situation brings up a lot of questions if we want users to be able to store data in different ways. Do we want users to be able to supply "transformers" for data storage/retrieval? How do we enforce that the end users write "transformers" that take into account the types of data being stored (checkbox data, mutli-select data, text field data, etc.)? Do we want users to _only_ be able to store stringified data (as in the case of `localStorage`), or do we want to support other types of data? Does the end user even want to be bothered with these concerns? How will our `FormStorageObserver` class handle these things in a clear and performant way without sacrificing the code's maintainability?

The questions go on and on. And although valid solutions exist, trying to handle these cases would ultimately make `FormStorageObserver` slower _and_ more difficult to maintain. Moreoever, it's highly unlikely that a significant number of people are going to be desperate for a storage option besides `localStorage`. Most folks just want an easy way to throw `form` data into `localStorage`. That's it. It's sufficient to support that instead of diving into impractical use cases.

A big benefit of making a `FormStorageObserver` that _only_ supports `localStorage` is that in some cases we can leverage local functions or `static` class methods that are only defined once. (This should save on memory per each instance of `FormStorageObserver`.) Another big benefit is that the code remains very simple since _we_ get to define how the data transformation operates. (And from this information, we can make decisions that optimize performance when interacting with `localStorage`.) So ... it seems wiser for now to only support `localStorage`.

If users _truly_ needed something more, we _could_ add it. However, it would probably make more sense for the end user to create their own solution. More than likely, the end user will have a single preferred way of storing `form` data across their application. (Consistency is incredibly valuable.) Thus, if for any reason something _other_ than `localStorage` was needed (again, highly unlikely), then the user could extend the `FormObserver` to create something similar to the `FormStorageObserver` -- but for their specific use case. The public code in the `FormStorageObserver` file should make it clear how to go about that. (This is another reason to keep the `FormStorageObserver` _clear_ and _maintainable_).

For now, we shouldn't overcomplicate things if `localStorage` is what will be used by most people for `form` data storage.

#### Additional Thoughts

##### Why Aren't You Supporting `sessionStorage`?

Because `sessionStorage` and `localStorage` behave the exact same way when it comes to their `setItem`, `getItem`, and `removeItem` methods, it would be possible for the `FormStorageObserver` to allow the end developer to choose which kind of storage they used. However, I consider this impractical for 3 reasons:

**First: The user experience is better with `localStorage`**. If a user is working through a long/complex form and they are forced to close the browser for any reason (or perhaps they accidentally close their tab/browser), they will lose all of their progress if `sessionStorage` is used. Not so with `localStorage`. Thus, why bother with `sessionStorage` if `localStorage` provides a better user experience?

**Second: If the life of the `form` data is a concern, the developer will need to take responsibility for it anyway**. Although it would be a little odd, someone could argue that using `sessionStorage` makes life easier because the `form` data would automatically be cleared when the browser tab is closed. However, it doesn't make sense to leave a user's storage cluttered with obsolete data for any period of time. As soon as the `form` data becomes irrelevant, it should be removed. This benefits the users of our web apps, and it likely shields us developers from potential sources of unnecessary confusion. Whether `localStorage` or `sessionStorage` is used, this cleanup will have to be done; so we may as well keep things simple by keeping to one approach over the other (in light of the earlier points).

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
