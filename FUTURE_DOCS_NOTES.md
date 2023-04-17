# Future Docs Notes

This is a TEMPORARY file intended to capture some thoughts that I want to put in the documentation of this package in the future. More specifically, this file contains important notes that I'm likely to forget by the time I actually write the docs. The notes that you see here are not necessarily the final form of the notes that will appear in the docs.

## `FormObserver.observe`

**Warning**: For performance reasons, each instance of `FormObserver` assumes that _all_ of the `form`s which it observes belong to the same `Document`. More specifically, it assumes that the `ownerDocument` of the first `form` that you observe will also be the `ownerDocument` of every other `form` that you observe. If you want to observe `forms` on the same page that belong to entirely different `Document`s, then you should create separate `FormObserver`s for each `Document` involved. (If you're unfamiliar with [`Node.ownerDocument`](https://developer.mozilla.org/en-US/docs/Web/API/Node/ownerDocument), then this is likely something that you _don't_ need to worry about. It would be incredibly unusual to try to observe `form`s across different `Document`s anyway.)

## TODO: Warnings about Erroneous "`RadioNodeList`s" and `FormStorageObserver`

<!-- TODO: After you've added the proper documentation for this section, you should remove the comment related to this documentation from the `FormStorageObserver` -->

We haven't come up with "official" or even "semi-official" documentation for this yet. But basically, if regular fields that _are not_ radio buttons have a situation where their `id`s and `name`s clash, such as in the following case:

```tsx
<input id="my-field" type="text" />
<input name="my-field" type="email" />
```

then `form.elements.namedItem(NAME_IDENTIFIER)`/`form.elements[NAME_IDENTIFIER]` will erroneously return a `RadioNodeList` instead of returning the individual non-radio-button input fields. It seems that whenever `form.elements` contains items that appear to have "similar identifiers" (whether `name` _or_ `id`), that group is automatically marked as a `RadioNodeList` even if it isn't. We need to make developers aware of this potential pitfall when using the `FormStorageObserver`. Though, to be fair, this is more so a problem with the language (and/or the developer's markup) than it necessarily is with how `FormStorageObserver` approaches things.
