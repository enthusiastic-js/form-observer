# Changelog

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
