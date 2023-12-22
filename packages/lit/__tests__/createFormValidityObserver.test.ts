import { vi, beforeEach, describe, it, expect } from "vitest";
import FormValidityObserver from "@form-observer/core/FormValidityObserver";
import createFormValidityObserver from "../createFormValidityObserver.js";
import type { EventType } from "../index.d.ts";

describe("Create Form Validity Observer (Function)", () => {
  const types = Object.freeze(["input", "focusout"] as const) satisfies ReadonlyArray<EventType>;

  // TODO: Can we get rid of the weird `void` thing?
  // Keep things clean between each test by automatically restoring anything we may have spied on
  beforeEach(vi.restoreAllMocks as () => void);

  it("Generates a `FormValidityObserver` (enhanced)", () => {
    expect(createFormValidityObserver(types)).toEqual(expect.any(FormValidityObserver));
  });

  it("Exposes `bound` versions of the `FormValidityObserver`'s methods", () => {
    /* ---------- Setup ---------- */
    // Derive `bound` methods
    type BoundMethod = keyof FormValidityObserver;
    const members = Object.getOwnPropertyNames(FormValidityObserver.prototype);
    const boundMethods = members.filter((m): m is BoundMethod => m !== "constructor");

    // Assert that we properly identified the `bound` methods.
    expect(boundMethods).toHaveLength(8); // Note: This number will change if we add more methods (unlikely).
    expect(boundMethods.length).toBe(new Set(boundMethods).size);

    // Spy on the `bound` methods
    boundMethods.forEach((method) => vi.spyOn(FormValidityObserver.prototype[method], "bind"));

    /* ---------- Run Assertions ---------- */
    const observer = createFormValidityObserver(types);

    boundMethods.forEach((method) => {
      expect(FormValidityObserver.prototype[method].bind).toHaveBeenCalledTimes(1);
      expect(FormValidityObserver.prototype[method].bind).toHaveBeenCalledWith(observer);
      expect(FormValidityObserver.prototype[method].bind).toHaveReturnedWith(observer[method]);
    });
  });

  /*
   * TODO: This is currently impossible to support. We can certainly support RENDERING Lit Error Messages
   * to the DOM. But if any JS logic interferes with that error message (e.g., `element.textContent = ""`),
   * Lit will be unable to render new error messages to the related DOM container. This is a problem because
   * up until this point, `FormValidityObserver.clearFieldError()` has simply emptied the `textContent` of
   * its error containers directly. We'll have to rethink this approach if we want to support Renderable Lit Values.
   */
  it.todo("Uses a default `renderer` that accepts `HTML String Templates` AND any `Renderable Lit Value");
});
