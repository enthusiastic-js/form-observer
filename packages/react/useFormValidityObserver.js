import { useMemo } from "react";
import createFormValidityObserver from "./createFormValidityObserver.js";

/**
 * Creates an enhanced version of the {@link FormValidityObserver} that's more convenient for `React` apps
 *
 * @template {import("./index.d.ts").EventType} T
 * @template [M=string]
 * @template {import("./index.d.ts").ValidatableField} [E=import("./index.d.ts").ValidatableField]
 * @template {boolean} [R=false]
 * @param {T} type
 * @param {import("./index.d.ts").FormValidityObserverOptions<M, E, R>} [options]
 * @returns {import("./types.d.ts").ReactFormValidityObserver<M, R>}
 */
export default function useFormValidityObserver(type, options) {
  return useMemo(() => {
    return createFormValidityObserver(type, options);
  }, [
    type,
    options?.useEventCapturing,
    options?.scroller,
    options?.renderer,
    options?.renderByDefault,
    options?.defaultErrors,
  ]);
}
