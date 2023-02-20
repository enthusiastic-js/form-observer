# Future Docs Notes

This is a TEMPORARY file intended to capture some thoughts that I want to put in the documentation of this package in the future. More specifically, this file contains important notes that I'm likely to forget by the time I actually write the docs. The notes that you see here are not necessarily the final form of the notes that will appear in the docs.

## `FormObserver.observe`

**Warning**: For performance reasons, each instance of `FormObserver` assumes that _all_ of the `form`s which it observes belong to the same `Document`. More specifically, it assumes that the `ownerDocument` of the first `form` that you observe will also be the `ownerDocument` of every other `form` that you observe. If you want to observe `forms` on the same page that belong to entirely different `Document`s, then you should create separate `FormObserver`s for each `Document` involved. (If you're unfamiliar with [`Node.ownerDocument`](https://developer.mozilla.org/en-US/docs/Web/API/Node/ownerDocument), then this is likely something that you _don't_ need to worry about. It would be incredibly unusual to try to observe `form`s across different `Document`s anyway.)
