import { renderHook } from "@testing-library/react";
import type { EventType } from "@form-observer/core/types";
import * as createFormValidityObserverImport from "../createFormValidityObserver";
import useFormValidityObserver from "../useFormValidityObserver";

describe("useFormValidityObserver (Custom React Hook)", () => {
  // Keep things clean between each test by automatically restoring anything we may have spied on
  beforeEach(jest.restoreAllMocks);

  it("Memoizes its calls to `createFormValidityObserver` (to prevent rerenders caused by reference inequality)", () => {
    const types = ["input", "focusout"] satisfies EventType[];
    const createFormValidityObserver = jest.spyOn(createFormValidityObserverImport, "default");

    const { result, rerender } = renderHook((t) => useFormValidityObserver(t), { initialProps: types });
    const originalObserver = result.current;
    expect(createFormValidityObserver).toHaveBeenCalledWith(types, undefined);
    expect(createFormValidityObserver).toHaveReturnedWith(originalObserver);

    rerender(types);
    expect(result.current).toBe(originalObserver);
  });

  it("Creates a new `FormValidityObserver` whenever the hook's options change", () => {
    const { result, rerender } = renderHook(([types, options]) => useFormValidityObserver(types, options), {
      initialProps: ["input"] as Parameters<typeof useFormValidityObserver>,
    });
    const originalObserver = result.current;

    // Changing Type
    rerender(["blur"]);
    const observerAfterTypeChange = result.current;
    expect(observerAfterTypeChange).not.toBe(originalObserver);

    // Add Empty Object (NO OBSERVER RECREATION because the options are looked at INDIVIDUALLY)
    rerender(["blur", {}]);
    const observerAfterEmptyObject = result.current;
    expect(observerAfterEmptyObject).toBe(observerAfterTypeChange);

    // Add `useEventCapturing` option
    rerender(["blur", { useEventCapturing: true }]);
    const observerAfterAddCapturing = result.current;
    expect(observerAfterAddCapturing).not.toBe(observerAfterEmptyObject);

    // Add `scroller` option
    rerender(["blur", { useEventCapturing: true, scroller: () => undefined }]);
    const observerAfterAddScroller = result.current;
    expect(observerAfterAddScroller).not.toBe(observerAfterAddCapturing);

    // Add `renderer` option
    rerender(["blur", { useEventCapturing: true, scroller: () => undefined, renderer: () => undefined }]);
    const observerAfterAddRenderer = result.current;
    expect(observerAfterAddRenderer).not.toBe(observerAfterAddScroller);
  });
});
