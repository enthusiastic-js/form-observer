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

  /** The options for the {@link renderField} utility function */
  interface RenderFieldOptions {
    /** Indicates that the field is expected to have an accessible error message. Defaults to `false`. */
    accessible?: boolean;
  }

  /**
   * Renders a single field in a `form` for testing.
   *
   * @param field
   * @param options
   * @returns References to the `field` that was provided and the `form` in which it was rendered.
   */
  function renderField<T extends ValidatableField>(field: T, { accessible }: RenderFieldOptions = {}) {
    const form = document.createElement("form");
    form.setAttribute("aria-label", "Form with Single Field");
    form.appendChild(field);
    document.body.appendChild(form);

    const references = Object.freeze(Object.assign([form, field] as const, { form, field } as const));
    if (!accessible) return references;

    const descriptionId = "description";
    form.appendChild(createElementWithProps("div", { id: descriptionId }));
    field.setAttribute("aria-describedby", descriptionId);
    return references;
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
        renderField(createElementWithProps("input", { name: "first-name", type: "text", required: true }));

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
      expect(error).not.toBe("");

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
        expect(radios[0].validity.customError).toBe(method !== "html");
        if (method !== "html") expect(radios[0].validationMessage).toEqual(error);
        radios.slice(1).forEach((radio) => expect(radio.validationMessage).toBe(""));

        radios.forEach((radio) => {
          expect(radio).not.toHaveAttribute(attrs["aria-invalid"]);
          if (method !== "none") expect(radio).not.toHaveAccessibleDescription();
        });
      }
      // All Other Fields
      else {
        expect(field.validity.customError).toBe(method !== "html");
        if (method !== "html") expect(field.validationMessage).toEqual(error);
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

    describe("validateField (Method)", () => {
      it("Returns `true` when a field PASSES validation and `false` when a field FAILS validation", () => {
        // Render Field
        const { form, field } = renderField(createElementWithProps("input", { name: "input", required: true }));
        const formValidityObserver = new FormValidityObserver(types[0]);
        formValidityObserver.observe(form);

        // Failure (Missing Value)
        expect(formValidityObserver.validateField(field.name)).toBe(false);

        // Success
        field.value = "Some Value"; // Avoid triggering events
        expect(formValidityObserver.validateField(field.name)).toBe(true);
      });

      it("Sets the field's error when it fails validation", () => {
        // Setup
        const { form, field } = renderField(createElementWithProps("input", { name: "input", required: true }));
        const formValidityObserver = new FormValidityObserver(types[0]);
        formValidityObserver.observe(form);

        jest.spyOn(formValidityObserver, "setFieldError");

        // Run Assertions
        expect(formValidityObserver.validateField(field.name)).toBe(false);

        expectErrorFor(field, field.validationMessage);
        expect(formValidityObserver.setFieldError).toHaveBeenCalledTimes(1);
        expect(formValidityObserver.setFieldError).toHaveBeenCalledWith(field.name, field.validationMessage, false);
      });

      it("Clears the field's error when it passes validation", () => {
        // Setup
        const { form, field } = renderField(createElementWithProps("input", { name: "input", required: true }));
        const formValidityObserver = new FormValidityObserver(types[0]);
        formValidityObserver.observe(form);

        jest.spyOn(formValidityObserver, "setFieldError");
        jest.spyOn(formValidityObserver, "clearFieldError");

        // Failure (Value Missing)
        expect(formValidityObserver.validateField(field.name)).toBe(false);
        expectErrorFor(field, field.validationMessage);

        // Success
        field.value = "Some Value"; // Avoid triggering events
        expect(formValidityObserver.validateField(field.name)).toBe(true);
        expect(formValidityObserver.setFieldError).toHaveBeenCalledTimes(1); // Method is NOT called on success

        expectNoErrorsFor(field);
        expect(formValidityObserver.clearFieldError).toHaveBeenCalledTimes(1);
        expect(formValidityObserver.clearFieldError).toHaveBeenCalledWith(field.name);
      });

      it("Supports custom, user-defined validation", () => {
        // Render Field
        const badValue = "LAME";
        const { form, field } = renderField(createElementWithProps("input", { name: "input", value: badValue }));
        const formValidityObserver = new FormValidityObserver(types[0]);
        formValidityObserver.observe(form);

        // Setup Test Details
        jest.spyOn(formValidityObserver, "setFieldError");
        jest.spyOn(formValidityObserver, "clearFieldError");

        const error = "This field is LAAAAAAME!!!";
        const validate = jest.fn((f: HTMLInputElement) => (f.value === badValue ? error : undefined));
        formValidityObserver.register(field.name, { validate });

        // Failure (Custom Validation Failure)
        expect(formValidityObserver.validateField(field.name)).toBe(false);
        expect(validate).toHaveBeenCalledWith(field);
        expect(validate).toHaveBeenCalledTimes(1);

        expectErrorFor(field, error);
        expect(formValidityObserver.setFieldError).toHaveBeenCalledTimes(1);
        expect(formValidityObserver.setFieldError).toHaveBeenCalledWith(field.name, error);

        // Success
        field.value = ""; // Avoid triggering events
        expect(formValidityObserver.validateField(field.name)).toBe(true);
        expect(validate).toHaveBeenNthCalledWith(2, field);
        expect(validate).toHaveBeenCalledTimes(2);

        expectNoErrorsFor(field);
        expect(formValidityObserver.clearFieldError).toHaveBeenCalledTimes(1);
        expect(formValidityObserver.clearFieldError).toHaveBeenCalledWith(field.name);
      });

      it("Supports ASYNCHRONOUS user-defined validation", async () => {
        // Render Field
        const badValue = "Unfaithful";
        const { form, field } = renderField(createElementWithProps("input", { name: "input", value: badValue }));
        const formValidityObserver = new FormValidityObserver(types[0]);
        formValidityObserver.observe(form);

        // Setup Test Details
        jest.spyOn(formValidityObserver, "setFieldError");
        jest.spyOn(formValidityObserver, "clearFieldError");

        const error = "You didn't fulfill your promise to me...";
        const validate = jest.fn((f: HTMLInputElement) => {
          return new Promise<string | undefined>((resolve) => {
            setTimeout(() => resolve(f.value === badValue ? error : undefined), 1000);
          });
        });
        formValidityObserver.register(field.name, { validate });

        // Async Failure (Custom Validation Failure)
        const failingPromise = formValidityObserver.validateField(field.name);
        expect(failingPromise).toEqual(expect.any(Promise));

        // No errors are updated until after the promise is resolved
        expectNoErrorsFor(field);
        expect(await failingPromise).toBe(false);

        expectErrorFor(field, error);
        expect(formValidityObserver.setFieldError).toHaveBeenCalledTimes(1);
        expect(formValidityObserver.setFieldError).toHaveBeenCalledWith(field.name, error);

        // Async Success
        field.value = ""; // Avoid triggering events
        const succeedingPromise = formValidityObserver.validateField(field.name);
        expect(succeedingPromise).toEqual(expect.any(Promise));

        // Again, error state isn't updated until after promise resolves.
        // Note: Because of conflicting acceptance criteria, we can't use the `validationMessage` to verify this.
        expect(field).toHaveAttribute(attrs["aria-invalid"], String(true));
        expect(await succeedingPromise).toBe(true);

        expectNoErrorsFor(field);
        expect(formValidityObserver.clearFieldError).toHaveBeenCalledTimes(1);
        expect(formValidityObserver.clearFieldError).toHaveBeenCalledWith(field.name);
      });

      it("HIERARCHICALLY displays the error message(s) for the constraint(s) that the field has broken", () => {
        /* ---------- Setup ---------- */
        const { form, field } = renderField(createElementWithProps("input", { name: "overriden", value: "RIP" }));
        const formValidityObserver = new FormValidityObserver(types[0]);
        jest.spyOn(formValidityObserver, "setFieldError");
        jest.spyOn(formValidityObserver, "clearFieldError");

        // Override field's `ValidityState` for testing
        type OverridenValidity = { -readonly [K in keyof ValidityState]: ValidityState[K] };

        Object.defineProperty(field, "validity", {
          writable: true,
          configurable: false,
          value: {
            badInput: true,
            patternMismatch: true,
            rangeOverflow: true,
            rangeUnderflow: true,
            stepMismatch: true,
            tooLong: true,
            tooShort: true,
            typeMismatch: true,
            valueMissing: true,

            get customError() {
              return field.validationMessage !== "";
            },
            get valid() {
              const validationKeys = Object.keys(this).filter((k) => k !== "valid");
              return validationKeys.every((k) => this[k as keyof ValidityState] === false);
            },
          } satisfies ValidityState,
        });

        Object.entries(field.validity)
          .filter(([k]) => k !== "customError" && k !== "valid") // Unused Properties
          .forEach(([, v]) => expect(v).toBe(true));

        // Create custom error messages (in case JSDOM doesn't support unique "browser messages" by default)
        const errorMessages = Object.freeze({
          required: "You think you don't need me?",
          minlength: "Please, tell me more...",
          maxlength: "SAY LESS!",
          min: "You need a larger number!",
          max: "Um... That number is a little bit too large, though...",
          step: "You can't just give me ANY kind of number!",
          type: "Did you forget what kind of input I am?",
          pattern: "Okay. Here's what I want...",
          badinput: "Seriously, I cannot understand a single thing you're saying.",
          validate: (f: HTMLInputElement) => `The value ${f.value} is incorrect, bro.`,
        }) satisfies Required<Parameters<(typeof formValidityObserver)["register"]>[1]>;

        // Require that ALL of the custom error messages are UNIQUE. (This is just for clarity/future-proofing)
        Object.values(errorMessages).forEach((e, i, a) =>
          a.slice(i + 1).forEach((E) => {
            const getError = (error: typeof e) => (typeof error === "function" ? error(field) : error);
            expect(getError(e)).not.toBe(getError(E));
          })
        );

        /* ---------- Run Assertions ---------- */
        // Register Error Messages, THEN observe `form`
        formValidityObserver.register(field.name, errorMessages);
        formValidityObserver.observe(form);

        /** An array of form field constraints and their corresponding {@link ValidityState} properties. */
        const constraints = [
          ["required", "valueMissing"],
          ["minlength", "tooShort"],
          ["min", "rangeUnderflow"],
          ["maxlength", "tooLong"],
          ["max", "rangeOverflow"],
          ["step", "stepMismatch"],
          ["type", "typeMismatch"],
          ["pattern", "patternMismatch"],
        ] as const satisfies ReadonlyArray<readonly [keyof typeof errorMessages, keyof ValidityState]>;

        // Doubly make sure we'll be testing EVERY validation option (for clarity/future-proofing)
        {
          const validationProperties = constraints.map(([, prop]) => prop);
          Object.keys(field.validity).forEach((validationProperty) => {
            if (validationProperty === "customError" || validationProperty === "valid") return; // Unused properties
            if (validationProperty === "badInput") return; // We handle `badInput` separately
            expect(validationProperties).toContain(validationProperty);
          });
        }

        // Check Regular Field Constraints
        constraints.forEach(([attribute, validationProperty], i) => {
          expect(formValidityObserver.validateField(field.name)).toBe(false);

          expectErrorFor(field, errorMessages[attribute]);
          expect(formValidityObserver.setFieldError).toHaveBeenCalledTimes(i + 1);
          expect(formValidityObserver.setFieldError).toHaveBeenCalledWith(field.name, errorMessages[attribute], false);

          (field.validity as OverridenValidity)[validationProperty] = false;
        });

        // Check Browser's "Bad Input" Constraint
        expect(formValidityObserver.validateField(field.name)).toBe(false);

        expectErrorFor(field, errorMessages.badinput);
        expect(formValidityObserver.setFieldError).toHaveBeenCalledTimes(9);
        expect(formValidityObserver.setFieldError).toHaveBeenCalledWith(field.name, errorMessages.badinput, false);
        (field.validity as OverridenValidity).badInput = false;

        // Check User-Defined Validation
        expect(formValidityObserver.validateField(field.name)).toBe(false);

        expect(formValidityObserver.setFieldError).toHaveBeenCalledTimes(10);
        expect(formValidityObserver.setFieldError).toHaveBeenCalledWith(field.name, errorMessages.validate(field));
        expectErrorFor(field, errorMessages.validate(field));

        // Validation Passes When All Constraints Are Satisfied
        formValidityObserver.register(field.name, {}); // Aggressively remove the custom function that forced errors
        expect(formValidityObserver.validateField(field.name)).toBe(true);

        expectNoErrorsFor(field);
        expect(formValidityObserver.clearFieldError).toHaveBeenCalledTimes(1);
        expect(formValidityObserver.clearFieldError).toHaveBeenCalledWith(field.name);
      });

      it("Renders a field's error message as HTML when the error configuration requires it", () => {
        // Render Field
        const error = "<div>Some people will render me correctly, and others won't.</div>";
        const { form, field } = renderField(
          createElementWithProps("input", { name: "field", type: "number", required: true, min: "1", max: "1336" }),
          { accessible: true }
        );

        // Setup `FormValidityObserver`
        const formValidityObserver = new FormValidityObserver(types[0]);
        formValidityObserver.observe(form);

        const errorConfiguration: Parameters<(typeof formValidityObserver)["register"]>[1] = {
          required: { message: error },
          min: { message: error, render: false },
          max: { message: error, render: true },
        };
        formValidityObserver.register(field.name, errorConfiguration);

        // Test with `render` Option Omitted
        expect(field.validity.valueMissing).toBe(true);
        expect(errorConfiguration.required).not.toHaveProperty("render");

        expect(formValidityObserver.validateField(field.name)).toBe(false);
        expectErrorFor(field, error, "a11y");

        // Test with `render` Option Disabled
        field.value = "0"; // Avoid triggering events
        expect(field.validity.rangeUnderflow).toBe(true);
        expect(errorConfiguration.min).toHaveProperty("render", false);

        expect(formValidityObserver.validateField(field.name)).toBe(false);
        expectErrorFor(field, error, "a11y");

        // Test with `render` Option Required
        field.value = "1337"; // Avoid triggering events
        expect(field.validity.rangeOverflow).toBe(true);
        expect(errorConfiguration.max).toHaveProperty("render", true);

        expect(formValidityObserver.validateField(field.name)).toBe(false);
        expectErrorFor(field, expect.not.stringMatching(error), "html");
        expectErrorFor(field, getTextFromMarkup(error), "html");
      });

      it("Renders a field's error message as HTML when the user-defined validation requires it", async () => {
        // Render Field
        const error = "<p>Shall I be rendered? Or not?</div>";
        const { form, field } = renderField(createElementWithProps("input", { name: "user-validated" }), {
          accessible: true,
        });

        // Setup `FormValidityObserver`
        const formValidityObserver = new FormValidityObserver(types[0]);
        formValidityObserver.observe(form);

        const validate = jest.fn();
        formValidityObserver.register(field.name, { validate });

        // Test with `render` Option Omitted
        validate.mockReturnValueOnce({ message: error });
        expect(formValidityObserver.validateField(field.name)).toBe(false);
        expectErrorFor(field, error, "a11y");

        // Test with `render` Option Disabled
        validate.mockReturnValueOnce({ message: error, render: false });
        expect(formValidityObserver.validateField(field.name)).toBe(false);
        expectErrorFor(field, error, "a11y");

        // Test with `render` Option Required (Sync)
        validate.mockReturnValueOnce({ message: error, render: true });
        expect(formValidityObserver.validateField(field.name)).toBe(false);
        expectErrorFor(field, expect.not.stringMatching(error), "html");
        expectErrorFor(field, getTextFromMarkup(error), "html");

        // Test with `render` Option Required (Async)
        validate.mockReturnValueOnce(Promise.resolve({ message: error, render: true }));
        expect(await formValidityObserver.validateField(field.name)).toBe(false);
        expectErrorFor(field, expect.not.stringMatching(error), "html");
        expectErrorFor(field, getTextFromMarkup(error), "html");
      });

      it("Removes stale custom `validationMessage`s from a field during validation", () => {
        // Render Field
        const customError = "Don't leave me!";
        const { form, field } = renderField(
          createElementWithProps("input", { name: "field", required: true, pattern: "\\d+" })
        );

        // Setup `FormValidityObserver`
        const formValidityObserver = new FormValidityObserver(types[0]);
        formValidityObserver.observe(form);

        const errorConfiguration = { required: customError } as const;
        formValidityObserver.register(field.name, errorConfiguration);

        // Cause a Custom Error to be displayed
        expect(field.validity.valueMissing).toBe(true);
        expect(errorConfiguration).toHaveProperty("required");

        expect(formValidityObserver.validateField(field.name)).toBe(false);
        expectErrorFor(field, customError, "none");

        // Verify that an obsolete Custom Error is properly replaced by a new, relevant Browser Error
        field.value = "Letter"; // Avoid triggering events
        expect(field.validity.valueMissing).toBe(false);
        expect(field.validity.patternMismatch).toBe(true);
        expect(errorConfiguration).not.toHaveProperty("pattern");

        expect(formValidityObserver.validateField(field.name)).toBe(false);
        expectErrorFor(field, field.validationMessage, "none");
        expectErrorFor(field, expect.not.stringMatching(customError), "none");
      });

      it("Ignores fields that aren't associated with the observed `form`", () => {
        const fieldName = "orphan-field";
        const formValidityObserver = new FormValidityObserver(types);
        jest.spyOn(formValidityObserver, "setFieldError");
        jest.spyOn(formValidityObserver, "clearFieldError");

        // Render Form
        const { form } = renderEmptyFields();
        const orphanField = createElementWithProps("textarea", { name: fieldName, required: true });
        document.body.appendChild(orphanField);
        formValidityObserver.observe(form);

        expect(form.elements).toContain(form.elements[0]);
        expect(form.elements).not.toContain(orphanField);
        expect(orphanField).toHaveAttribute("name", expect.stringMatching(/[a-z]+/));

        // Test Orphan Field (Setting Errors)
        expect(orphanField.validity.valid).toBe(false);

        // Error is not set even though field is invalid
        expect(formValidityObserver.validateField(orphanField.name)).toBe(false); // "Fails" due to rejected field
        expect(formValidityObserver.setFieldError).not.toHaveBeenCalled();
        expect(orphanField).not.toHaveAttribute(attrs["aria-invalid"]);

        // Test Orphan Field (Removing Errors)
        orphanField.value = "Some Value"; // Avoid triggering events
        expect(orphanField.validity.valid).toBe(true);
        orphanField.setAttribute(attrs["aria-invalid"], String(true));

        // Error is not cleared even though field is valid
        expect(formValidityObserver.validateField(orphanField.name)).toBe(false); // "Fails" due to rejected field
        expect(formValidityObserver.clearFieldError).not.toHaveBeenCalled();
        expect(orphanField).toHaveAttribute(attrs["aria-invalid"], String(true));
      });

      it("Ignores fields that don't have a `name`", () => {
        const formValidityObserver = new FormValidityObserver(types);
        jest.spyOn(formValidityObserver, "setFieldError");
        jest.spyOn(formValidityObserver, "clearFieldError");

        // Render Form
        const { form } = renderEmptyFields();
        const namelessField = createElementWithProps("textarea", { required: true });
        form.appendChild(namelessField);
        formValidityObserver.observe(form);

        expect(form.elements).toContain(namelessField);
        expect(namelessField).not.toHaveAttribute("name");

        // Test Nameless Field (Setting Errors)
        expect(namelessField.validity.valid).toBe(false);

        // Error is not set even though field is invalid
        expect(formValidityObserver.validateField(namelessField.name)).toBe(false); // "Fails" due to rejected field
        expect(formValidityObserver.setFieldError).not.toHaveBeenCalled();
        expect(namelessField).not.toHaveAttribute(attrs["aria-invalid"]);

        // Test Orphan Field (Removing Errors)
        namelessField.value = "Some Value"; // Avoid triggering events
        expect(namelessField.validity.valid).toBe(true);
        namelessField.setAttribute(attrs["aria-invalid"], String(true));

        // Error is not cleared even though field is valid
        expect(formValidityObserver.validateField(namelessField.name)).toBe(false); // "Failes" due to rejected field
        expect(formValidityObserver.clearFieldError).not.toHaveBeenCalled();
        expect(namelessField).toHaveAttribute(attrs["aria-invalid"], String(true));
      });
    });

    describe("register (Method)", () => {});
    describe("validateFields (Method)", () => {
      // TODO: Is this good phrasing?
      it.todo("Waits until ALL asynchronous validation functions have finished before returning a value");
    });
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
          const accessible = method === "Accessible";

          // TODO: Need a way to handle scenarios where we render markup for the error instead
          // TODO: We need to refactor `FormValidityObserver` before we can really go any further.
          const validationRuleValue = (() => {
            if (rendering === "Markup") return { message: customError, render: true } as const;
            return type === "Custom" ? customError : undefined;
          })();

          describe("<input /> Validation", () => {
            // eslint-disable-next-line jest/expect-expect -- TODO: Update ESLint config instead
            it("Validates the `input`'s field type", async () => {
              renderField(createElementWithProps("input", { name: "email", type: "email" }), { accessible });
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
