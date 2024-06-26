# Changelog

## 2024-05-05

### v0.9.1 (All Packages)

#### Bug Fixes

- Enable `radiogroup`s to properly partake in field <strong><em>re</em></strong>validation.

### v0.9.0 (All Packages)

#### Features

- Field revalidation is now supported with the `FormValidityObserver` via the `revalidateOn` option.
- You can now pass `null` to the `type` argument of the `FormValidityObserver` to use it in "Manual Mode".

Please see the [documentation](./docs/form-validity-observer/README.md) for more details on how to use these new features.

#### Breaking Changes

- Arrays are no longer supported for the `FormValidityObserver`'s `type` constructor argument.
- The `useFormValidityObserver` React hook has been removed because it isn't genuinely useful. The new recommendation is to replace all calls to `useFormValidityObserver` with [memoized](https://react.dev/reference/react/useMemo) calls to `createFormValidityObserver`. (**React only**)

If you'd like to understand why these breaking changes were made, please see the [Design Decisions](./docs/extras/design-decisions.md) document.

## 2024-04-21

### v0.8.0 (All Packages)

#### Features

- Support rendering error messages to the DOM by default. (This opens the door for using JS framework state to render error messages to the DOM. It also opens the door for safely using a framework's `render` function to render error messages to the DOM. See [this PR](https://github.com/enthusiastic-js/form-observer/pull/6) for additional details.)

#### Bug Fixes

- Fixed a bug in `@form-observer/react`'s `useFormValidityObserver` function where updates to the `defaultErrors` option would not cause the hook to update its memoized value.

## 2024-02-11

### v0.7.2 (Solid, Lit, Preact)

- Enable developers to configure the default error messages to display for the validation constraints. (This will help remove redundancy from codebases.)
- Enable developers to use a default custom validation function for all of their form fields.

(Note: Version `0.7.1` is buggy for `Lit` and `Preact` and should not be used. Use `0.7.2` instead.)

### v0.7.1 (Core, React, Vue, Svelte)

- Enable developers to configure the default error messages to display for the validation constraints. (This will help remove redundancy from codebases.)
- Enable developers to use a default custom validation function for all of their form fields.

## 2023-12-27

### v0.7.1 (Solid)

#### Bug Fixes

- Corrected the default `renderer` function for `@form-observer/solid` to take into account the core `FormValidityObserver`'s new error-clearing behavior in `v0.7.0`.

### v0.7.0 (All Packages)

- The `clearFieldError` method has been refactored to call the `FormValidityObserver`'s `renderer` function with `null`. This change will allow the core `FormValidityObserver` to leverage a given JS Framework's `render` function more seamlessly.

### v0.7.0 (Preact)

#### Features

- There is now a `Preact` integration for the Form Observer tools via the `@form-observer/preact` NPM package.

## 2023-12-22

### v0.6.3 (Lit)

- Correct documentation in package README

### v0.6.2 (All Packages)

#### Features

- `FormObserver.unobserve()` will now remove event listeners from the correct Root Node even if the method is called _after_ a given `<form>` is moved to a different root.

### v0.6.2 (Svelte)

#### Bug Fixes

- Memory leaks will no longer occur when an `autoObserve`d form is repeatedly removed from and added to the DOM.

### v0.6.2 (Lit)

#### Features

- There is now a `Lit` integration for the Form Observer tools via the `@form-observer/lit` NPM package.

## 2023-12-10

### v0.6.1 (All Packages)

#### Features

- It is now possible to simultaneously `observe` multiple forms in _different_ `Document`s/`ShadowRoot`s with a single `FormObserver` (or one of its subclasses).

#### Bug Fixes

- The `FormObserver`, `FormStorageObsever`, and `FormValidityObserver` are now able to work with forms inside of a Shadow DOM.
  - Note: Mixing a single form's controls between the Light DOM and the Shadow DOM (or between multiple distinct Shadow DOMs) is still [prohibited](./docs/form-observer/guides.md#be-mindful-of-the-shadow-boundary) because it goes against the Web Standard.

#### Breaking Changes

- An `HTMLFormElement` must now be added to the DOM _before_ it can be `observed`. (In practice, this will happen naturally/automatically.)
- An `HTMLFormElement` must now be `unobserved` _before_ it can be removed from the DOM or relocated to a new [root node](https://developer.mozilla.org/en-US/docs/Web/API/Node/getRootNode). (Again, in practice, this will happen naturally/automatically.)
