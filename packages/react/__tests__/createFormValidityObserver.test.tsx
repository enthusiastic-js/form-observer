import { vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import "@testing-library/jest-dom";
import FormValidityObserver from "@form-observer/core/FormValidityObserver.js";
import type { EventType, FormField } from "@form-observer/core/types.d.ts";
import createFormValidityObserver from "../createFormValidityObserver.js";
import type { ReactValidationErrors, ReactFieldProps } from "../createFormValidityObserver.js";

describe("Create Form Validity Observer (Function)", () => {
  const types = Object.freeze(["input", "focusout"] as const) satisfies ReadonlyArray<EventType>;

  // Keep things clean between each test by automatically restoring anything we may have spied on
  beforeEach(vi.restoreAllMocks);

  it("Generates a `FormValidityObserver` (enhanced)", () => {
    expect(createFormValidityObserver(types)).toEqual(expect.any(FormValidityObserver));
  });

  it("Exposes `bound` versions of the `FormValidityObserver`'s methods (excluding `configure`)", () => {
    /* ---------- Setup ---------- */
    // Derive `bound` methods
    type BoundMethod = keyof Omit<FormValidityObserver, "configure">;
    const members = Object.getOwnPropertyNames(FormValidityObserver.prototype);
    const boundMethods = members.filter((m): m is BoundMethod => m !== "constructor" && m !== "configure");

    // Assert that we properly identified the `bound` methods.
    expect(boundMethods).toHaveLength(7); // Note: This number will change if we add more methods (unlikely).
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

  it("DOES NOT expose the `FormValidityObserver`'s ORIGINAL `configure` method", () => {
    /** The name of the {@link FormValidityObserver.configure} method */
    const configure = "configure";
    vi.spyOn(FormValidityObserver.prototype[configure], "bind");

    // Run Assertions
    const observer = createFormValidityObserver(types);
    expect(FormValidityObserver.prototype[configure].bind).toHaveBeenCalledTimes(1);
    expect(FormValidityObserver.prototype[configure].bind).toHaveBeenCalledWith(observer);
    expect(FormValidityObserver.prototype[configure].bind).not.toHaveReturnedWith(observer[configure]);
  });

  describe("Returned Interface", () => {
    describe("autoObserve (Method)", () => {
      it("Automatically sets up the `FormValidityObserver` (onMount) and cleans it up (onUnmount)", async () => {
        /* ---------- Setup ---------- */
        const message = "Only numbers are allowed!";
        vi.spyOn(FormValidityObserver.prototype, "observe");
        vi.spyOn(FormValidityObserver.prototype, "unobserve");
        const { autoObserve, configure } = createFormValidityObserver("input");

        /* ---------- Assertions ---------- */
        const { unmount } = render(
          <form ref={autoObserve()} aria-label="Test Form">
            <input {...configure("textbox", { pattern: { value: "\\d+", message } })} type="textbox" />
          </form>,
        );

        /* ----- After `mount` ----- */
        const form = screen.getByRole<HTMLFormElement>("form", { name: "Test Form" });
        expect(FormValidityObserver.prototype.observe).toHaveBeenCalledWith(form);

        // Try some automated validation
        const input = screen.getByRole<HTMLInputElement>("textbox");
        await userEvent.type(input, "abcde");
        expect(input).toHaveAttribute("aria-invalid", String(true));
        expect(input.validationMessage).toBe(message);

        await userEvent.clear(input);
        expect(input).toHaveAttribute("aria-invalid", String(false));
        expect(input.validationMessage).toBe("");

        await userEvent.type(input, "12345");
        expect(input).toHaveAttribute("aria-invalid", String(false));
        expect(input.validationMessage).toBe("");

        /* ----- After `unount` ----- */
        unmount();
        expect(FormValidityObserver.prototype.unobserve).toHaveBeenCalledWith(form);
      });
    });

    describe("configure (Method)", () => {
      const name = "test-name";

      function mapConstraintsToProps(
        constraints: Omit<ReactValidationErrors<string>, "badinput" | "validate">,
      ): ReactFieldProps {
        const { maxlength, minlength, ...reactProps } = constraints;
        return Object.assign(reactProps, { minLength: minlength, maxLength: maxlength }) as ReactFieldProps;
      }

      type ConstraintKeys = keyof ReactValidationErrors<string>;
      type ConstraintValues = { [K in ConstraintKeys]: Exclude<ReactValidationErrors<string>[K], undefined | null> };

      it("ONLY configures the error messages for the custom validation properties", () => {
        vi.spyOn(FormValidityObserver.prototype, "configure");
        const observer = createFormValidityObserver(types[0]);

        const errorMessages: Pick<ConstraintValues, "badinput" | "validate"> = {
          badinput: (field) => `This ${field.tagName} element isn't looking good` as const,
          validate: () => "Bad Value" as const,
        };

        expect(observer.configure(name, errorMessages)).toStrictEqual({ name });
        expect(FormValidityObserver.prototype.configure).toHaveBeenCalledWith(name, errorMessages);
      });

      it("ONLY configures the props for the HTML attributes when the value-only variant is used", () => {
        vi.spyOn(FormValidityObserver.prototype, "configure");
        const observer = createFormValidityObserver(types[0]);

        const errorMessages: Omit<ConstraintValues, "badinput" | "validate"> = {
          required: true,
          minlength: 10,
          min: 5,
          maxlength: 30,
          max: 15,
          step: 10,
          type: "email",
          pattern: "\\d+",
        };

        const props = mapConstraintsToProps(errorMessages);
        expect(observer.configure(name, errorMessages)).toStrictEqual({ name, ...props });
        expect(FormValidityObserver.prototype.configure).toHaveBeenCalledWith(name, {});
      });

      it("Configures the prop AND the error for the `required` constraint when its value is an error message", () => {
        vi.spyOn(FormValidityObserver.prototype, "configure");
        const observer = createFormValidityObserver(types[0]);

        // Regular Error Message
        const configWithErrorMessage = { required: "This field is bad" };
        expect(observer.configure(name, configWithErrorMessage)).toStrictEqual({ name, required: true });
        expect(FormValidityObserver.prototype.configure).toHaveBeenNthCalledWith(1, name, configWithErrorMessage);

        // Error Function
        const configWithErrorFunc = { required: (field: FormField) => `${field.tagName} is invalid, buddy` };
        expect(observer.configure(name, configWithErrorFunc)).toStrictEqual({ name, required: true });
        expect(FormValidityObserver.prototype.configure).toHaveBeenNthCalledWith(2, name, configWithErrorFunc);
      });

      it("Configures the props AND the error messages for the HTML attributes when the object variant is used", () => {
        vi.spyOn(FormValidityObserver.prototype, "configure");
        const observer = createFormValidityObserver(types[0]);

        const errorMessages: Omit<ConstraintValues, "badinput" | "validate"> = {
          required: { value: true, message: (field: FormField) => `<p>${field.tagName} required</p>`, render: true },
          minlength: { value: 10, message: "This message is too small", render: false },
          min: { value: 10, message: "Your power level is too weak" },
          maxlength: { value: 30, message: (field: FormField) => `${field.tagName} is a little too chatty` },
          max: { value: 15, message: "<strong>WHAT POWER!!!</strong>", render: true },
          step: { value: 10, message: "Your dancing has to be a bit more clever" },
          type: { value: "email", message: "Give me your email plzzzz!" },
          pattern: { value: "\\d+", message: () => "Numbers are your friend", render: false },
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Type narrowing here is excessive here
        const constraints = Object.entries(errorMessages).reduce((p, [k, v]) => ({ [k]: (v as any).value, ...p }), {});
        const props = mapConstraintsToProps(constraints);
        expect(observer.configure(name, errorMessages)).toStrictEqual({ name, ...props });
        expect(FormValidityObserver.prototype.configure).toHaveBeenCalledWith(name, errorMessages);
      });

      it("DOES NOT configure any props OR error messages when `undefined` is used", () => {
        vi.spyOn(FormValidityObserver.prototype, "configure");
        const observer = createFormValidityObserver(types[0]);

        // Undefined Configurations
        const undefinedErrorMessages: ReactValidationErrors<string> = {
          required: undefined,
          minlength: undefined,
          min: undefined,
          maxlength: undefined,
          max: undefined,
          step: undefined,
          type: undefined,
          pattern: undefined,
          badinput: undefined,
          validate: undefined,
        };

        expect(observer.configure(name, undefinedErrorMessages)).toStrictEqual({ name });
        expect(FormValidityObserver.prototype.configure).toHaveBeenCalledWith(name, {});
      });

      it("DOES NOT configure the prop OR the error for the `required` constraint when its value is `false`", () => {
        vi.spyOn(FormValidityObserver.prototype, "configure");
        const observer = createFormValidityObserver(types[0]);

        // `required = false` via Value-Only Variant
        expect(observer.configure(name, { required: false })).toStrictEqual({ name });
        expect(FormValidityObserver.prototype.configure).toHaveBeenNthCalledWith(1, name, {});

        // `required = false` via Object Variant
        expect(observer.configure(name, { required: { value: false, message: "Unseen" } })).toStrictEqual({ name });
        expect(FormValidityObserver.prototype.configure).toHaveBeenNthCalledWith(2, name, {});
      });

      it("Always returns the `name` prop for the field", () => {
        vi.spyOn(FormValidityObserver.prototype, "configure");
        const observer = createFormValidityObserver(types[0]);

        expect(observer.configure(name, {})).toStrictEqual({ name });
        expect(FormValidityObserver.prototype.configure).toHaveBeenCalledWith(name, {});
      });
    });
  });
});
