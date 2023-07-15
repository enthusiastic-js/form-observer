/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect*"] }] */
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/extend-expect";
import type { EventType, ListenerOptions, FormField } from "../types";
import FormObserver from "../FormObserver";
import FormValidityObserver from "../FormValidityObserver";

describe("Form Validity Observer (Class)", () => {
  // Form Validity Observer Constants
  const types = ["change", "focusout"] as const satisfies ReadonlyArray<EventType>;

  /* ---------------------------------------- Global Helpers ---------------------------------------- */
  /** An `HTMLElement` that is able to partake in form field validation */
  type ValidatedField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

  function renderWithinForm(field: ValidatedField, useAccessibleError?: boolean): HTMLFormElement {
    const form = document.createElement("form");
    form.setAttribute("aria-label", "Validated Form");

    document.body.appendChild(form);
    form.appendChild(field);

    const descriptionId = "description";
    form.appendChild(createElementWithProps("div", { id: descriptionId }));
    if (useAccessibleError) field.setAttribute("aria-describedby", descriptionId);
    return form;
  }

  /** Creates an HTMLElement with the provided properties. If no props are needed, prefer `document.createElement`. */
  function createElementWithProps<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    properties: Partial<HTMLElementTagNameMap[K]>
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
    return Object.assign(element, properties);
  }

  /* ---------------------------------------- Test Setup ---------------------------------------- */
  // General assertions that the test constants were set up correctly
  beforeAll(() => {
    /* eslint-disable jest/no-standalone-expect */
    expect(types.length).toBeGreaterThan(1); // Correct `types` count
    expect(types).toHaveLength(new Set(types).size); // Unique types
    expect(types.every((t) => typeof t === "string")).toBe(true); // Types are strings
    /* eslint-enable jest/no-standalone-expect */
  });

  beforeEach(() => {
    // Keep things clean between each test by automatically restoring anything we may have spied on
    jest.restoreAllMocks();

    // Reset anything that we've rendered to the DOM. (Without a JS Framework implementation, we must do this manually.)
    document.body.textContent = "";
  });

  beforeEach(() => (document.body.textContent = ""));

  /* ---------------------------------------- Run Tests ---------------------------------------- */
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

  describe("Overriden Core Methods", () => {
    /* -------------------- Local Assertions -------------------- */
    function expectValidationFunctionsToBeEnabled(observer: FormValidityObserver, enabled = true): void {
      const fakeMessage = "This error doesn't matter";
      const fakeFieldName = "field-not-in-form";

      const error = new Error("This action cannot be performed on a form field before its owning form is `observe`d.");

      // Enabled
      if (enabled) {
        expect(() => observer.validateFields()).not.toThrow();
        expect(() => observer.validateField(fakeFieldName)).not.toThrow();
        expect(() => observer.setFieldError(fakeFieldName, fakeMessage)).not.toThrow();
        expect(() => observer.clearFieldError(fakeFieldName)).not.toThrow();
      }
      // Disabled
      else {
        expect(() => observer.validateFields()).toThrow(error);
        expect(() => observer.validateField(fakeFieldName)).toThrow(error);
        expect(() => observer.setFieldError(fakeFieldName, fakeMessage)).toThrow(error);
        expect(() => observer.clearFieldError(fakeFieldName)).toThrow(error);
      }
    }

    /* -------------------- Core Method Tests -------------------- */
    describe("observe (Method)", () => {
      it("Extends the functionality of `FormObserver.observe`", () => {
        const form = document.createElement("form");
        jest.spyOn(FormObserver.prototype, "observe");
        const formValidityObserver = new FormValidityObserver(types);

        // Confirm that the method is an extension, not a direct copy
        formValidityObserver.observe(form);
        expect(FormObserver.prototype.observe).toHaveBeenCalledTimes(1);
        expect(FormObserver.prototype.observe).toHaveBeenCalledWith(form);
        expect(formValidityObserver.observe).not.toBe(FormObserver.prototype.observe);
      });

      it("Connects the provided `form` to the observer's validation functions", () => {
        const form = document.createElement("form");
        const formValidityObserver = new FormValidityObserver(types);

        // The observer's validation functions first fail because no form is connected to them.
        expectValidationFunctionsToBeEnabled(formValidityObserver, false);

        // The observer's validation functions work after a form is connected.
        formValidityObserver.observe(form);
        expectValidationFunctionsToBeEnabled(formValidityObserver);
      });

      /*
       * TODO: We're doing something wrong with how we're setting up the `FormObserver` classes that's causing
       * JS (or at least _TS_) to wrongly think that the `name` for ALL of our classes is `_a`. It seems that,
       * generally speaking, JS/TS can derive the correct `name` for an anonymous class. But in our case, the
       * `name` won't be derived unless we explicitly supply it to the class expression (which we can't
       * given all of the name clashing)... So ... What do we do? We'll figure that out later. For now,
       * keep writing tests. Maybe migrating to JS docs will fix this problem too?
       */
      it("Only allows 1 `form` to be observed at a time", () => {
        const originalForm = document.createElement("form");
        const formValidityObserver = new FormValidityObserver(types);
        expect(() => formValidityObserver.observe(originalForm)).not.toThrow();

        expect(() => formValidityObserver.observe(document.createElement("form"))).toThrowErrorMatchingInlineSnapshot(
          `"A single \`FormValidityObserver\` can only watch 1 form at a time."`
        );

        formValidityObserver.unobserve(originalForm);
        expect(() => formValidityObserver.observe(document.createElement("form"))).not.toThrow();
      });

      it("Returns `true` if the received `form` was NOT already being observed (and `false` otherwise)", () => {
        const form = document.createElement("form");
        const formValidityObserver = new FormValidityObserver(types[0]);

        // Returns `true` because the `form` was not originally being observed
        expect(formValidityObserver.observe(form)).toBe(true);

        // Returns `false` because the `form` was already being observed
        expect(formValidityObserver.observe(form)).toBe(false);

        // Resets are also handled correctly.
        formValidityObserver.unobserve(form);
        expect(formValidityObserver.observe(form)).toBe(true);
      });
    });

    describe("unobserve (Method)", () => {
      it("Extends the functionality of `FormObserver.unobserve`", () => {
        const form = document.createElement("form");
        jest.spyOn(FormObserver.prototype, "unobserve");
        const formValidityObserver = new FormValidityObserver(types);

        // Confirm that the method is an extension, not a direct copy
        formValidityObserver.unobserve(form);
        expect(FormObserver.prototype.unobserve).toHaveBeenCalledTimes(1);
        expect(FormObserver.prototype.unobserve).toHaveBeenCalledWith(form);
        expect(formValidityObserver.unobserve).not.toBe(FormObserver.prototype.unobserve);
      });

      it("Disconnects the provided `form` from the observer's validation functions IF it was being observed", () => {
        const form = document.createElement("form");
        const formValidityObserver = new FormValidityObserver(types);

        formValidityObserver.observe(form);
        formValidityObserver.unobserve(document.createElement("form"));

        // The observer's validation functions still work because the connected `form` was not unobserved
        expectValidationFunctionsToBeEnabled(formValidityObserver);

        // The observer's validation functions stop working because the connected `form` was unobserved
        formValidityObserver.unobserve(form);
        expectValidationFunctionsToBeEnabled(formValidityObserver, false);
      });

      it("Resets the error messages for the provided `form`'s fields IF it was being observed", async () => {
        const errorMessage = "You owe me a value.";
        renderWithinForm(createElementWithProps("input", { name: "first-name", type: "text", required: true }));

        const form = screen.getByRole<HTMLFormElement>("form");
        const input = screen.getByRole<HTMLInputElement>("textbox");
        const formValidityObserver = new FormValidityObserver(types);

        formValidityObserver.observe(form);
        formValidityObserver.register(input.name, { required: errorMessage });

        // Unobserve an unconnected `form`
        formValidityObserver.unobserve(document.createElement("form"));

        // The custom error messages are still active because the connected `form` was not unobserved
        await userEvent.type(input, "{Tab}");
        expect(input.validationMessage).toBe(errorMessage);

        // Re-observe the `form`
        formValidityObserver.unobserve(form);
        formValidityObserver.observe(form);

        // The old custom error messages are no longer in use because the connected `form` was unobserved
        await userEvent.type(input, "{Tab}");
        expect(input.validationMessage).not.toBe("");
        expect(input.validationMessage).not.toBe(errorMessage);
      });

      it("Returns `true` if the received `form` WAS already being observed (and `false` otherwise)", () => {
        const form = document.createElement("form");
        const formValidityObserver = new FormValidityObserver(types);

        // Returns `false` because the `form` was not originally being observed
        expect(formValidityObserver.unobserve(form)).toBe(false);

        // Returns `true` because the `form` was already being observed
        formValidityObserver.observe(form);
        expect(formValidityObserver.unobserve(form)).toBe(true);
      });
    });

    describe("disconnect (Method)", () => {
      it("`Unobserve`s the currently-observed `form`", () => {
        const form = document.createElement("form");
        const formValidityObserver = new FormValidityObserver(types);
        jest.spyOn(formValidityObserver, "unobserve");

        formValidityObserver.observe(form);
        formValidityObserver.disconnect();
        expect(formValidityObserver.unobserve).toHaveBeenCalledWith(form);
      });

      it("Does nothing if no `form` is currently being observed", () => {
        const formValidityObserver = new FormValidityObserver(types);
        jest.spyOn(formValidityObserver, "unobserve");

        expect(() => formValidityObserver.disconnect()).not.toThrow();
        expect(formValidityObserver.unobserve).not.toHaveBeenCalled();
      });
    });
  });

  // NOTE: BEFORE THESE DESCRIBE BLOCKS BELOW, we should just be testing the class as a whole and its relation to parent

  /*
   * TODO: We'll fill in and order the other tests later. But we really want to check that the automated
   * validation works correctly first.
   *
   * ... Maybe automated field validation should go last since it's so huge with the loops?
   */

  describe("Automated Field Validation", () => {
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
          renderWithinForm(createElementWithProps("input", { name: "email", type: "email" }), useAccessibleError);
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
