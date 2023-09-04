import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/extend-expect";
import { faker } from "@faker-js/faker";
import type { EventType, FormField } from "../types";
import * as Assertions from "../utils/assertions";
import FormObserver from "../FormObserver";
import FormStorageObserver from "../FormStorageObserver";

describe("Form Storage Observer (Class)", () => {
  // Form Storage Observer Constants
  const types = ["change", "focusin"] as const satisfies ReadonlyArray<EventType>;

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
    expect(new FormStorageObserver(types[0])).toEqual(expect.any(FormObserver));
  });

  it("Determines the event phase for the data storage event handler from the `options` (defaults to bubbling)", () => {
    /* ---------- Setup ---------- */
    const formStorageObserverCapture = new FormStorageObserver(types[0], { useEventCapturing: true });
    const formStorageObserverBubble = new FormStorageObserver(types[0]);
    const form = document.createElement("form");

    const addEventListener = jest.spyOn(form.ownerDocument, "addEventListener");
    const removeEventListener = jest.spyOn(form.ownerDocument, "removeEventListener");

    const captureOptions = expect.objectContaining({ capture: true });
    const bubbleOptions = expect.objectContaining({ capture: undefined });

    /* ---------- Run Assertions ---------- */
    // Test `observe`
    formStorageObserverCapture.observe(form);
    expect(addEventListener).toHaveBeenNthCalledWith(1, expect.anything(), expect.anything(), captureOptions);

    formStorageObserverBubble.observe(form);
    expect(addEventListener).toHaveBeenNthCalledWith(2, expect.anything(), expect.anything(), bubbleOptions);

    // Test `unobserve`
    formStorageObserverCapture.unobserve(form);
    expect(removeEventListener).toHaveBeenNthCalledWith(1, expect.anything(), expect.anything(), captureOptions);

    formStorageObserverBubble.unobserve(form);
    expect(removeEventListener).toHaveBeenNthCalledWith(2, expect.anything(), expect.anything(), bubbleOptions);
  });

  describe("observe (Method)", () => {
    it("Extends the functionality of `FormObserver.observe`", () => {
      const form = document.createElement("form");
      jest.spyOn(FormObserver.prototype, "observe");
      const formStorageObserver = new FormStorageObserver(types);

      // Confirm that the method is an extension, not a direct copy
      formStorageObserver.observe(form);
      expect(FormObserver.prototype.observe).toHaveBeenNthCalledWith(1, form);
      expect(formStorageObserver.observe).not.toBe(FormObserver.prototype.observe);
    });

    it("Automatically loads a `form`'s data from `localStorage` IF the `automate` option says so (default)", () => {
      const form = document.createElement("form");
      jest.spyOn(FormStorageObserver, "load");

      // No data is loaded when `automate` is `deletion` or `neither`
      (["deletion", "neither"] as const).forEach((automate) => {
        const formStorageObserver = new FormStorageObserver(types, { automate });
        formStorageObserver.observe(form);
        expect(FormStorageObserver.load).not.toHaveBeenCalled();
      });

      // Data is automatically loaded for newly observed forms by default, or when `automate` is `loading` or `both`
      ([undefined, "loading", "both"] as const).forEach((automate, i) => {
        const formStorageObserver = new FormStorageObserver(types, { automate });
        formStorageObserver.observe(form);

        expect(FormStorageObserver.load).toHaveBeenCalledTimes(i + 1);
        expect(FormStorageObserver.load).toHaveBeenNthCalledWith(i + 1, form);
      });
    });

    it("Does nothing with a `form` that is already being observed", () => {
      const form = document.createElement("form");
      const formStorageObserver = new FormStorageObserver(types, { automate: "both" });
      jest.spyOn(FormStorageObserver, "load");

      // Newly observe the form
      formStorageObserver.observe(form);
      expect(FormStorageObserver.load).toHaveBeenNthCalledWith(1, form);

      // No attempts are made to load data from `localStorage` during a _redundant_ observation. No errors are thrown.
      expect(() => formStorageObserver.observe(form)).not.toThrow();
      expect(FormStorageObserver.load).toHaveBeenCalledTimes(1);
    });

    it("Returns `true` if the received `form` was NOT already being observed (and `false` otherwise)", () => {
      const firstForm = document.createElement("form");
      const secondForm = document.createElement("form");
      const formStorageObserver = new FormStorageObserver(types[0]);

      // Returns `true` because the `form`s were not originally being observed
      expect(formStorageObserver.observe(firstForm)).toBe(true);
      expect(formStorageObserver.observe(secondForm)).toBe(true);

      // Returns `false` because the `form`s were already being observed
      expect(formStorageObserver.observe(firstForm)).toBe(false);
      expect(formStorageObserver.observe(secondForm)).toBe(false);

      // Resets are also handled correctly.
      formStorageObserver.unobserve(firstForm);
      expect(formStorageObserver.observe(firstForm)).toBe(true);
    });
  });

  describe("unobserve (Method)", () => {
    it("Extends the functionality of `FormObserver.unobserve`", () => {
      const form = document.createElement("form");
      jest.spyOn(FormObserver.prototype, "unobserve");
      const formStorageObserver = new FormStorageObserver(types);

      // Confirm that the method is an extension, not a direct copy
      formStorageObserver.unobserve(form);
      expect(FormObserver.prototype.unobserve).toHaveBeenNthCalledWith(1, form);
      expect(formStorageObserver.unobserve).not.toBe(FormObserver.prototype.unobserve);
    });

    it("Automatically clears a `form`'s data from `localStorage` IF the `automate` option says so", () => {
      const form = document.createElement("form");
      jest.spyOn(FormStorageObserver, "clear");

      // No data is cleared by default, or when `automate` is `loading` or `neither`
      ([undefined, "loading", "neither"] as const).forEach((automate) => {
        const formStorageObserver = new FormStorageObserver(types, { automate });
        formStorageObserver.observe(form);
        formStorageObserver.unobserve(form);

        expect(FormStorageObserver.clear).not.toHaveBeenCalled();
      });

      // Data is automatically cleared for newly unobserved forms when `automate` is `deletion` or `both`
      (["deletion", "both"] as const).forEach((automate, i) => {
        const formStorageObserver = new FormStorageObserver(types, { automate });
        formStorageObserver.observe(form);
        formStorageObserver.unobserve(form);

        expect(FormStorageObserver.clear).toHaveBeenCalledTimes(i + 1);
        expect(FormStorageObserver.clear).toHaveBeenNthCalledWith(i + 1, form);
      });
    });

    it("Does nothing with a `form` that isn't currently being observed", () => {
      const form = document.createElement("form");
      const formStorageObserver = new FormStorageObserver(types, { automate: "both" });
      jest.spyOn(FormStorageObserver, "clear");

      // No errors are thrown, and no attempts are made to clear data from `localStorage`
      expect(() => formStorageObserver.unobserve(form)).not.toThrow();
      expect(FormStorageObserver.clear).not.toHaveBeenCalled();

      // Attempts are still made to clear data from `localStorage` if a form was "newly unobserved"
      formStorageObserver.observe(form);
      formStorageObserver.unobserve(form);
      expect(FormStorageObserver.clear).toHaveBeenNthCalledWith(1, form);

      // But _redundant_ calls still do nothing
      formStorageObserver.unobserve(form);
      expect(FormStorageObserver.clear).toHaveBeenCalledTimes(1);
    });

    it("Returns `true` if the received `form` WAS already being observed (and `false` otherwise)", () => {
      const firstForm = document.createElement("form");
      const secondForm = document.createElement("form");
      const formStorageObserver = new FormStorageObserver(types);

      // Returns `false` because the `form`s were not originally being observed
      expect(formStorageObserver.unobserve(firstForm)).toBe(false);
      expect(formStorageObserver.unobserve(secondForm)).toBe(false);

      // Returns `true` because the `form`s were already being observed
      formStorageObserver.observe(firstForm);
      expect(formStorageObserver.unobserve(firstForm)).toBe(true);

      formStorageObserver.observe(secondForm);
      expect(formStorageObserver.unobserve(secondForm)).toBe(true);
    });
  });

  describe("disconnect (Method)", () => {
    it("Solely leverages its parent's implementation", () => {
      jest.spyOn(FormObserver.prototype, "disconnect");
      const formStorageObserver = new FormStorageObserver(types);
      expect(formStorageObserver.disconnect).toBe(FormObserver.prototype.disconnect);
    });
  });

  describe("Local Storage Interactions", () => {
    const testOptions = ["1", "2", "3"] as const;
    type TestOption = (typeof testOptions)[number];

    interface TestFormData {
      input: string;
      textarea: string;
      checkbox: boolean;
      radio: TestOption;
      select: TestOption;
      multiselect: TestOption[] | ReadonlyArray<TestOption>;
    }

    const fields = {
      input: { name: "input", default: "" },
      textarea: { name: "textarea", default: "" },
      checkbox: { name: "checkbox", default: false },
      radio: { name: "radio", default: "3" },
      select: { name: "select", default: "3" },
      multiselect: { name: "multiselect", default: ["2", "3"] },
    } as const satisfies { [K in keyof TestFormData]: { name: K; default: TestFormData[K] } };

    const forms = {
      primary: { name: "primary-form", "aria-label": "Primary Form" },
      secondary: { name: "secondary-form", "aria-label": "Secondary Form" },
      unscoped: { "aria-label": "Unscoped Form" },
    } as const;

    /**
     * Derives the proper `localStorage` key for a given `form`'s field. _Duplicates the local function used by
     * [`FormStorageObserver`](./../FormStorageObserver.ts)_
     */
    function getFieldKey(formName: string, fieldName: string): `form:${string}:${string}` {
      return `form:${formName || "global-scope"}:${fieldName}` as const;
    }

    /**
     * Renders a `Primary Form` that is scoped by a unique `name`, a `Secondary Form` that is scoped by
     * another unique `name`, and an `Unscoped Form` that isn't scoped by a `name` attribute at all. These
     * `form`s each contain all of the common types of form fields. Prefer the `Primary Form` for your tests
     * unless you need to test the behavior of 2 scoped `form`s in conjunction or you need to test an unscoped
     * (unnamed) `form`. If you need a more custom `form`, simply use the Testing Library `render` function directly.
     *
     * @returns References to the `Primary Form`, `Secondary Form`, and `Unscoped Form`
     */
    function renderForms() {
      /** Creates `name` and `aria-label` props based on the provided `name` argument */
      const labelAndName = <T extends keyof TestFormData>(name: T) => ({ name, "aria-label": name });

      render(
        <>
          {Object.values(forms).map((formProps) => (
            <form key={formProps["aria-label"]} {...formProps}>
              <input {...labelAndName(fields.input.name)} type="text" defaultValue={fields.input.default} />
              <textarea {...labelAndName(fields.textarea.name)} defaultValue={fields.textarea.default} />
              <input {...labelAndName(fields.checkbox.name)} type="checkbox" defaultChecked={fields.checkbox.default} />

              {testOptions.map((o) => (
                <input
                  key={o}
                  name={fields.radio.name}
                  aria-label={`${fields.radio.name}-${o}`}
                  type="radio"
                  value={o}
                  defaultChecked={o === fields.radio.default}
                />
              ))}

              <select {...labelAndName(fields.select.name)} defaultValue={fields.select.default}>
                {testOptions.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>

              <select {...labelAndName(fields.multiselect.name)} multiple defaultValue={fields.multiselect.default}>
                {testOptions.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </form>
          ))}
        </>
      );

      // Verify setup conditions for all 3 forms
      screen.getAllByRole<HTMLFormElement>("form").forEach((form) => {
        const input = within(form).getByRole("textbox", { name: fields.input.name });
        expect(input).toHaveValue(fields.input.default);
        expect(input.matches("input[name][type='text']")).toBe(true);

        const textarea = within(form).getByRole("textbox", { name: fields.textarea.name });
        expect(textarea).toHaveValue(fields.textarea.default);
        expect(textarea.matches("textarea[name]")).toBe(true);

        const checkbox = within(form).getByRole<HTMLInputElement>("checkbox", { name: fields.checkbox.name });
        expect(checkbox.checked).toBe(fields.checkbox.default);
        expect(checkbox.matches("input[name][type='checkbox']")).toBe(true);

        testOptions.forEach((o) => {
          const radio = within(form).getByRole<HTMLInputElement>("radio", { name: `${fields.radio.name}-${o}` });
          expect(radio).toHaveAttribute("value", o);
          expect(radio.checked).toBe(o === fields.radio.default);
          expect(radio.matches("input[name][type='radio']")).toBe(true);
        });

        const select = within(form).getByRole("combobox", { name: fields.select.name });
        expect(select).toHaveValue(fields.select.default);
        expect(select.matches("select[name]")).toBe(true);

        const multiselect = within(form).getByRole<HTMLSelectElement>("listbox", { name: fields.multiselect.name });
        expect(multiselect.matches("select[name][multiple]")).toBe(true);
        Array.from(multiselect.options).forEach((o) => {
          expect(o.selected).toBe((fields.multiselect.default as ReadonlyArray<string>).includes(o.value));
        });
      });

      const primaryForm = screen.getByRole<HTMLFormElement>("form", { name: forms.primary["aria-label"] });
      const secondaryForm = screen.getByRole<HTMLFormElement>("form", { name: forms.secondary["aria-label"] });
      const unscopedForm = screen.getByRole<HTMLFormElement>("form", { name: forms.unscoped["aria-label"] });

      // The scoped forms have unique `names`
      expect(primaryForm).toHaveAttribute("name");
      expect(secondaryForm).toHaveAttribute("name");
      expect(primaryForm).not.toHaveAttribute("name", secondaryForm.name);

      // The unscoped form has no `name`
      expect(unscopedForm).not.toHaveAttribute("name");

      return { primaryForm, secondaryForm, unscopedForm };
    }

    // ADDITIONAL general assertions that the LOCAL test constants were set up correctly
    beforeAll(() => {
      /* eslint-disable jest/no-standalone-expect */
      // Test Options for select/multiselect/radio buttons
      expect(testOptions.length).toBeGreaterThan(2); // Correct values count
      expect(testOptions).toHaveLength(new Set(testOptions).size); // Unique values
      expect(testOptions.every((t) => typeof t === "string")).toBe(true); // Values are proper strings

      // Form Names
      const formNames = Object.values(forms).map((f) => ("name" in f ? f.name : undefined));
      expect(formNames.length).toBeGreaterThan(2); // Correct form `name`s count
      expect(formNames).toHaveLength(new Set(formNames).size); // Unique form `name`s
      expect(formNames.filter((name) => !name)).toHaveLength(1); // Only 1 `form` is unscoped (unnamed)

      // Form FIELD Names
      const fieldNames = Object.values(fields).map(({ name }) => name);
      expect(fieldNames).toHaveLength(new Set(fieldNames).size); // Unique field `name`s
      expect(fieldNames.filter((name: string) => !name)).toHaveLength(0); // No fields are unscoped (unnamed)
      /* eslint-enable jest/no-standalone-expect */
    });

    // Given our heavy reliance on `localStorage` for these tests, we need to reset `localStorage` between each test
    beforeEach(() => localStorage.clear());

    describe("Event-Driven Data Storage", () => {
      // Note: Data is scoped by the `name`s of the related `form` and `field`
      it("Saves scoped form data to `localStorage` when a `form`'s field emits the specified event", async () => {
        /* -------------------- Setup -------------------- */
        const formStorageObserver = new FormStorageObserver(types[0]);

        const values = {
          primary: { input: "text", textarea: "YES", checkbox: true, radio: "2", select: "1", multiselect: ["1", "2"] },
          secondary: { input: "NO", textarea: "Sp\nlit", checkbox: false, radio: "1", select: "2", multiselect: ["1"] },
        } satisfies Record<"primary" | "secondary", TestFormData>;

        // Assert uniqueness _between_ the different sets of values and _within_ the value sets themselves
        Object.values(values.primary).forEach((v, i, a) => a.slice(i + 1).forEach((V) => expect(v).not.toEqual(V)));
        Object.values(values.secondary).forEach((v, i, a) => a.slice(i + 1).forEach((V) => expect(v).not.toEqual(V)));
        Object.entries(values.primary).forEach(([k, v]) => {
          expect(v).not.toEqual(values.secondary[k as keyof TestFormData]);
        });

        // Assert differentiation from default values as well
        Object.entries(values.primary).forEach(([k, v]) => {
          expect(v).not.toEqual(fields[k as keyof TestFormData].default);
        });
        Object.entries(values.secondary).forEach(([k, v]) => {
          /*
           * Because we prioritize differentiation between the `primary` and `secondary` field values, we end up with a
           * `checkbox` whose "checked status" matches the default "checked status". This is our only exception case.
           */
          if (k === "checkbox") return;
          expect(v).not.toEqual(fields[k as keyof TestFormData].default);
        });

        // Render Forms
        const { primaryForm, secondaryForm } = renderForms();
        formStorageObserver.observe(primaryForm);
        formStorageObserver.observe(secondaryForm);

        /* -------------------- Test Primary Scoped Form -------------------- */
        const inputP = within(primaryForm).getByRole("textbox", { name: fields.input.name });
        await userEvent.type(inputP, `${values.primary.input}{Tab}`);
        expect(localStorage.getItem(getFieldKey(primaryForm.name, fields.input.name))).toBe(
          JSON.stringify(values.primary.input)
        );

        const textareaP = within(primaryForm).getByRole("textbox", { name: fields.textarea.name });
        await userEvent.type(textareaP, `${values.primary.textarea}{Tab}`);
        expect(localStorage.getItem(getFieldKey(primaryForm.name, fields.textarea.name))).toBe(
          JSON.stringify(values.primary.textarea)
        );

        const checkboxP = within(primaryForm).getByRole("checkbox");
        await userEvent.click(checkboxP);
        expect(localStorage.getItem(getFieldKey(primaryForm.name, fields.checkbox.name))).toBe(
          JSON.stringify(values.primary.checkbox)
        );

        const radioP = within(primaryForm).getByRole("radio", {
          name: `${fields.radio.name}-${values.primary.radio}`,
        });
        await userEvent.click(radioP);
        expect(localStorage.getItem(getFieldKey(primaryForm.name, fields.radio.name))).toBe(
          JSON.stringify(values.primary.radio)
        );

        const selectP = within(primaryForm).getByRole("combobox");
        await userEvent.selectOptions(selectP, values.primary.select);
        expect(localStorage.getItem(getFieldKey(primaryForm.name, fields.select.name))).toBe(
          JSON.stringify(values.primary.select)
        );

        const multiselectP = within(primaryForm).getByRole<HTMLSelectElement>("listbox");
        const optionsP = Array.from(multiselectP.options).map((o) => o.value);
        const unselectedOptionsP = optionsP.filter((o) => !(values.primary.multiselect as string[]).includes(o));

        await userEvent.deselectOptions(multiselectP, unselectedOptionsP);
        await userEvent.selectOptions(multiselectP, values.primary.multiselect);
        expect(localStorage.getItem(getFieldKey(primaryForm.name, fields.multiselect.name))).toBe(
          JSON.stringify(values.primary.multiselect)
        );

        /* -------------------- Test Secondary Scoped Form + Storage Data Comparisons -------------------- */
        const inputS = within(secondaryForm).getByRole("textbox", { name: fields.input.name });
        await userEvent.type(inputS, `${values.secondary.input}{Tab}`);
        expect(localStorage.getItem(getFieldKey(secondaryForm.name, fields.input.name))).toBe(
          JSON.stringify(values.secondary.input)
        );
        expect(localStorage.getItem(getFieldKey(secondaryForm.name, fields.input.name))).not.toBe(
          localStorage.getItem(getFieldKey(primaryForm.name, fields.input.name))
        );

        const textareaS = within(secondaryForm).getByRole("textbox", { name: fields.textarea.name });
        await userEvent.type(textareaS, `${values.secondary.textarea}{Tab}`);
        expect(localStorage.getItem(getFieldKey(secondaryForm.name, fields.textarea.name))).toBe(
          JSON.stringify(values.secondary.textarea)
        );
        expect(localStorage.getItem(getFieldKey(secondaryForm.name, fields.textarea.name))).not.toBe(
          localStorage.getItem(getFieldKey(primaryForm.name, fields.textarea.name))
        );

        const checkboxS = within(secondaryForm).getByRole("checkbox");
        await userEvent.dblClick(checkboxS);
        expect(localStorage.getItem(getFieldKey(secondaryForm.name, fields.checkbox.name))).toBe(
          JSON.stringify(values.secondary.checkbox)
        );
        expect(localStorage.getItem(getFieldKey(secondaryForm.name, fields.checkbox.name))).not.toBe(
          localStorage.getItem(getFieldKey(primaryForm.name, fields.checkbox.name))
        );

        const radioS = within(secondaryForm).getByRole("radio", {
          name: `${fields.radio.name}-${values.secondary.radio}`,
        });
        await userEvent.click(radioS);
        expect(localStorage.getItem(getFieldKey(secondaryForm.name, fields.radio.name))).toBe(
          JSON.stringify(values.secondary.radio)
        );
        expect(localStorage.getItem(getFieldKey(secondaryForm.name, fields.radio.name))).not.toBe(
          localStorage.getItem(getFieldKey(primaryForm.name, fields.radio.name))
        );

        const selectS = within(secondaryForm).getByRole("combobox");
        await userEvent.selectOptions(selectS, values.secondary.select);
        expect(localStorage.getItem(getFieldKey(secondaryForm.name, fields.select.name))).toBe(
          JSON.stringify(values.secondary.select)
        );
        expect(localStorage.getItem(getFieldKey(secondaryForm.name, fields.select.name))).not.toBe(
          localStorage.getItem(getFieldKey(primaryForm.name, fields.select.name))
        );

        const multiselectS = within(secondaryForm).getByRole<HTMLSelectElement>("listbox");
        const optionsS = Array.from(multiselectS.options).map((o) => o.value);
        const unselectedOptionsS = optionsS.filter((o) => !(values.secondary.multiselect as string[]).includes(o));

        await userEvent.deselectOptions(multiselectS, unselectedOptionsS);
        await userEvent.selectOptions(multiselectS, values.secondary.multiselect);
        expect(localStorage.getItem(getFieldKey(secondaryForm.name, fields.multiselect.name))).toBe(
          JSON.stringify(values.secondary.multiselect)
        );
        expect(localStorage.getItem(getFieldKey(secondaryForm.name, fields.multiselect.name))).not.toBe(
          localStorage.getItem(getFieldKey(primaryForm.name, fields.multiselect.name))
        );

        // Doubly verify that we have distinct `localStorage` keys for each scoped form field
        expect(localStorage).toHaveLength(
          Object.values(values.primary).length + Object.values(values.secondary).length
        );
      });

      it("Saves form data for unscoped (unnamed) `form`s to the 'Global Scope'", async () => {
        /* -------------------- Setup -------------------- */
        // Note: This key is intentionally created by hand this time
        const unscopedKey = `form:global-scope:${fields.input.name}` as const;
        const values = { input1: "Kono Powa!", input2: "BAKANA!!!" } as const;
        const labels = { input1: "1st Input", input2: "2nd Input" } as const;
        const formStorageObserver = new FormStorageObserver(types[0]);

        expect(values.input1).not.toBe(values.input2);
        expect(unscopedKey).toBe(getFieldKey("", fields.input.name));

        render(
          <>
            <form aria-label="First Test Form">
              <input name={fields.input.name} type="text" aria-label={labels.input1} />
            </form>

            <form aria-label="Second Test Form">
              <input name={fields.input.name} type="text" aria-label={labels.input2} />
            </form>
          </>
        );

        screen.getAllByRole<HTMLFormElement>("form").forEach((form) => formStorageObserver.observe(form));
        const input1 = screen.getByRole<HTMLInputElement>("textbox", { name: labels.input1 });
        const input2 = screen.getByRole<HTMLInputElement>("textbox", { name: labels.input2 });
        expect(input1.form).not.toBe(input2.form);

        /* -------------------- Tests -------------------- */
        // Value gets written to the "Global Scope"
        await userEvent.type(input1, `${values.input1}{Tab}`);
        expect(localStorage.key(0)).toBe(unscopedKey);
        expect(localStorage.getItem(unscopedKey)).toBe(JSON.stringify(values.input1));

        // Value gets overwritten because both forms use the "Global Scope"
        await userEvent.type(input2, `${values.input2}{Tab}`);
        expect(localStorage.getItem(unscopedKey)).not.toBe(JSON.stringify(values.input1));
        expect(localStorage.getItem(unscopedKey)).toBe(JSON.stringify(values.input2));
      });

      it("Saves scoped form data to `localStorage` when a `form`'s field emits ANY of the listed events", async () => {
        /* -------------------- Setup -------------------- */
        const formStorageObserver = new FormStorageObserver(types);
        const userInputValue = "Test Value";
        expect(userInputValue).not.toBe(fields.input.default);

        const { primaryForm } = renderForms();
        formStorageObserver.observe(primaryForm);
        const scopedKey = getFieldKey(primaryForm.name, fields.input.name);

        /* -------------------- Tests -------------------- */
        const input = within(primaryForm).getByRole("textbox", { name: fields.input.name });

        // First Event Type (`focusin`)
        await userEvent.click(input);
        expect(localStorage.getItem(scopedKey)).toBe(JSON.stringify(fields.input.default));

        // Second Event Type (`change`)
        await userEvent.keyboard(`${userInputValue}{Tab}`);
        expect(localStorage.getItem(scopedKey)).toBe(JSON.stringify(userInputValue));
      });

      it("Does not save data for fields that don't have a `name`", async () => {
        /* -------------------- Setup -------------------- */
        const formStorageObserver = new FormStorageObserver(types[0]);
        const unscopedKey = getFieldKey("", fields.input.name);
        const values = { input1: "I am visible", input2: "You will look for Me, but you will not find Me" } as const;
        expect(values.input1).not.toBe(values.input2);

        render(
          <form aria-label="Test Form">
            <input name={fields.input.name} type="text" />
            <input id="this-does-not-matter" type="text" />
          </form>
        );

        const form = screen.getByRole<HTMLFormElement>("form");
        const inputs = screen.getAllByRole<HTMLInputElement>("textbox");
        formStorageObserver.observe(screen.getByRole<HTMLFormElement>("form"));

        expect(inputs).toHaveLength(2);
        expect(inputs).toHaveLength(form.elements.length);
        expect(inputs.some((i) => !i.name)).toBe(true);

        /* -------------------- Tests -------------------- */
        for (let i = 0; i < inputs.length; i++) {
          const property = `input${i + 1}` as keyof typeof values;
          await userEvent.type(inputs[i], `${values[property]}{Tab}`);
        }

        // ONLY the input with a `name` had its data stored in `localStorage`
        expect(localStorage.getItem(unscopedKey)).toBe(JSON.stringify(values.input1));
        expect(localStorage.length).toBeLessThan(inputs.length);
      });

      it("Does not save data that belongs to restricted input fields", () => {
        const formStorageObserver = new FormStorageObserver(types[0]);
        const event = new Event(types[0], { bubbles: true });
        const values = { text: "text", password: "password", hidden: "hidden", file: "" } as const;
        Object.values(values).forEach((v, i, arr) => arr.slice(i + 1).forEach((V) => expect(v).not.toEqual(V)));

        render(
          <form name="test-form" aria-label="Test Form">
            <label htmlFor="text">Text</label>
            <input id="text" name="text" type="text" defaultValue={values.text} />

            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" defaultValue={values.password} />

            <div id="hidden-label">Hidden</div>
            <input name="hidden" type="hidden" defaultValue={values.hidden} aria-labelledby="hidden-label" />

            <label htmlFor="file">File</label>
            <input id="file" name="file" type="file" defaultValue={values.file} />
          </form>
        );

        const form = screen.getByRole<HTMLFormElement>("form");
        formStorageObserver.observe(form);

        const passwordField = screen.getByLabelText(/password/i, { selector: "input[name][value][type='password']" });
        passwordField.dispatchEvent(event);
        expect(localStorage).toHaveLength(0);

        const hiddenField = screen.getByLabelText(/hidden/i, { selector: "input[name][value][type='hidden']" });
        hiddenField.dispatchEvent(event);
        expect(localStorage).toHaveLength(0);

        const fileField = screen.getByLabelText(/file/i, { selector: "input[name][value][type='file']" });
        fileField.dispatchEvent(event);
        expect(localStorage).toHaveLength(0);

        // Data is still saved for valid input types
        const textField = screen.getByLabelText<HTMLInputElement>(/text/i, {
          selector: "input[name][value][type='text']",
        });

        textField.dispatchEvent(event);
        expect(localStorage).toHaveLength(1);
        expect(localStorage.getItem(getFieldKey(form.name, textField.name))).toBe(JSON.stringify(textField.value));
      });

      it("Does not save data related to `fieldset`s, `output`s, or `object`s", () => {
        const formStorageObserver = new FormStorageObserver(types[0]);
        const event = new Event(types[0], { bubbles: true });
        const values = { button: "button", fieldset: "fieldset", output: "output", object: "object" } as const;
        Object.values(values).forEach((v, i, arr) => arr.slice(i + 1).forEach((V) => expect(v).not.toEqual(V)));

        render(
          <form name="test-form" aria-label="Test Form">
            <label htmlFor="button">Button</label>
            <button id="button" name="button" type="button" value={values.button}>
              Button Display
            </button>

            <label htmlFor="output">Output</label>
            <output id="output" name="output">
              {values.output}
            </output>

            <div id="fieldset-label">Fieldset</div>
            <fieldset name="fieldset" aria-labelledby="fieldset-label" />

            <div id="object-label">Object</div>
            <object name="object" aria-labelledby="object-label" />
          </form>
        );

        const form = screen.getByRole<HTMLFormElement>("form");
        formStorageObserver.observe(form);

        const output = screen.getByLabelText(/output/i, { selector: "output[name]" });
        expect(output).toHaveValue(values.output);
        output.dispatchEvent(event);
        expect(localStorage).toHaveLength(0);

        // Force a `value` on the `fieldset` for testing purposes, even though this isn't legal
        const fieldset = screen.getByLabelText(/fieldset/i, { selector: "fieldset[name]" });
        (fieldset as unknown as { value: string }).value = values.fieldset;
        expect(fieldset).toHaveValue(values.fieldset);

        fieldset.dispatchEvent(event);
        expect(localStorage).toHaveLength(0);

        // Force a `value` on the `object` for testing purposes, even though this isn't legal
        const object = screen.getByLabelText(/object/i, { selector: "object[name]" });
        (object as unknown as { value: string }).value = values.object;
        expect(object).toHaveValue(values.object);

        object.dispatchEvent(event);
        expect(localStorage).toHaveLength(0);

        // Data is still saved for semantic `button` elements
        const button = screen.getByLabelText<HTMLButtonElement>(/button/i, { selector: "button[name]" });
        button.dispatchEvent(event);
        expect(localStorage).toHaveLength(1);
        expect(localStorage.getItem(getFieldKey(form.name, button.name))).toBe(JSON.stringify(button.value));
      });

      it("Stops saving a `form`'s data to `localStorage` when said `form` is unobserved", async () => {
        /* -------------------- Setup -------------------- */
        const formStorageObserver = new FormStorageObserver(types[0], { automate: "neither" });
        const firstTestValue = "Korega ... Test ... Da";
        const secondTestValue = "NANIIIIIIIIII";
        expect(firstTestValue).not.toBe(fields.input.default);
        expect(secondTestValue).not.toBe(fields.input.default);

        const { primaryForm } = renderForms();
        formStorageObserver.observe(primaryForm);
        const scopedKey = getFieldKey(primaryForm.name, fields.input.name);

        /* -------------------- Tests -------------------- */
        // Storage successfully updates during observation
        const input = within(primaryForm).getByRole("textbox", { name: fields.input.name });
        await userEvent.type(input, `${firstTestValue}{Tab}`);
        expect(localStorage.getItem(scopedKey)).toBe(JSON.stringify(firstTestValue));

        // Storage DOES NOT get updated when the `form` is NO LONGER being observed
        formStorageObserver.unobserve(primaryForm);
        await userEvent.type(input, `${secondTestValue}{Tab}`);
        expect(localStorage.getItem(scopedKey)).not.toBe(JSON.stringify(secondTestValue));
        expect(localStorage.getItem(scopedKey)).toBe(JSON.stringify(firstTestValue));
      });
    });

    describe("load (Static Method)", () => {
      /** Randomly generates a value for one of the form fields supported by {@link TestFormData} */
      function generateValueForField(fieldName: keyof TestFormData) {
        if (fieldName === "multiselect") return faker.helpers.arrayElements(testOptions, 2).sort();
        if (fieldName === "radio" || fieldName === "select") return faker.helpers.arrayElement(testOptions);
        if (fieldName === "checkbox") return faker.datatype.boolean();
        return faker.lorem.words(10);
      }

      it("Only operates on `form`s", () => {
        const div = document.createElement("div") as HTMLElement;
        jest.spyOn(Assertions, "assertElementIsForm");

        // Element-only Overload (Failure)
        expect(() => FormStorageObserver.load(div as HTMLFormElement)).toThrow();
        expect(Assertions.assertElementIsForm).toHaveBeenNthCalledWith(1, div);

        // Element + `FieldName` Overload (Failure)
        expect(() => FormStorageObserver.load(div as HTMLFormElement, fields.input.name)).toThrow();
        expect(Assertions.assertElementIsForm).toHaveBeenNthCalledWith(2, div);
        expect(Assertions.assertElementIsForm).toHaveBeenCalledTimes(2);

        // Success on `HTMLFormElement`s
        const form = document.createElement("form");
        expect(() => FormStorageObserver.load(form)).not.toThrow();
        expect(() => FormStorageObserver.load(form, fields.input.name)).not.toThrow();
      });

      // Note: This test is for the `HTMLFormElement`-only Overload
      it("Loads `form` data from `localStorage` into a `form`'s fields based on scope (i.e., `name`s)", () => {
        /** A _non-redundant_ list of the names of the form fields rendered by {@link renderForms}. */
        const fieldNames = Object.values(fields).map(({ name }) => name);

        Object.values(renderForms()).forEach((form) => {
          /* -------------------- Setup -------------------- */
          // Store randomly generated values for the `form`'s fields into `localStorage`
          fieldNames.forEach((fieldName) => {
            const value = generateValueForField(fieldName);
            localStorage.setItem(getFieldKey(form.name, fieldName), JSON.stringify(value));
          });

          // Load the `localStorage` values into the `form`
          FormStorageObserver.load(form);

          /* -------------------- Tests -------------------- */
          /* eslint-disable jest/no-conditional-expect */
          // Verify that everything was loaded into the `form`'s fields correctly
          (Array.from(form.elements) as FormField[]).forEach((field) => {
            const storedValue = JSON.parse(localStorage.getItem(getFieldKey(form.name, field.name)) as string);

            // Multi-Select
            if (field instanceof HTMLSelectElement && field.multiple) {
              return expect(Array.from(field.selectedOptions).map((o) => o.value)).toStrictEqual(storedValue);
            }

            // Checkboxes and Radio Buttons
            if (field instanceof HTMLInputElement) {
              if (field.type === "checkbox") return expect(field.checked).toBe(storedValue);
              if (field.type === "radio") return expect(field.checked).toBe(field.value === storedValue);
            }

            // All other inputs
            expect(field).toHaveValue(storedValue);
          });
          /* eslint-enable jest/no-conditional-expect */
        });
      });

      // Note: This test is for the `HTMLFormElement` + `FieldName` Overload
      it("Loads `form` data from `localStorage` into the provided `form` field based on scope (i.e., `name`s)", () => {
        /** A _non-redundant_ list of the names of the form fields rendered by {@link renderForms}. */
        const fieldNames = Object.values(fields).map(({ name }) => name);

        Object.values(renderForms()).forEach((form) => {
          fieldNames.forEach((fieldName) => {
            /* -------------------- Setup -------------------- */
            // Store a randomly generated value for the specified `form` field into `localStorage`
            const value = generateValueForField(fieldName);
            localStorage.setItem(getFieldKey(form.name, fieldName), JSON.stringify(value));

            // Load the `localStorage` value into the specified `form` field
            FormStorageObserver.load(form, fieldName);

            /* -------------------- Tests -------------------- */
            /* eslint-disable jest/no-conditional-expect */
            // Verify that the stored data was loaded into the specified `form` field correctly
            const field = form.elements.namedItem(fieldName);
            const storedValue = JSON.parse(localStorage.getItem(getFieldKey(form.name, fieldName)) as string);

            // Multi-Select
            if (field instanceof HTMLSelectElement && field.multiple) {
              return expect(Array.from(field.selectedOptions).map((o) => o.value)).toStrictEqual(storedValue);
            }

            // Radio Buttons and Checkboxes
            if (field instanceof RadioNodeList) return expect(field.value).toBe(storedValue);
            if (field instanceof HTMLInputElement && field.type === "checkbox") {
              return expect(field.checked).toBe(storedValue);
            }

            // All other inputs
            expect(field).toHaveValue(storedValue);
            /* eslint-enable jest/no-conditional-expect */
          });
        });
      });

      it("Skips fields without `name`s when loading data from `localStorage`", async () => {
        const values = { good: "This should be loadable", bad: "You can't load me, buddy" } as const;

        render(
          <form aria-label="Test Form">
            <label htmlFor="good">Good</label>
            <input id="good" name="good" type="text" />

            <label htmlFor="bad">Bad</label>
            <input id="bad" type="text" />
          </form>
        );

        const form = screen.getByRole<HTMLFormElement>("form");
        const input = screen.getByLabelText<HTMLInputElement>(/good/i, { selector: "input[name]" });
        const unnamedInput = screen.getByLabelText<HTMLInputElement>(/bad/i, { selector: "input:not([name])" });

        // Store values in `localStorage` based on the fields' names
        localStorage.setItem(getFieldKey(form.name, input.name), JSON.stringify(values.good));
        localStorage.setItem(getFieldKey(form.name, unnamedInput.name), JSON.stringify(values.bad));

        /* -------------------- `HTMLFormElement`-only Overload -------------------- */
        form.reset();
        Array.from(form.elements).forEach((f) => expect(f).not.toHaveValue());

        // Load the `localStorage` data into the `form`'s fields
        expect(() => FormStorageObserver.load(form)).not.toThrow();
        expect(input).toHaveValue(values.good);
        expect(unnamedInput).not.toHaveValue();

        /* -------------------- `HTMLFormElement` + `FieldName` Overload -------------------- */
        form.reset();
        Array.from(form.elements).forEach((f) => expect(f).not.toHaveValue());

        // Attempt to load the `localStorage` data into the `form`'s individual fields
        FormStorageObserver.load(form, input.name);
        expect(input).toHaveValue(values.good);

        expect(() => FormStorageObserver.load(form, unnamedInput.name)).not.toThrow();
        expect(() => FormStorageObserver.load(form, "")).not.toThrow();
        expect(unnamedInput).not.toHaveValue();
      });

      it("Does not attempt to load data for fields that do not exist in the `form`", () => {
        const absentFieldName = faker.lorem.word();
        const absentFieldValue = faker.lorem.words();

        render(
          <form aria-label="Test Form">
            <input name="exists" type="text" />
          </form>
        );

        const form = screen.getByRole<HTMLFormElement>("form");
        Array.from(form.elements).forEach((f) => expect(f).toHaveAttribute("name"));
        Array.from(form.elements).forEach((f) => expect(f).not.toHaveAttribute("name", absentFieldName));
        localStorage.setItem(getFieldKey(form.name, absentFieldName), absentFieldValue);

        /* -------------------- `HTMLFormElement`-only Overload -------------------- */
        expect(() => FormStorageObserver.load(form)).not.toThrow();
        Array.from(form.elements).forEach((f) => expect(f).not.toHaveValue());

        /* -------------------- `HTMLFormElement` + `FieldName` Overload -------------------- */
        expect(() => FormStorageObserver.load(form, absentFieldName)).not.toThrow();
        Array.from(form.elements).forEach((f) => expect(f).not.toHaveValue());
      });

      it("Skips properly scoped (named) `form` fields that don't have any data stored in `localStorage`", () => {
        const values = { filled: "My input field will be loaded in this test! :D" };

        render(
          <form aria-label="Test Form">
            <label htmlFor="filled">Filled</label>
            <input id="filled" name="filled" type="text" />

            <label htmlFor="empty">Empty</label>
            <input id="empty" name="empty" type="text" />
          </form>
        );

        const form = screen.getByRole<HTMLFormElement>("form");
        const input = screen.getByLabelText<HTMLInputElement>(/filled/i);
        const emptyInput = screen.getByLabelText<HTMLInputElement>(/empty/i);

        // Store a value in `localStorage` for ONLY one field
        localStorage.setItem(getFieldKey(form.name, input.name), JSON.stringify(values.filled));

        /* -------------------- `HTMLFormElement`-only Overload -------------------- */
        form.reset();
        Array.from(form.elements).forEach((f) => expect(f).not.toHaveValue());

        // Load the `localStorage` data into the `form`'s fields
        expect(() => FormStorageObserver.load(form)).not.toThrow();
        expect(input).toHaveValue(values.filled);
        expect(emptyInput).not.toHaveValue();

        /* -------------------- `HTMLFormElement` + `FieldName` Overload -------------------- */
        form.reset();
        Array.from(form.elements).forEach((f) => expect(f).not.toHaveValue());

        // Attempt to load the `localStorage` data into the `form`'s individual fields
        FormStorageObserver.load(form, input.name);
        expect(input).toHaveValue(values.filled);

        expect(() => FormStorageObserver.load(form, emptyInput.name)).not.toThrow();
        expect(emptyInput).not.toHaveValue();
      });

      it("Refuses to load data belonging to restricted input fields", () => {
        const values = { text: "text", password: "password", hidden: "hidden", file: "file" } as const;
        Object.values(values).forEach((v, i, arr) => arr.slice(i + 1).forEach((V) => expect(v).not.toEqual(V)));

        render(
          <form name="test-form" aria-label="Test Form">
            <label htmlFor="text">Text</label>
            <input id="text" name="text" type="text" />

            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" />

            <div id="hidden-label">Hidden</div>
            <input name="hidden" type="hidden" aria-labelledby="hidden-label" />

            <label htmlFor="file">File</label>
            <input id="file" name="file" type="file" />
          </form>
        );

        const form = screen.getByRole<HTMLFormElement>("form");
        Array.from(form.elements).forEach((f) => expect(f.getAttribute("name")).toBeTruthy());

        // Store values in `localStorage` based on the fields' names
        const passwordField = screen.getByLabelText<HTMLInputElement>(/password/i, {
          selector: "input[type='password']",
        });
        localStorage.setItem(getFieldKey(form.name, passwordField.name), JSON.stringify(values.password));

        const hiddenField = screen.getByLabelText<HTMLInputElement>(/hidden/i, { selector: "input[type='hidden']" });
        localStorage.setItem(getFieldKey(form.name, hiddenField.name), JSON.stringify(values.hidden));

        const fileField = screen.getByLabelText<HTMLInputElement>(/file/i, { selector: "input[type='file']" });
        localStorage.setItem(getFieldKey(form.name, fileField.name), JSON.stringify(values.file));

        const textField = screen.getByLabelText<HTMLInputElement>(/text/i, { selector: "input[type='text']" });
        localStorage.setItem(getFieldKey(form.name, textField.name), JSON.stringify(values.text));

        // Make sure we truly loaded data for each individual field
        expect(localStorage).toHaveLength(form.elements.length);

        /* -------------------- `HTMLFormElement`-only Overload -------------------- */
        form.reset();
        Array.from(form.elements).forEach((f) => expect(f).not.toHaveValue());

        // Load the `localStorage` data into the `form`'s fields
        FormStorageObserver.load(form);
        expect(passwordField).not.toHaveValue();
        expect(hiddenField).not.toHaveValue();
        expect(fileField).not.toHaveValue();

        // Data is still loaded for valid input types
        expect(textField).toHaveValue(values.text);

        /* -------------------- `HTMLFormElement` + `FieldName` Overload -------------------- */
        form.reset();
        Array.from(form.elements).forEach((f) => expect(f).not.toHaveValue());

        // Attempt to load the `localStorage` data into the `form`'s individual fields
        FormStorageObserver.load(form, passwordField.name);
        expect(passwordField).not.toHaveValue();

        FormStorageObserver.load(form, hiddenField.name);
        expect(hiddenField).not.toHaveValue();

        FormStorageObserver.load(form, fileField.name);
        expect(fileField).not.toHaveValue();

        // Data is still loaded for valid input types
        FormStorageObserver.load(form, textField.name);
        expect(textField).toHaveValue(values.text);
      });

      it("Refuses to load data related to `fieldset`s, `output`s, or `object`s", () => {
        const values = { button: "button", fieldset: "fieldset", output: "output", object: "object" } as const;
        Object.values(values).forEach((v, i, arr) => arr.slice(i + 1).forEach((V) => expect(v).not.toEqual(V)));

        render(
          <form name="test-form" aria-label="Test Form">
            <label htmlFor="button">Button</label>
            <button id="button" name="button" type="button">
              Button Display
            </button>

            <label htmlFor="output">Output</label>
            <output id="output" name="output" />

            <div id="fieldset-label">Fieldset</div>
            <fieldset name="fieldset" aria-labelledby="fieldset-label" />

            <div id="object-label">Object</div>
            <object name="object" aria-labelledby="object-label" />
          </form>
        );

        const form = screen.getByRole<HTMLFormElement>("form");
        Array.from(form.elements).forEach((f) => expect(f.getAttribute("name")).toBeTruthy());

        // Store values in `localStorage` based on the fields' names
        const output = screen.getByLabelText<HTMLOutputElement>(/output/i, { selector: "output" });
        localStorage.setItem(getFieldKey(form.name, output.name), JSON.stringify(values.output));

        const fieldset = screen.getByLabelText<HTMLFieldSetElement>(/fieldset/i, { selector: "fieldset" });
        localStorage.setItem(getFieldKey(form.name, fieldset.name), JSON.stringify(values.fieldset));

        const object = screen.getByLabelText<HTMLObjectElement>(/object/i, { selector: "object" });
        localStorage.setItem(getFieldKey(form.name, object.name), JSON.stringify(values.object));

        const button = screen.getByLabelText<HTMLButtonElement>(/button/i, { selector: "button" });
        localStorage.setItem(getFieldKey(form.name, button.name), JSON.stringify(values.button));

        // Make sure we truly loaded data for each individual field
        expect(localStorage).toHaveLength(form.elements.length);

        /* -------------------- `HTMLFormElement`-only Overload -------------------- */
        form.reset();
        button.removeAttribute("value");
        Array.from(form.elements).forEach((f) => expect(f).not.toHaveValue());

        // Load the `localStorage` data into the `form`'s fields
        FormStorageObserver.load(form);
        expect(output).not.toHaveValue();
        expect(fieldset).not.toHaveValue();
        expect(object).not.toHaveValue();

        // Data is still loaded for semantic `button` elements
        expect(button).toHaveValue(values.button);

        /* -------------------- `HTMLFormElement` + `FieldName` Overload -------------------- */
        form.reset();
        button.removeAttribute("value");
        Array.from(form.elements).forEach((f) => expect(f).not.toHaveValue());

        // Attempt to load the `localStorage` data into the `form`'s individual fields
        FormStorageObserver.load(form, output.name);
        expect(output).not.toHaveValue();

        FormStorageObserver.load(form, fieldset.name);
        expect(fieldset).not.toHaveValue();

        FormStorageObserver.load(form, object.name);
        expect(object).not.toHaveValue();

        // Data is still loaded for semantic `button` elements
        FormStorageObserver.load(form, button.name);
        expect(button).toHaveValue(values.button);
      });

      it("Throws an error with a hint when it finds a field with a matching `id` instead of a matching `name`", () => {
        render(
          <form aria-label="Test Form">
            <label htmlFor="correct">Correct</label>
            <input id="correct" name="correct" type="text" />

            <label htmlFor="missing">Missing</label>
            <input id="missing" type="text" />

            <label htmlFor="mismatched">Mismatched</label>
            <input id="mismatched" name="wrong-name" type="text" />
          </form>
        );

        const form = screen.getByRole<HTMLFormElement>("form");
        const correct = screen.getByLabelText<HTMLInputElement>(/correct/i);
        const missing = screen.getByLabelText<HTMLInputElement>(/missing/i, { selector: "[id]:not([name])" });
        const mismatched = screen.getByLabelText<HTMLInputElement>(/mismatched/i, { selector: "[id][name]" });

        /* -------------------- `HTMLFormElement`-only Overload -------------------- */
        /*
         * Note: CURRENTLY, it is impossible for the `HTMLFormElement`-only overload to error out here because it
         * automatically looks through the fields' `name`s; it never looks at a field's `id` for data loading.
         */
        expect(() => FormStorageObserver.load(form)).not.toThrow();

        /* -------------------- `HTMLFormElement` + `FieldName` Overload -------------------- */
        expect(() => FormStorageObserver.load(form, correct.name)).not.toThrow();
        expect(() => FormStorageObserver.load(form, missing.id)).toThrowErrorMatchingInlineSnapshot(
          `"Expected to find a field with name "missing", but instead found a field with name "". Did you accidentally provide your field's \`id\` instead of your field's \`name\`?"`
        );
        expect(() => FormStorageObserver.load(form, mismatched.id)).toThrowErrorMatchingInlineSnapshot(
          `"Expected to find a field with name "mismatched", but instead found a field with name "wrong-name". Did you accidentally provide your field's \`id\` instead of your field's \`name\`?"`
        );
      });

      describe("Resolved Bugs", () => {
        /*
         * This resolves a bug where some default values for a multiselect element would remain selected
         * after data was loaded from `localStorage` even if said default selected values were not present in the
         * loaded data. This problem only occurred when the last loaded `option` preceded a later `option` that
         * was selected by default. The following test proves that this bug was fixed.
         */
        it("Deselects all values that weren't included in a multiselect's loaded data (Multiselect Only)", async () => {
          const innerValues = testOptions.slice(1, -1);
          const outerValues = testOptions.filter((o) => !innerValues.includes(o));

          render(
            <form aria-label="Test Form">
              <label htmlFor="multiselect">Multiselect</label>
              <select id="multiselect" name="multiselect" multiple defaultValue={outerValues}>
                {testOptions.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </form>
          );

          const form = screen.getByRole<HTMLFormElement>("form");
          const multiselect = screen.getByLabelText<HTMLSelectElement>(/multiselect/i, { selector: "select" });

          // Assert that we have a multiselect field that ONLY has its OUTER options selected
          expect(multiselect).toHaveAttribute("multiple");
          Array.from(multiselect.options).forEach((o, i, a) => expect(o.selected).toBe(i === 0 || i === a.length - 1));

          // Store MIDDLE VALUES in `localStorage` for the `multiselect`
          localStorage.setItem(getFieldKey(form.name, multiselect.name), JSON.stringify(innerValues));

          /* -------------------- `HTMLFormElement`-only Overload -------------------- */
          form.reset();
          expect(form).toHaveFormValues({ [multiselect.name]: outerValues });

          // Only the inner values are selected after loading
          FormStorageObserver.load(form);
          expect(form).toHaveFormValues({ [multiselect.name]: innerValues });

          /* -------------------- `HTMLFormElement` + `FieldName` Overload -------------------- */
          form.reset();
          expect(form).toHaveFormValues({ [multiselect.name]: outerValues });

          // Only the inner values are selected after loading
          FormStorageObserver.load(form, multiselect.name);
          expect(form).toHaveFormValues({ [multiselect.name]: innerValues });
        });
      });
    });

    describe("clear (Static Method)", () => {
      it("Only operates on `form`s", () => {
        const div = document.createElement("div") as HTMLElement;
        jest.spyOn(Assertions, "assertElementIsForm");

        // Element-only Overload (Failure)
        expect(() => FormStorageObserver.clear(div as HTMLFormElement)).toThrow();
        expect(Assertions.assertElementIsForm).toHaveBeenNthCalledWith(1, div);

        // Element + `FieldName` Overload (Failure)
        expect(() => FormStorageObserver.clear(div as HTMLFormElement, fields.input.name)).toThrow();
        expect(Assertions.assertElementIsForm).toHaveBeenNthCalledWith(2, div);
        expect(Assertions.assertElementIsForm).toHaveBeenCalledTimes(2);

        // Success on `HTMLFormElement`s
        const form = document.createElement("form");
        expect(() => FormStorageObserver.clear(form)).not.toThrow();
        expect(() => FormStorageObserver.clear(form, fields.input.name)).not.toThrow();
      });

      // Note: This test is for the `HTMLFormElement`-only Overload
      it("Clears all of a `form`'s data from `localStorage` based on scope (i.e., `name`s)", () => {
        /** A _non-redundant_ list of the names of the form fields rendered by {@link renderForms}. */
        const fieldNames = Object.values(fields).map(({ name }) => name);

        Object.values(renderForms()).forEach((form) => {
          /* -------------------- Setup -------------------- */
          // Store a value in `localStorage` for each `form` field. (The value type doesn't matter here.)
          fieldNames.forEach((fieldName) => {
            const value = faker.datatype.string();
            localStorage.setItem(getFieldKey(form.name, fieldName), JSON.stringify(value));
          });

          (Array.from(form.elements) as FormField[]).forEach((field) => {
            expect(localStorage.getItem(getFieldKey(form.name, field.name))).toEqual(expect.any(String));
          });

          /* -------------------- Tests -------------------- */
          // Clear the `localStorage` values for the `form`
          FormStorageObserver.clear(form);

          // Verify that all of the `localStorage` data related to the `form` was properly cleared
          (Array.from(form.elements) as FormField[]).forEach((field) => {
            expect(localStorage.getItem(getFieldKey(form.name, field.name))).toBe(null);
          });
        });
      });

      // Note: This test is for the `HTMLFormElement` + `FieldName` Overload
      it("Clears the specified field's `form` data from `localStorage` based on scope (i.e., `name`s)", () => {
        /** A _non-redundant_ list of the names of the form fields rendered by {@link renderForms}. */
        const fieldNames = Object.values(fields).map(({ name }) => name);

        Object.values(renderForms()).forEach((form) => {
          fieldNames.forEach((fieldName) => {
            /* -------------------- Setup -------------------- */
            // Store a value in `localStorage` for the specified `form` field. (The value type doesn't matter here.)
            const value = faker.datatype.string();
            localStorage.setItem(getFieldKey(form.name, fieldName), JSON.stringify(value));
            expect(localStorage.getItem(getFieldKey(form.name, fieldName))).not.toBe(null);

            /* -------------------- Tests -------------------- */
            // Clear the `localStorage` value for the `form` field
            FormStorageObserver.clear(form, fieldName);

            // Verify that the `localStorage` data related to the specified `form` field was properly cleared
            expect(localStorage.getItem(getFieldKey(form.name, fieldName))).toBe(null);
          });
        });
      });

      // Note: This is enforced for performance and maintainability reasons.
      it("Does not AUTOMATICALLY clear `localStorage` data for fields not belonging to the specified `form`", () => {
        const missingName = "i-am-not-here";
        expect(Object.keys(fields)).not.toContain(missingName);

        Object.values(renderForms()).forEach((form) => {
          // Store a value in `localStorage` for an absent `form` field. (The value type doesn't matter here.)
          localStorage.setItem(getFieldKey(form.name, missingName), JSON.stringify(faker.lorem.word()));

          // Value is NOT automatically removed from `localStorage` when an entire `form`'s data is cleared
          FormStorageObserver.clear(form);
          expect(localStorage.getItem(getFieldKey(form.name, missingName))).not.toBe(null);

          // Value IS successfully removed from `localStorage` when a missing field's data is cleared directly
          FormStorageObserver.clear(form, missingName);
          expect(localStorage.getItem(getFieldKey(form.name, missingName))).toBe(null);
        });
      });
    });
  });
});

/* eslint-disable no-new */
/* eslint-disable no-unreachable */
(function runTypeOnlyTests() {
  /*
   * This early return statement allows our type-only tests to be validated by `ts-jest` WITHOUT us getting
   * false positives for code coverage.
   */
  return;
  const event1 = "beforeinput" satisfies keyof DocumentEventMap; // Correlates to `InputEvent`
  const event2 = "click" satisfies keyof DocumentEventMap; // Correlates to `MouseEvent`

  // Single Type
  new FormStorageObserver(event1);
  new FormStorageObserver(event1, {});
  new FormStorageObserver(event1, { automate: "loading" });
  new FormStorageObserver(event1, { useEventCapturing: true });

  // Multiple Types
  new FormStorageObserver([event1, event2]);
  new FormStorageObserver([event1, event2], {});
  new FormStorageObserver([event1, event2], { automate: undefined });
  new FormStorageObserver([event1, event2], { useEventCapturing: undefined });

  new FormStorageObserver([event1, event2] as const);
  new FormStorageObserver([event1, event2] as const, {});
  new FormStorageObserver([event1, event2] as const, { automate: "deletion" });
  new FormStorageObserver([event1, event2] as const, { useEventCapturing: false });
})();
/* eslint-enable no-unreachable */
/* eslint-enable no-new */
