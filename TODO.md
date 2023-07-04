# TODO

## `FormValidityObserver`

- [ ] Add docs at some point on why we _don't_ allow structuring form data as nested objects like `React Hook Form`, `Conform`, etc.
  1.  It adds additional overhead to the project to try to support it
  2.  The form data submitted to the server is not going to have this unusual structure anyway if you're using progressive enhancement (unless you want to validate 2 different structures of form data ... which is unnecessarily complicated). Therefore, it's better to just embrace what HTML gives you out of the box. If you're trying to think of how to group your data (e.g., address fields), think about using `names` that help you scope things better. For example, use `address_street`, `address_city`, and the like. Then, on your server, you can determine scoping by `split`ing strings by underscores.
- [ ] Perhaps somewhere we should explain that this is a library built with progressive enhancement in mind ... and that we seek to _embrace_ and _extend_ native HTML/JS features (like Svelte) instead of recreating them in a complex or less efficient fashion. The previous TODO item is an example of this ... We're thinking of progressively enhnaced web apps by default, therefore we're thinking about the server, therefore there's no point in supporting weird nested object data for form fields on the frontend.
  - Even thinking about that ... Perhaps it would be good to get a clear idea of: "What Problem Is Our Library Trying to Solve?" And perhaps we can aim to communicate that clearly for the users of our package.
- [ ] Maybe we should have a "potential pitfalls" or "pro tips" section?
  - [ ] For example, anyone who extends the `FormObserver` should probably use arrow functions for event handlers if they ever want to use `this` ... It will make life much easier.
  - [ ] In a similar vein, should we add a warning that radio buttons must be semantically correct in order for them to participate in field validation? This really shouldn't be an issue; but since this isn't enforced by React (due to state), some people may need to know this. This would basically just mean that radios belonging to the same group would need to share a common `name`.
