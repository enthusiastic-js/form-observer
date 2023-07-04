import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/extend-expect";
import type { EventType, ListenerOptions, FormField } from "../types";
import FormObserver from "../FormObserver";
import FormValidityObserver from "../FormValidityObserver";

describe("Form Validity Observer (Class)", () => {
  // Form Validity Observer Constants
  const types = ["change", "focusout"] as const satisfies ReadonlyArray<EventType>;

  // General assertions that the test constants were set up correctly
  beforeAll(() => {
    /* eslint-disable jest/no-standalone-expect */
    expect(types.length).toBeGreaterThan(1); // Correct `types` count
    expect(types).toHaveLength(new Set(types).size); // Unique types
    expect(types.every((t) => typeof t === "string")).toBe(true); // Types are strings
    /* eslint-enable jest/no-standalone-expect */
  });

  // Keep things clean between each test by automatically restoring anything we may have spied on
  beforeEach(() => jest.restoreAllMocks());

  it("Is a child of the base `FormObserver` class", () => {
    expect(new FormValidityObserver(types[0])).toEqual(expect.any(FormObserver));
  });

  it("Supplies the event listener options that it receives to its field validation event handler", () => {
    const eventListenerOpts: Exclude<ListenerOptions, undefined> = { capture: true, once: undefined };
    const formValidityObserver = new FormValidityObserver(types, { eventListenerOpts });
    const form = document.createElement("form");

    const addEventListener = jest.spyOn(form.ownerDocument, "addEventListener");
    const removeEventListener = jest.spyOn(form.ownerDocument, "removeEventListener");

    formValidityObserver.observe(form);
    expect(addEventListener).toHaveBeenCalledWith(expect.anything(), expect.anything(), eventListenerOpts);

    formValidityObserver.unobserve(form);
    expect(removeEventListener).toHaveBeenCalledWith(expect.anything(), expect.anything(), eventListenerOpts);
  });

  // NOTE: BEFORE THESE DESCRIBE BLOCKS, we should just be testing the class as a whole and its relation to parent

  /*
   * TODO: We'll fill in and order the other tests later. But we really want to check that the automated
   * validation works correctly first.
   *
   * ... Maybe automated field validation should go last since it's so huge with the loops?
   */

  describe("Automated Field Validation", () => {
    function renderWithinForm(ui: React.ReactElement, useAccessibleError: boolean) {
      const descriptionId = "description";
      const field = useAccessibleError ? React.cloneElement(ui, { "aria-describedby": descriptionId }) : ui;

      return render(
        <form aria-label="Validated Form">
          {field}
          <div id={descriptionId} />
        </form>
      );
    }

    type ErrorMethod = "Native" | "Accessible";
    type ErrorType = "Default" | "Custom";
    type ErrorRendering = "Messages" | "Markup";
    type ExcludedTestTypes = "Native Default Markup" | "Native Custom Markup" | "Accessible Default Markup";
    type TestTypes = Exclude<`${ErrorMethod} ${ErrorType} ${ErrorRendering}`, ExcludedTestTypes>;

    const testCases = [
      "Native Default Messages",
      "Native Custom Messages",
      "Accessible Default Messages",
      "Accessible Custom Messages",
      "Accessible Custom Markup",
    ] as const satisfies ReadonlyArray<TestTypes>;

    const customError = "<div>This field is wrong! :(</div>";
    expect(customError).toMatch(/<div>.*<\/div>/);

    describe.each(testCases)("for %s", (testCase) => {
      const [method, type, rendering] = testCase.split(" ");
      const useAccessibleError = method === "Accessible";

      // TODO: Need a way to handle scenarios where we render markup for the error instead
      // TODO: We need to refactor `FormValidityObserver` before we can really go any further.
      const validationRuleValue = (() => {
        if (rendering === "Markup") return { message: customError, render: true } as const;
        return type === "Custom" ? customError : undefined;
      })();

      describe("<input /> Validation", () => {
        // eslint-disable-next-line jest/expect-expect -- TODO: Update ESLint config instead
        it("Validates the `input`'s field type", async () => {
          renderWithinForm(<input name="email" type="email" />, useAccessibleError);
          const form = screen.getByRole("form") as HTMLFormElement;
          const formValidityObserver = new FormValidityObserver(types[0]);

          formValidityObserver.observe(form);
          formValidityObserver.register("email", { type: validationRuleValue });

          // Invalid Case
          const input = screen.getByRole<HTMLInputElement>("textbox");
          await userEvent.type(input, "bademail{Tab}");
          expectInvalidField(input, testCase);

          // Valid Case
          await userEvent.type(input, "@emails.com{Tab}");
          expectValidField(input, testCase);
        });
      });

      describe("<select /> Validation", () => {
        //
      });

      describe("<textarea /> Validation", () => {
        //
      });
    });

    /** HTML field elements that are _naturally_ validated by the browser. */
    type TestField = Extract<FormField, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

    function expectInvalidField(field: TestField, testCase: TestTypes): void {
      if (!testCases.includes(testCase)) throw new TypeError(`Test Case not supported: ${testCase}.`);

      expect(field).toHaveAttribute("aria-invalid", String(true));
      if (testCase === "Native Default Messages") return expect(field.validationMessage).not.toBe("");
      if (testCase === "Native Custom Messages") return expect(field.validationMessage).toBe(customError);
      if (testCase === "Accessible Default Messages") {
        expect(field.validationMessage).not.toBe("");
        expect(field).toHaveAccessibleDescription(field.validationMessage);
        return;
      }

      if (testCase === "Accessible Custom Messages") {
        expect(field.validationMessage).toBe(customError);
        expect(field).toHaveAccessibleDescription(field.validationMessage);
        return;
      }

      // Accessible Custom Markup
      const derivedError = getRawTextFromMarkup(customError);
      expect(field.validationMessage).not.toBe(derivedError);
      expect(field).toHaveAccessibleDescription(derivedError);
    }

    function getRawTextFromMarkup(htmlString: string): string {
      const container = document.createElement("div");
      container.innerHTML = htmlString;
      return container.textContent as string;
    }

    function expectValidField(field: TestField, testCase: TestTypes): void {
      if (!testCases.includes(testCase)) throw new TypeError(`Test Case not supported: ${testCase}.`);

      expect(field).toHaveAttribute("aria-invalid", String(false));
      expect(field.validationMessage).toBe("");
      if (testCase.includes("Accessible")) expect(field).not.toHaveAccessibleDescription();
    }
  });

  // All method tests go here
  describe("Validation API", () => {
    //
  });
});
