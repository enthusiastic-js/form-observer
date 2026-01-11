<template>
  <form v-auto-observe :aria-label="testFormLabels.directiveDefault">
    <input name="text" type="text" required />
  </form>

  <form v-auto-observe-true="true" :aria-label="testFormLabels.directiveTrue">
    <input name="text" type="text" required />
  </form>

  <form v-auto-observe-false="false" :aria-label="testFormLabels.directiveFalse">
    <input name="text" type="text" required />
  </form>
</template>

<!-- TODO: Figure out if there's a cleaner way to setup this Test Web Form Environment -->
<script lang="ts" setup>
import { createFormValidityObserver } from "../index.js";
import testFormLabels from "./testFormLabels.js";

const type = "input";
const { vAutoObserve } = createFormValidityObserver(type);
const { vAutoObserve: vAutoObserveTrue } = createFormValidityObserver(type);
const { vAutoObserve: vAutoObserveFalse } = createFormValidityObserver(type);
</script>
