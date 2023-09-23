import { describe, it, expect } from "vitest";
import { assertElementIsForm } from "../assertions.js";

describe("Assertion Utilities", () => {
  describe("Assert Element Is Form (Function)", () => {
    it("Prevents the application from proceeding if it is not passed an `HTMLFormElement`", () => {
      // Error Cases for simple types
      expect(() => assertElementIsForm(null as unknown as Element)).toThrowErrorMatchingInlineSnapshot(
        '"Expected argument to be an instance of `HTMLFormElement`. Instead, received `null`."',
      );
      expect(() => assertElementIsForm(undefined as unknown as Element)).toThrowErrorMatchingInlineSnapshot(
        '"Expected argument to be an instance of `HTMLFormElement`. Instead, received `undefined`."',
      );
      expect(() => assertElementIsForm("form" as unknown as Element)).toThrowErrorMatchingInlineSnapshot(
        '"Expected argument to be an instance of `HTMLFormElement`. Instead, received `form`."',
      );
      expect(() => assertElementIsForm(9001 as unknown as Element)).toThrowErrorMatchingInlineSnapshot(
        '"Expected argument to be an instance of `HTMLFormElement`. Instead, received `9001`."',
      );

      // Error Cases for elements
      const div = document.createElement("div");
      expect(() => assertElementIsForm(div)).toThrowErrorMatchingInlineSnapshot(
        '"Expected argument to be an instance of `HTMLFormElement`. Instead, received `[object HTMLDivElement]`."',
      );

      // Success Cases
      const form = document.createElement("form");
      expect(() => assertElementIsForm(form)).not.toThrow();
    });
  });
});
