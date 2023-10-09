import { useMemo } from "react";
import createFormValidityObserver from "./createFormValidityObserver.js";

/**
 * Creates an enhanced version of the {@link FormValidityObserver} that's more convenient for `React` apps
 *
 * @template {import("./index.d.ts").OneOrMany<import("./index.d.ts").EventType>} T
 * @template [M=string]
 * @param {T} types
 * @param {import("./index.d.ts").FormValidityObserverOptions<M>} [options]
 * @returns {import("./types.d.ts").ReactFormValidityObserver<M>}
 */
export default function useFormValidityObserver(types, options) {
  return useMemo(() => {
    return createFormValidityObserver(types, options);
  }, [types, options?.useEventCapturing, options?.scroller, options?.renderer]);
}
