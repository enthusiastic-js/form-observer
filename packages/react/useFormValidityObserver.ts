import type { OneOrMany, EventType } from "@form-observer/core/types";
import type { FormValidityObserverOptions } from "@form-observer/core/FormValidityObserver";
import { useMemo } from "react";
import createFormValidityObserver from "./createFormValidityObserver";
import type { ReactFormValidityObserver } from "./createFormValidityObserver";

/** Creates an enhanced version of the {@link FormValidityObserver} that's more convenient for `React` apps */
export default function useFormValidityObserver<T extends OneOrMany<EventType>, M = string>(
  types: T,
  options?: FormValidityObserverOptions<M>,
): ReactFormValidityObserver<M> {
  return useMemo(() => {
    return createFormValidityObserver(types, options);
  }, [types, options?.useEventCapturing, options?.scroller, options?.renderer]);
}
