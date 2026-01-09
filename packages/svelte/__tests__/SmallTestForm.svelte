<form aria-label={labels.default ?? "Test Form"} use:autoObserveDefault>
  <input {...configure("textbox", { pattern: { value: "\\d+", message } })} type="textbox" />
</form>

<form use:autoObserveTrue={true} aria-label={labels.true}></form>
<form use:autoObserveFalse={false} aria-label={labels.false}></form>

<!-- TODO: Figure out if there's a cleaner way to setup this Test Web Form Environment -->
<script lang="ts">
  import { createFormValidityObserver } from "../index.js";

  export let message: string;
  export let labels: { default?: string; true?: string; false?: string } = {};

  const type = "input";
  const { autoObserve: autoObserveDefault, configure } = createFormValidityObserver(type);
  const { autoObserve: autoObserveTrue } = createFormValidityObserver(type);
  const { autoObserve: autoObserveFalse } = createFormValidityObserver(type);
</script>
