import type { OneOrMany, EventType } from "@form-observer/core/types.d.ts";
import type { FormValidityObserverOptions } from "@form-observer/core/FormValidityObserver.js";
import { useMemo } from "react";
import createFormValidityObserver from "./createFormValidityObserver.js";
import type { ReactFormValidityObserver } from "./createFormValidityObserver.js";

/** Creates an enhanced version of the {@link FormValidityObserver} that's more convenient for `React` apps */
export default function useFormValidityObserver<T extends OneOrMany<EventType>, M = string>(
  types: T,
  options?: FormValidityObserverOptions<M>,
): ReactFormValidityObserver<M> {
  return useMemo(() => {
    return createFormValidityObserver(types, options);
  }, [types, options?.useEventCapturing, options?.scroller, options?.renderer]);
}
