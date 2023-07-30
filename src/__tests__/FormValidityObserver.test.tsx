/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect*"] }] */
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/extend-expect";
import type { EventType, ListenerOptions, FormField } from "../types";
import FormObserver from "../FormObserver";
import FormValidityObserver from "../FormValidityObserver";

// TODO: Rename this to a `.ts` file since this file is no longer intended to hold JSX. (Don't lie about file types.)
describe("Form Validity Observer (Class)", () => {
  /* ---------------------------------------- Global Constants ---------------------------------------- */
  const attrs = Object.freeze({ "aria-invalid": "aria-invalid", "aria-describedby": "aria-describedby" });

  // Form Validity Observer Constants
  const types = Object.freeze(["change", "focusout"] as const) satisfies ReadonlyArray<EventType>;

  /* ---------------------------------------- Global Helpers ---------------------------------------- */
  /** An `HTMLElement` that is able to partake in form field validation */
  type ValidatableField = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

  function renderWithinForm(field: ValidatableField, useAccessibleError?: boolean): HTMLFormElement {
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
        const formValidityObserver = new FormValidityObserver(types);
        renderWithinForm(createElementWithProps("input", { name: "first-name", type: "text", required: true }));

        const form = screen.getByRole<HTMLFormElement>("form");
        const input = screen.getByRole<HTMLInputElement>("textbox");

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

        // The previous custom error messages are no longer in use because the connected `form` was unobserved
        await userEvent.type(input, "{Tab}");
        expect(input.validationMessage).not.toBe("");
        expect(input.validationMessage).not.toBe(errorMessage);
      });

      it("Returns `true` if the received `form` was ALREADY being observed (and `false` otherwise)", () => {
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

  describe("Validation Methods", () => {
    const radioValues = Object.freeze(["1", "2", "3"] as const);

    /* -------------------- Validation Message Helpers -------------------- */
    /**
     * Renders all of the commonly recognized form fields inside a `form` element with empty values.
     *
     * @returns References to the `form`, the radiogroup (`fieldset`), and the other `fields`
     * that belong to the `form` (excluding the radio buttons).
     */
    function renderEmptyFields() {
      expect(radioValues).toHaveLength(new Set(radioValues).size); // Assert Uniqueness
      expect(radioValues.length).toBeGreaterThan(1); // Assert Multiple Values

      document.body.innerHTML = `
          <form aria-label="Form Fields">
            <input name="text" type="text" />
            <input name="checkbox" type="checkbox" />
            <textarea name="textarea"></textarea>
            <fieldset role="radiogroup">
              ${radioValues.map((v) => `<input name="radio" type="radio" value=${v} />`).join("")}
            </fieldset>

            <select name="select"></select>
            <select name="multiselect" multiple></select>
          </form>
        `;

      // Verify setup conditions for `form`
      const form = screen.getByRole<HTMLFormElement>("form");
      const [input, textarea] = screen.getAllByRole("textbox") as [HTMLInputElement, HTMLTextAreaElement];
      expect(input.matches("input[name][type='text']")).toBe(true);
      expect(textarea.matches("textarea[name]")).toBe(true);

      const checkbox = screen.getByRole<HTMLInputElement>("checkbox");
      expect(checkbox.matches("input[name][type='checkbox']")).toBe(true);

      const fieldset = screen.getByRole<HTMLFieldSetElement>("radiogroup");
      const radios = Array.from(fieldset.elements) as HTMLInputElement[];
      expect(new Set(radios.map((r) => r.value)).size).toBe(radioValues.length);
      radios.forEach((r) => expect(r.matches("input[name][type='radio'][value]")).toBe(true));

      const select = screen.getByRole<HTMLSelectElement>("combobox");
      expect(select.matches("select[name]:not([multiple])")).toBe(true);

      const multiselect = screen.getByRole<HTMLSelectElement>("listbox");
      expect(multiselect.matches("select[name][multiple]")).toBe(true);

      const arr = [form, fieldset, input, textarea, checkbox, select, multiselect] as const;
      const map = { form, fieldset, fields: [input, textarea, checkbox, select, multiselect] } as const;
      return Object.assign(arr, map);
    }

    /**
     * Asserts that the provided `field` is valid, and that it has no error messages associated with it.
     * When passed a radio button, asserts that the entire radio group (including the accessible `fieldset`)
     * is valid, and that _none_ of the elements have any error messages associated with them.
     *
     * **WARNING: DO NOT call this function inside the `clearFieldError` tests (i.e., the `clearFieldError`
     * describe block)! Use regular assertions that meet the test criteria instead.**
     */
    function expectNoErrorsFor(field: ValidatableField): void {
      // Unique Validation for Radio Buttons
      if (field.type === "radio") {
        const radiogroup = field.closest<HTMLFieldSetElement>("fieldset[role='radiogroup']");

        // Enforce Valid Markup
        const radios = radiogroup ? (Array.from(radiogroup.elements) as HTMLInputElement[]) : [field];
        expect(radios.every((radio) => radio instanceof HTMLInputElement && radio.type === "radio")).toBe(true);

        // Check Fieldset
        if (radiogroup) {
          expect(radiogroup).not.toHaveAccessibleDescription();

          if (radiogroup.hasAttribute(attrs["aria-invalid"])) {
            expect(radiogroup).toHaveAttribute(attrs["aria-invalid"], String(false));
          }
        }

        // Check Radios
        radios.forEach((radio) => {
          expect(radio.validationMessage).toBe("");
          expect(radio).not.toHaveAccessibleDescription();
          expect(radio).not.toHaveAttribute(attrs["aria-invalid"]);
        });
      }
      // All Other Fields
      else {
        expect(field.validationMessage).toBe("");
        expect(field).not.toHaveAccessibleDescription();

        if (field.hasAttribute(attrs["aria-invalid"])) {
          expect(field).toHaveAttribute(attrs["aria-invalid"], String(false));
        }
      }
    }

    /**
     * Asserts that the provided `field` is _invalid_, and that it has an error message associated with it.
     * When passed a radio button, asserts that the entire radio group (including the accessible `fieldset`)
     * is invalid, and that there are error message(s) associated with the correct element(s).
     *
     * **WARNING: DO NOT call this function inside the `setFieldError` tests (i.e., the `setFieldError`
     * describe block)! Use regular assertions that meet the test criteria instead.**
     *
     * @param field The invalid form field.
     * @param error The error that the user _perceives_ for the form field. This should be a pure string,
     * **not** a function nor HTML.
     * @param method The approach used to display the error message. `a11y` indicates that the error
     * message was rendered as an _accessible_ pure string. `html` indicates that the error message
     * was rendered _as raw HTML_. `none` (**default**) indicates that the message was created as a pure string,
     * but not accessibly.
     */
    function expectErrorFor(field: ValidatableField, error: string, method: "none" | "a11y" | "html" = "none"): void {
      // Unique Validation for Radio Buttons
      if (field.type === "radio") {
        const radiogroup = field.closest("fieldset[role='radiogroup']") as HTMLFieldSetElement;

        // Enforce Valid Markup
        expect(radiogroup).toBeInTheDocument();
        const radios = Array.from(radiogroup.elements) as HTMLInputElement[];
        expect(radios.every((radio) => radio instanceof HTMLInputElement && radio.type === "radio")).toBe(true);

        // Check Fieldset
        expect(radiogroup).toHaveAttribute(attrs["aria-invalid"], String(true));
        if (method !== "none") expect(radiogroup).toHaveAccessibleDescription(error);

        // Check Radios
        expect(radios[0].validationMessage).toBe(method === "html" ? "" : error);
        radios.slice(1).forEach((radio) => expect(radio.validationMessage).toBe(""));
        radios.forEach((radio) => {
          expect(radio).not.toHaveAttribute(attrs["aria-invalid"]);
          if (method !== "none") expect(radio).not.toHaveAccessibleDescription();
        });
      }
      // All Other Fields
      else {
        expect(field.validationMessage).toBe(method === "html" ? "" : error);
        if (method !== "none") expect(field).toHaveAccessibleDescription(error);
        expect(field).toHaveAttribute(attrs["aria-invalid"], String(true));
      }
    }

    /** Extracts the text content of a raw HTML string */
    function getTextFromMarkup(htmlString: string): string {
      const container = document.createElement("div");
      container.innerHTML = htmlString;
      return container.textContent as string;
    }

    describe("setFieldError (Method)", () => {
      it("Marks a field as invalid (`aria-invalid`) and gives it the provided error message", () => {
        const errorMessage = "This field isn't correct!";
        const formValidityObserver = new FormValidityObserver(types);

        // Render Form
        const { form, fields } = renderEmptyFields();
        formValidityObserver.observe(form);

        // Run Assertions
        fields.forEach((field) => {
          formValidityObserver.setFieldError(field.name, errorMessage);
          expect(field).toHaveAttribute(attrs["aria-invalid"], String(true));
          expect(field.validationMessage).toBe(errorMessage);
        });
      });

      it("Gives the FIRST radio button the provided error message and marks its ACCESSIBLE GROUP as invalid", () => {
        const errorMessage = "Cool radio buttons only!";
        const formValidityObserver = new FormValidityObserver(types);

        // Render Form
        const { form, fieldset } = renderEmptyFields();
        expect(fieldset).toHaveAttribute("role", "radiogroup");
        const radios = Array.from(fieldset.elements) as HTMLInputElement[];
        formValidityObserver.observe(form);

        // Run Assertions
        formValidityObserver.setFieldError(radios[0].name, errorMessage);
        expect(fieldset).toHaveAttribute(attrs["aria-invalid"], String(true));

        expect(radios[0].validationMessage).toBe(errorMessage);
        radios.slice(1).forEach((radio) => expect(radio.validationMessage).toBe(""));
        radios.forEach((radio) => expect(radio).not.toHaveAttribute(attrs["aria-invalid"]));
      });

      it("Gives a field the error message returned the provided error function", () => {
        const errorFunc = jest.fn((field: FormField) => `Element "${field.tagName}" of type "${field.type}" is bad!`);
        const formValidityObserver = new FormValidityObserver(types);

        // Render Form
        const { form, fieldset, fields } = renderEmptyFields();
        const radios = Array.from(fieldset.elements) as HTMLInputElement[];
        formValidityObserver.observe(form);

        // Radio Button Groups
        formValidityObserver.setFieldError(radios[0].name, errorFunc);
        expect(errorFunc).toHaveBeenCalledTimes(1);
        expect(errorFunc).toHaveBeenCalledWith(radios[0]);

        expect(fieldset).toHaveAttribute(attrs["aria-invalid"], String(true));

        expect(radios[0].validationMessage).toBe(errorFunc(radios[0]));
        radios.slice(1).forEach((radio) => expect(radio.validationMessage).toBe(""));
        radios.forEach((radio) => expect(radio).not.toHaveAttribute(attrs["aria-invalid"]));

        // All Other Fields
        const callCountBeforeLoop = errorFunc.mock.calls.length;

        fields.forEach((field, i) => {
          // Note: We're accounting for the fact that we are x2 calling `errorFunc` with our assertions
          formValidityObserver.setFieldError(field.name, errorFunc);
          expect(errorFunc).toHaveBeenNthCalledWith(i * 2 + callCountBeforeLoop + 1, field);

          expect(field.validationMessage).toBe(errorFunc(field));
          expect(field).toHaveAttribute(attrs["aria-invalid"], String(true));
        });
      });

      it("Gives a field an accessible error message whenever possible", () => {
        const errorMessage = "This field isn't correct!";
        const errorFunc = (field: FormField) => `Element "${field.tagName}" of type "${field.type}" is bad!`;
        const formValidityObserver = new FormValidityObserver(types);

        // Render Form
        const { form, fieldset, fields } = renderEmptyFields();
        const radios = Array.from(fieldset.elements) as HTMLInputElement[];
        formValidityObserver.observe(form);

        [fieldset, ...fields].forEach((f) => {
          const errorId = `${f instanceof HTMLFieldSetElement ? "fieldset" : f.name}-error`;
          f.setAttribute(attrs["aria-describedby"], errorId);
          document.body.appendChild(createElementWithProps("div", { id: errorId }));
        });

        ([errorMessage, errorFunc] as const).forEach((e) => {
          // Reset Errors
          (Array.from(form.elements) as FormField[]).forEach((f) => formValidityObserver.clearFieldError(f.name));

          // Radio Button Groups
          formValidityObserver.setFieldError(radios[0].name, e);

          expect(fieldset).toHaveAttribute(attrs["aria-invalid"], String(true));
          expect(fieldset).toHaveAccessibleDescription(typeof e === "function" ? e(radios[0]) : e);

          expect(radios[0].validationMessage).toBe(typeof e === "function" ? e(radios[0]) : e);
          radios.slice(1).forEach((radio) => expect(radio.validationMessage).toBe(""));
          radios.forEach((radio) => {
            expect(radio).not.toHaveAttribute(attrs["aria-invalid"]);
            expect(radio).not.toHaveAccessibleDescription();
          });

          // Other Fields
          fields.forEach((field) => {
            formValidityObserver.setFieldError(field.name, e);
            expect(field).toHaveAttribute(attrs["aria-invalid"], String(true));
            expect(field.validationMessage).toBe(typeof e === "function" ? e(field) : e);
            expect(field).toHaveAccessibleDescription(typeof e === "function" ? e(field) : e);
          });
        });
      });

      it("Renders ACCESSIBLE error messages to the DOM as HTML when `render` is true", () => {
        const errorMessage = "<div>This field isn't correct!</div>";
        const errorFunc = (field: FormField) => `<div>Element "${field.tagName}" of type "${field.type}" is bad!</div>`;
        const formValidityObserver = new FormValidityObserver(types);

        // Render Form
        const { form, fieldset, fields } = renderEmptyFields();
        const radios = Array.from(fieldset.elements) as HTMLInputElement[];
        [fieldset, ...fields].forEach((f) => {
          const errorId = `${f instanceof HTMLFieldSetElement ? "fieldset" : f.name}-error`;
          f.setAttribute(attrs["aria-describedby"], errorId);
          document.body.appendChild(createElementWithProps("div", { id: errorId }));
        });
        formValidityObserver.observe(form);

        /* ---------- Static Error Messages ---------- */
        ([errorMessage, errorFunc] as const).forEach((e) => {
          // Reset Errors
          (Array.from(form.elements) as FormField[]).forEach((f) => formValidityObserver.clearFieldError(f.name));

          // Radio Button Groups
          formValidityObserver.setFieldError(radios[0].name, e, true);

          expect(fieldset).toHaveAttribute(attrs["aria-invalid"], String(true));
          expect(fieldset).not.toHaveAccessibleDescription(typeof e === "function" ? e(radios[0]) : e);
          expect(fieldset).toHaveAccessibleDescription(getTextFromMarkup(typeof e === "function" ? e(radios[0]) : e));

          radios.forEach((radio) => {
            expect(radio.validationMessage).toBe("");
            expect(radio).not.toHaveAccessibleDescription();
            expect(radio).not.toHaveAttribute(attrs["aria-invalid"]);
          });

          // Other Fields
          fields.forEach((field) => {
            formValidityObserver.setFieldError(field.name, e, true);

            expect(field.validationMessage).toBe("");
            expect(field).toHaveAttribute(attrs["aria-invalid"], String(true));
            expect(field).not.toHaveAccessibleDescription(typeof e === "function" ? e(field) : e);
            expect(field).toHaveAccessibleDescription(getTextFromMarkup(typeof e === "function" ? e(field) : e));
          });
        });
      });

      // See https://developer.mozilla.org/en-US/docs/Web/API/Element/setHTML
      it("SECURELY renders error messages to the DOM as HTML whenever possible", () => {
        const errorFunc = (field: FormField) => `<div>Element "${field.tagName}" of type "${field.type}" is bad!</div>`;
        const formValidityObserver = new FormValidityObserver(types);
        const setHTML = jest.fn(function setHTML(this: HTMLElement, htmlString: string) {
          this.innerHTML = htmlString;
        });

        // Polyfill `setHTML`
        type PolyfilledElement = Element & { setHTML?: typeof setHTML };
        (Element.prototype as PolyfilledElement).setHTML = setHTML;

        // Render Form
        const { form, fieldset, fields } = renderEmptyFields();
        formValidityObserver.observe(form);

        [fieldset, ...fields].forEach((f) => {
          const errorId = `${f instanceof HTMLFieldSetElement ? "fieldset" : f.name}-error`;
          f.setAttribute(attrs["aria-describedby"], errorId);
          document.body.appendChild(createElementWithProps("div", { id: errorId }));
        });

        // Note: This time, we're assuming that if the dynamic errors work, the static ones do as well
        /* ---------- Run Test ---------- */
        // Radio Button Groups
        const firstRadio = fieldset.elements[0] as HTMLInputElement;
        formValidityObserver.setFieldError(firstRadio.name, errorFunc, true);

        const radiogroupErrorId = fieldset.getAttribute(attrs["aria-describedby"]) as string;
        const radiogroupError = document.getElementById(radiogroupErrorId) as PolyfilledElement;
        expect(radiogroupError.setHTML).toHaveBeenNthCalledWith(1, errorFunc(firstRadio));

        // Other Fields
        fields.forEach((field, i) => {
          formValidityObserver.setFieldError(field.name, errorFunc, true);

          const fieldErrorId = field.getAttribute(attrs["aria-describedby"]) as string;
          const fieldError = document.getElementById(fieldErrorId) as PolyfilledElement;
          expect(fieldError.setHTML).toHaveBeenNthCalledWith(i + 2, errorFunc(field));
        });

        // Remove Our `setHTML` Polyfill
        delete (Element.prototype as PolyfilledElement).setHTML;
        expect((Element.prototype as PolyfilledElement).setHTML).toBe(undefined);
      });

      it("Ignores fields that do not belong to the observed `form`", () => {
        const fieldName = "orphan-field";
        const errorMessage = "This field is UNREAL!!!";
        const formValidityObserver = new FormValidityObserver(types);

        // Render Form
        const { form } = renderEmptyFields();
        const orphanField = createElementWithProps("textarea", { name: fieldName }) satisfies ValidatableField;
        document.body.appendChild(orphanField);
        formValidityObserver.observe(form);

        expect(form.elements).toContain(form.elements[0]);
        expect(form.elements).not.toContain(orphanField);
        expect(orphanField).toHaveAttribute("name", expect.stringMatching(/[a-z]+/));

        // Test Orphan Field
        formValidityObserver.setFieldError(fieldName, errorMessage);
        expect(orphanField).not.toHaveAttribute(attrs["aria-invalid"]);
        expect(orphanField.validationMessage).toBe("");
      });

      it("Ignores fields that do not have a `name`", () => {
        const errorMessage = "This field is ANONYMOUS!!!";
        const formValidityObserver = new FormValidityObserver(types);

        // Render Form
        const { form } = renderEmptyFields();
        const namelessField = document.createElement("textarea");
        form.appendChild(namelessField);
        formValidityObserver.observe(form);

        expect(form.elements).toContain(namelessField);
        expect(namelessField).not.toHaveAttribute("name");

        // Test Nameless Field
        formValidityObserver.setFieldError(namelessField.name, errorMessage);
        expect(namelessField).not.toHaveAttribute(attrs["aria-invalid"]);
        expect(namelessField.validationMessage).toBe("");
      });

      it("Ignores radio buttons that do not belong to an ACCESSIBLE GROUP (`fieldset[role='radiogroup']`)", () => {
        const role = "radiogroup";
        const fieldName = "rogue-radios";
        const errorMessage = "These radio buttons don't have what it takes...";
        const formValidityObserver = new FormValidityObserver(types);

        // Render Form
        const { form } = renderEmptyFields();
        formValidityObserver.observe(form);
        const newRadios = radioValues.map((value) =>
          createElementWithProps("input", { name: fieldName, type: "radio", value })
        );

        // Test Radio Directly in `form`
        form.append(...newRadios);

        formValidityObserver.setFieldError(newRadios[0].name, errorMessage);
        expectNoErrorsFor(newRadios[0]);

        // Test Radio in a NON-`fieldset` with a `radiogroup` Role
        const div = document.createElement("div");
        div.setAttribute("role", role);
        form.appendChild(div);

        div.append(...newRadios);
        newRadios.forEach((radio) => expect(form.elements).toContain(radio));

        formValidityObserver.setFieldError(newRadios[0].name, errorMessage);
        expectNoErrorsFor(newRadios[0]);
        expect(div).not.toHaveAttribute(attrs["aria-invalid"]);

        // Test Radio in a `fieldset` without a `radiogroup` Role
        const newFieldset = document.createElement("fieldset");
        form.appendChild(newFieldset);

        newFieldset.append(...newRadios);
        newRadios.forEach((radio) => expect(form.elements).toContain(radio));

        formValidityObserver.setFieldError(newRadios[0].name, errorMessage);
        expectNoErrorsFor(newRadios[0]);
        expect(newFieldset).not.toHaveAttribute(attrs["aria-invalid"]);
      });

      it("Does nothing if an error message is not provided", () => {
        const errorMessages = Object.freeze(["", () => ""] as const);
        const formValidityObserver = new FormValidityObserver(types);

        // Render Form
        const { form, fieldset, fields } = renderEmptyFields();
        const [firstRadio] = Array.from(fieldset.elements) as HTMLInputElement[];
        formValidityObserver.observe(form);

        // Test Empty Errors
        errorMessages.forEach((error) => {
          [firstRadio, ...fields].forEach((field) => {
            formValidityObserver.setFieldError(field.name, error);
            expectNoErrorsFor(field);
          });
        });
      });

      it("Does not attempt to render INACCESSIBLE error messages as HTML", () => {
        const errorMessage = "No users will benefit from me...";
        const formValidityObserver = new FormValidityObserver(types);

        // Render Form
        const { form, fieldset, fields } = renderEmptyFields();
        const radios = Array.from(fieldset.elements) as HTMLInputElement[];
        formValidityObserver.observe(form);

        // Radio Button Groups
        expect(() => formValidityObserver.setFieldError(radios[0].name, errorMessage, true)).not.toThrow();

        expect(fieldset).toHaveAttribute(attrs["aria-invalid"], String(true));
        expect(fieldset).not.toHaveAccessibleDescription();

        radios.forEach((radio) => {
          expect(radio.validationMessage).toBe("");
          expect(radio).not.toHaveAccessibleDescription();
          expect(radio).not.toHaveAttribute(attrs["aria-invalid"]);
        });

        // Other Fields
        fields.forEach((field) => {
          expect(() => formValidityObserver.setFieldError(field.name, errorMessage, true)).not.toThrow();

          expect(field.validationMessage).toBe("");
          expect(field).not.toHaveAccessibleDescription();
          expect(field).toHaveAttribute(attrs["aria-invalid"], String(true));
        });
      });
    });

    describe("clearFieldError (Method)", () => {
      const errorString = "<div>This error is static!</div>";
      const errorFunc = (field: FormField) => `<div>Element "${field.tagName}" of type "${field.type}" is bad!</div>`;
      const errors = Object.freeze([errorString, errorFunc] as const);

      it("Marks a field as valid (via `aria-invalid`) and removes its error message", () => {
        const formValidityObserver = new FormValidityObserver(types);

        // Render Forms
        const { form, fieldset, fields } = renderEmptyFields();
        const radios = Array.from(fieldset.elements) as HTMLInputElement[];
        formValidityObserver.observe(form);

        // Run Assertions
        errors.forEach((e) => {
          // Apply Errors to Radio Button Group First
          formValidityObserver.setFieldError(radios[0].name, e, false);
          expectErrorFor(radios[0], typeof e === "function" ? e(radios[0]) : e, "none");

          // Verify That Radio Button Group Errors Are Properly Cleared
          formValidityObserver.clearFieldError(radios[0].name);
          expect(fieldset).toHaveAttribute(attrs["aria-invalid"], String(false));

          radios.forEach((radio) => {
            expect(radio.validationMessage).toBe("");
            expect(radio).not.toHaveAttribute(attrs["aria-invalid"]);
          });

          fields.forEach((field) => {
            // Apply Errors to Field First
            formValidityObserver.setFieldError(field.name, e, false);
            expectErrorFor(field, typeof e === "function" ? e(field) : e, "none");

            // Verify That Field Errors Are Properly Cleared
            formValidityObserver.clearFieldError(field.name);
            expect(field.validationMessage).toBe("");
            expect(field).toHaveAttribute(attrs["aria-invalid"], String(false));
          });
        });
      });

      /*
       * Note: Although it's very similar to the previous test and has the exact same setup, we're running this
       * test separately to prove (in the previous test) that nothing crashes if no accessible error messages exist.
       */
      it("Removes a field's ACCESSIBLE error message if it exists", () => {
        const formValidityObserver = new FormValidityObserver(types);

        // Render Forms
        const { form, fieldset, fields } = renderEmptyFields();
        const radios = Array.from(fieldset.elements) as HTMLInputElement[];
        [fieldset, ...fields].forEach((f) => {
          const errorId = `${f instanceof HTMLFieldSetElement ? "fieldset" : f.name}-error`;
          f.setAttribute(attrs["aria-describedby"], errorId);
          document.body.appendChild(createElementWithProps("div", { id: errorId }));
        });
        formValidityObserver.observe(form);

        // Run Assertions
        errors.forEach((e) => {
          // Apply Errors to Radio Group First
          formValidityObserver.setFieldError(radios[0].name, e, false);
          expectErrorFor(radios[0], typeof e === "function" ? e(radios[0]) : e, "a11y");

          // Verify That [Accessible] Radio Button Group Errors Are Properly Cleared
          formValidityObserver.clearFieldError(radios[0].name);
          expect(fieldset).not.toHaveAccessibleDescription();
          radios.forEach((radio) => expect(radio).not.toHaveAccessibleDescription());

          fields.forEach((field) => {
            // Apply Errors to Field First
            formValidityObserver.setFieldError(field.name, e, false);
            expectErrorFor(field, typeof e === "function" ? e(field) : e, "a11y");

            // Verify That [Accessible] Field Errors Are Properly Cleared
            formValidityObserver.clearFieldError(field.name);
            expect(field).not.toHaveAccessibleDescription();
          });
        });
      });

      it("Ignores fields that do not belong to the observed `form`", () => {
        const fieldName = "orphaned-field";
        const formValidityObserver = new FormValidityObserver(types);

        // Render Forms
        const { form } = renderEmptyFields();
        const orphanedField = createElementWithProps("textarea", { name: fieldName }) satisfies ValidatableField;
        form.appendChild(orphanedField);
        formValidityObserver.observe(form);

        expect(form.elements).toContain(orphanedField);
        expect(orphanedField).toHaveAttribute("name", expect.stringMatching(/[a-z]+/));

        formValidityObserver.setFieldError(orphanedField.name, errorString, false);
        expectErrorFor(orphanedField, errorString, "none");

        // Run Assertions
        document.body.insertAdjacentElement("beforeend", orphanedField);
        expect(form.elements).not.toContain(orphanedField);

        formValidityObserver.clearFieldError(orphanedField.name);
        expect(orphanedField).toHaveAttribute(attrs["aria-invalid"], String(true));
        expect(orphanedField.validationMessage).toBe(errorString);
      });

      it("Ignores fields that do not have a `name`", () => {
        const fieldName = "transient-field";
        const formValidityObserver = new FormValidityObserver(types);

        // Render Forms
        const { form } = renderEmptyFields();
        const transientField = createElementWithProps("textarea", { name: fieldName }) satisfies ValidatableField;
        form.appendChild(transientField);
        formValidityObserver.observe(form);

        expect(form.elements).toContain(transientField);
        expect(transientField).toHaveAttribute("name", expect.stringMatching(/[a-z]+/));

        formValidityObserver.setFieldError(transientField.name, errorString, false);
        expectErrorFor(transientField, errorString, "none");

        // Run Assertions
        transientField.setAttribute("name", "");
        formValidityObserver.clearFieldError(transientField.name);

        expect(transientField).toHaveAttribute(attrs["aria-invalid"], String(true));
        expect(transientField.validationMessage).toBe(errorString);
      });

      it("Ignores radio buttons that do not belong to an ACCESSIBLE GROUP (`fieldset[role='radiogroup']`)", () => {
        const role = "radiogroup";
        const formValidityObserver = new FormValidityObserver(types);

        // Render Form
        const { form, fieldset } = renderEmptyFields();
        const radios = Array.from(fieldset.elements) as HTMLInputElement[];
        formValidityObserver.observe(form);

        formValidityObserver.setFieldError(radios[0].name, errorString);
        expectErrorFor(radios[0], errorString, "none");

        // Test Radio in a `fieldset` without a `radiogroup` Role
        fieldset.removeAttribute("role");

        formValidityObserver.clearFieldError(radios[0].name);
        expect(fieldset).toHaveAttribute(attrs["aria-invalid"], String(true));
        expect(radios[0].validationMessage).toBe(errorString);

        // Test Radio in a NON-`fieldset` with a `radiogroup` Role
        const div = document.createElement("div");
        div.setAttribute("role", role);
        form.appendChild(div);

        div.append(...radios);
        radios.forEach((radio) => expect(form.elements).toContain(radio));

        formValidityObserver.clearFieldError(radios[0].name);
        expect(radios[0].validationMessage).toBe(errorString);

        // Test Radio Directly in `form`
        form.append(...radios);
        formValidityObserver.clearFieldError(radios[0].name);
        expect(radios[0].validationMessage).toBe(errorString);
      });
    });

    describe("register (Method)", () => {});
    describe("validateFields (Method)", () => {});
    describe("validateField (Method)", () => {
      /*
       * NOTE: These tests are not complete yet. They have been temporarily halted while workong on methods.
       *
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
              expectNoErrorsFor(input);
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

        /** TODO: Replace with {@link expectErrorFor}. EDIT: Is such a thing possible given default browser errors? */
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
          const derivedError = getTextFromMarkup(customError);
          expect(field.validationMessage).not.toBe(derivedError);
          expect(field).toHaveAccessibleDescription(derivedError);
        }
      });
    });
  });
});
