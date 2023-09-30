import { vi, beforeAll, beforeEach, describe, it, expect } from "vitest";
import { screen } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import type { EventType, ListenerOptions, TypesToListeners } from "../types.d.ts";
import * as Assertions from "../utils/assertions.js";
import FormObserver from "../FormObserver.js";

describe("Form Observer (Class)", () => {
  /* ---------------------------------------- Global Constants ---------------------------------------- */
  const testCases = [
    "Single Type, Single Listener, Single Options Variant",
    "Multiple Types, Single Listener, Single Options Variant",
    "Multilpe Types, Multiple Listeners, Multiple Options Variant",
  ] as const;

  // Form Observer Constants
  const types = ["focusin", "click"] as const satisfies ReadonlyArray<EventType>;
  const listeners = [vi.fn(), vi.fn()] as const satisfies TypesToListeners<typeof types>;
  const options = [true, false] as const satisfies ReadonlyArray<Exclude<ListenerOptions, undefined>>;

  /** Events corresponding to the test event `types`. @see {@link types} */
  const events = { [types[0]]: FocusEvent, [types[1]]: MouseEvent } as const;

  /* ---------------------------------------- Global Helpers ---------------------------------------- */
  /**
   * Used for enforcing that ALL valid test cases are used for ALL tests requiring conditional assertions.
   * This function should be called when an invalid test case is used in a test OR when a valid test case
   * is missing a test implementation within a given test.
   */
  function throwUnsupportedTestCaseError(badTestCase: unknown): void {
    throw new TypeError(`Test Case not supported: ${badTestCase}.`);
  }

  /**
   * Generates a `FormObserver` based on the standardized `testCase` passed to the function.
   * @see {@link testCases}
   * @throws {TypeError} for any invalid test case
   */
  function getFormObserverByTestCase(testCase: (typeof testCases)[number]): FormObserver {
    if (!testCases.includes(testCase)) {
      throw new TypeError("Expected a standardized test case for generating a `Form Observer`.");
    }

    if (testCase === testCases[0]) return new FormObserver(types[0], listeners[0], options[0]);
    if (testCase === testCases[1]) return new FormObserver(types, listeners[0], options[0]);
    return new FormObserver(types, listeners, options);
  }

  /**
   * Renders a `Primary Form`, a `Secondary Form` and an element that is not a form to the DOM for testing.
   * References to these elements are returned to the caller. Prefer the `Primary Form` for **ALL** tests.
   * Only use the other elements as needed.
   */
  function renderForms() {
    const labels = { primaryForm: "Primary Form", secondaryForm: "Secondary Form", nonForm: "Not a Form" } as const;

    document.body.innerHTML = `
      <textarea name="message" form="primary-form"></textarea>
      <form id="primary-form" aria-label="${labels.primaryForm}">
        <input name="name" type="text" />
        <input name="email" type="email" />

        <select name="selector">
          <option selected>One</option>
          <option>Two</option>
          <option>Three</option>
        </select>
      </form>

      <textarea name="review" form="secondary-form"></textarea>
      <form id="secondary-form" aria-label="${labels.secondaryForm}">
        <input name="occupation" type="text" />
      </form>

      <section aria-label="${labels.nonForm}">This is not a form!!!</section>
    `;

    // Assert that BOTH `form`s own fields that are outside of themselves AND that are inside of themselves
    const primaryForm = screen.getByRole("form", { name: labels.primaryForm }) as HTMLFormElement;
    const primaryFormFields = Array.from(primaryForm.elements);
    expect(primaryFormFields.some((el) => !primaryForm.contains(el))).toBe(true);
    expect(primaryFormFields.some((el) => primaryForm.contains(el) && !el.getAttribute("form"))).toBe(true);

    const secondaryForm = screen.getByRole("form", { name: labels.secondaryForm }) as HTMLFormElement;
    const secondaryFormFields = Array.from(secondaryForm.elements);
    expect(secondaryFormFields.some((el) => !secondaryForm.contains(el))).toBe(true);
    expect(secondaryFormFields.some((el) => secondaryForm.contains(el) && !el.getAttribute("form"))).toBe(true);

    expect(secondaryForm).not.toBe(primaryForm);

    // Assert that an element which is COMPLETELY UNRELATED to `form`s is present
    const nonForm = screen.getByRole("region", { name: labels.nonForm });
    expect(nonForm).not.toBeEmptyDOMElement();
    expect(primaryForm).not.toContainElement(nonForm);
    expect(secondaryForm).not.toContainElement(nonForm);

    return { primaryForm, secondaryForm, nonForm };
  }

  /* ---------------------------------------- Test Setup ---------------------------------------- */
  // General assertions that the test constants were set up correctly
  beforeAll(() => {
    // Types
    expect(types.length).toBeGreaterThan(1); // Correct `types` count
    expect(types).toHaveLength(new Set(types).size); // Unique types
    expect(types.every((t) => typeof t === "string")).toBe(true); // Types are strings

    // Listeners
    expect(listeners).toHaveLength(types.length); // Correct `listeners` count
    expect(listeners).toHaveLength(new Set(listeners).size); // Unique listeners (by reference)
    expect(listeners.every((l) => typeof l === "function")).toBe(true); // Listeners are functions

    // Options
    expect(options).toHaveLength(listeners.length); // Correct `options` count
    expect(options).toHaveLength(new Set(listeners).size); // Unique options (by reference)
    options.forEach((o, i, arr) => arr.slice(i + 1).forEach((O) => expect(o).not.toStrictEqual(O))); // Unique options

    // Events
    const eventsArray = Object.values(events);
    expect(eventsArray).toHaveLength(types.length); // Correct Events count
    expect(eventsArray).toHaveLength(new Set(eventsArray).size); // Unique Events (by Class)
    expect(eventsArray.every((E, i) => new E(types[i]) instanceof Event)).toBe(true); // All items are truly `Event`s
  });

  beforeEach(() => {
    vi.clearAllMocks(); // For our global mock `listeners`
    vi.restoreAllMocks(); // For any `spies` on `document.*EventListener` or the Assertion Utilities

    // Reset anything that we've rendered to the DOM. (Without a JS framework implementation, we must do this manually.)
    document.body.textContent = "";
  });

  /* ---------------------------------------- Run Tests ---------------------------------------- */
  /* -------------------- Shared Test Cases -------------------- */
  describe.each(testCases)("%s", (testCase) => {
    describe("constructor", () => {
      it("Requires a valid configuration during instantiation", () => {
        // Define Errors
        const badEventTypes = new TypeError(
          "You must provide a `string` or an `array` of strings for the event `types`.",
        );

        const badListenerForSingleEventType = new TypeError(
          "The `listener` must be a `function` when `types` is a `string`.",
        );

        const badListenersForEventTypesArray = new TypeError(
          "The `listeners` must be a `function` or an `array` of functions when `types` is an `array`.",
        );

        const typesListenersMismatch = new TypeError(
          "The `listeners` array must have the same length as the `types` array.",
        );

        // Run Error Checks
        // @ts-expect-error -- Testing an invalid constructor
        expect(() => new FormObserver()).toThrow(badEventTypes);

        // Single Type, Single Listener, Single Options
        if (testCase === testCases[0]) {
          // @ts-expect-error -- Testing an invalid constructor
          expect(() => new FormObserver(1)).toThrow(badEventTypes);

          // @ts-expect-error -- Testing an invalid constructor
          expect(() => new FormObserver(types[0], [])).toThrow(badListenerForSingleEventType);
          expect(() => getFormObserverByTestCase(testCase)).not.toThrow();
        }
        // Multiple Types, Single Listener, Single Options
        else if (testCase === testCases[1]) {
          // @ts-expect-error -- Testing an invalid constructor
          expect(() => new FormObserver([1])).toThrow(badEventTypes);

          // @ts-expect-error -- Testing an invalid constructor
          expect(() => new FormObserver(types, {})).toThrow(badListenersForEventTypesArray);
          expect(() => getFormObserverByTestCase(testCase)).not.toThrow();
        }
        // Multiple Types, Multiple Listeners, Multiple Options
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        else if (testCase === testCases[2]) {
          // @ts-expect-error -- Testing an invalid constructor
          expect(() => new FormObserver([1])).toThrow(badEventTypes);

          // @ts-expect-error -- Testing an invalid constructor
          expect(() => new FormObserver(types, [{}, {}])).toThrow(badListenersForEventTypesArray);

          // @ts-expect-error -- Testing an invalid constructor
          expect(() => new FormObserver(types, [() => undefined])).toThrow(typesListenersMismatch);
          expect(() => getFormObserverByTestCase(testCase)).not.toThrow();
        }
        // Guard against invalid test cases
        else throwUnsupportedTestCaseError(testCase);
      });

      it("Allows the `options` to be omitted", () => {
        if (testCase === testCases[0]) expect(() => new FormObserver(types[0], listeners[0])).not.toThrow();
        else if (testCase === testCases[1]) expect(() => new FormObserver(types, listeners[0])).not.toThrow();
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        else if (testCase === testCases[2]) expect(() => new FormObserver(types, listeners)).not.toThrow();
        // Guard against invalid test cases
        else throwUnsupportedTestCaseError(testCase);
      });
    });

    describe("observe (Method)", () => {
      it("Only allows a `form` to be observed", async () => {
        const formObserver = getFormObserverByTestCase(testCase);
        const { nonForm } = renderForms();

        vi.spyOn(Assertions, "assertElementIsForm");
        expect(() => formObserver.observe(nonForm as HTMLFormElement)).toThrow();
        expect(Assertions.assertElementIsForm).toHaveBeenNthCalledWith(1, nonForm);
      });

      /*
       * NOTE: The `FormObserver` must AUTOMATICALLY listen for events from fields that BELONG to the
       * observed `form`. This includes 1) Relevant fields inside the `form`, 2) Relevant fields OUTSIDE
       * the `form`, and most importantly 3) Fields added to the `form` AFTER it has already been observed.
       * This test MUST account for ALL of these scenarios. (Note that `renderForms` already prepares
       * #1 and #2 for testing. By nature, #3 must be prepared by the test locally.)
       */
      it("Listens for the specified event(s) from ALL of a `form`'s fields", async () => {
        const formObserver = getFormObserverByTestCase(testCase);

        // Render Form
        const { primaryForm, secondaryForm } = renderForms();
        formObserver.observe(primaryForm);
        formObserver.observe(secondaryForm);

        // Assert that the `primaryForm` obtained a new field AFTER being observed
        const newField = document.createElement("input");
        newField.name = "dynamic-new-field";
        expect(Array.from(primaryForm.elements).every((el) => el.getAttribute("name") !== newField.name)).toBe(true);

        primaryForm.appendChild(newField);
        expect(primaryForm.elements).toContain(newField);

        // Run Tests for Each Test Case
        for (const form of [primaryForm, secondaryForm]) {
          for (const field of form.elements) {
            await userEvent.click(field);

            // Single Type, Single Listener, Single Options
            if (testCase === testCases[0]) {
              expect(listeners[0]).toHaveBeenCalledWith(expect.any(events[types[0]]));
              expect(listeners[0]).toHaveBeenCalledWith(expect.objectContaining({ target: field }));
              expect(listeners[0]).toHaveBeenCalledTimes(1);

              expect(listeners[1]).not.toHaveBeenCalled(); // Shouldn't have been setup

              listeners[0].mockClear();
            }
            // Multiple Types, Single Listener, Single Options
            else if (testCase === testCases[1]) {
              expect(listeners[0]).toHaveBeenCalledWith(expect.any(events[types[0]]));
              expect(listeners[0]).toHaveBeenCalledWith(expect.any(events[types[1]]));
              expect(listeners[0]).toHaveBeenCalledTimes(2);
              expect(listeners[0]).not.toHaveBeenCalledWith(expect.not.objectContaining({ target: field }));

              expect(listeners[1]).not.toHaveBeenCalled(); // Shouldn't have been setup

              listeners[0].mockClear();
            }
            // Multiple Types, Multiple Listeners, Multiple Options
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            else if (testCase === testCases[2]) {
              expect(listeners[0]).toHaveBeenCalledWith(expect.any(events[types[0]]));
              expect(listeners[0]).toHaveBeenCalledWith(expect.objectContaining({ target: field }));
              expect(listeners[0]).toHaveBeenCalledTimes(1);

              expect(listeners[1]).toHaveBeenCalledWith(expect.any(events[types[1]]));
              expect(listeners[1]).toHaveBeenCalledWith(expect.objectContaining({ target: field }));
              expect(listeners[1]).toHaveBeenCalledTimes(1);

              listeners.forEach((l) => l.mockClear());
            }
            // Guard against invalid test cases
            else throwUnsupportedTestCaseError(testCase);
          }
        }
      });

      // Proof: The registered listener(s) are not called more than once per event
      it("Does not observe the same `form` more than once", async () => {
        const formObserver = getFormObserverByTestCase(testCase);

        // Render Form
        const { primaryForm } = renderForms();
        [...Array(10)].forEach(() => formObserver.observe(primaryForm)); // Try to observe `primaryForm` 10 times

        // Run Tests for Each Test Case
        for (const field of primaryForm.elements) {
          await userEvent.click(field);

          // Single Type, Single Listener, Single Options
          if (testCase === testCases[0]) {
            expect(listeners[0].mock.calls.length).not.toBeGreaterThan(1);
            listeners[0].mockClear();
          }
          // Multiple Types, Single Listener, Single Options
          else if (testCase === testCases[1]) {
            expect(listeners[0].mock.calls.length).not.toBeGreaterThan(2);
            listeners[0].mockClear();
          }
          // Multiple Types, Multiple Listeners, Multiple Options
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          else if (testCase === testCases[2]) {
            listeners.forEach((l) => expect(l.mock.calls.length).not.toBeGreaterThan(1));
            listeners.forEach((l) => l.mockClear());
          }
          // Guard against invalid test cases
          else throwUnsupportedTestCaseError(testCase);
        }
      });

      it("Returns `true` if the received `form` was NOT already being observed (and `false` otherwise)", () => {
        const formObserver = getFormObserverByTestCase(testCase);
        const { primaryForm, secondaryForm } = renderForms();

        // Returns `true` because the `form`s were not originally being observed
        expect(formObserver.observe(primaryForm)).toBe(true);
        expect(formObserver.observe(secondaryForm)).toBe(true);

        // Returns `false` because the `form`s were already being observed
        expect(formObserver.observe(primaryForm)).toBe(false);
        expect(formObserver.observe(secondaryForm)).toBe(false);

        // Resets are also handled correctly.
        formObserver.unobserve(primaryForm);
        expect(formObserver.observe(primaryForm)).toBe(true);
      });

      // Proof: `document.addEventListener` is not re-called when a `form` is already being observed
      it("Uses the same event listener(s) for all observed `form`s via `event delegation`", () => {
        const formObserver = getFormObserverByTestCase(testCase);

        // Render Form
        const { primaryForm, secondaryForm } = renderForms();
        expect(primaryForm.ownerDocument).toBe(secondaryForm.ownerDocument);
        const addEventListener = vi.spyOn(primaryForm.ownerDocument, "addEventListener");

        formObserver.observe(primaryForm);

        // Single Type, Single Listener, Single Options
        if (testCase === testCases[0]) {
          expect(addEventListener).toHaveBeenCalledWith(types[0], expect.any(Function), options[0]);
          expect(addEventListener).toHaveBeenCalledTimes(1);
        }
        // Multiple Types, Single Listener, Single Options
        else if (testCase === testCases[1]) {
          expect(addEventListener).toHaveBeenCalledWith(types[0], expect.any(Function), options[0]);
          expect(addEventListener).toHaveBeenCalledWith(types[1], expect.any(Function), options[0]);
          expect(addEventListener).toHaveBeenCalledTimes(2);
        }
        // Multiple Types, Multiple Listeners, Multiple Options
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        else if (testCase === testCases[2]) {
          expect(addEventListener).toHaveBeenCalledWith(types[0], expect.any(Function), options[0]);
          expect(addEventListener).toHaveBeenCalledWith(types[1], expect.any(Function), options[1]);
          expect(addEventListener).toHaveBeenCalledTimes(2);
        }
        // Guard against invalid test cases
        else throwUnsupportedTestCaseError(testCase);

        // Duplicate listeners are NOT attached/created when observing ANOTHER form
        addEventListener.mockClear();
        formObserver.observe(secondaryForm);
        expect(addEventListener).not.toHaveBeenCalled();
      });
    });

    describe("unobserve (Method)", () => {
      it("Only allows a `form` to be unobserved", async () => {
        const formObserver = getFormObserverByTestCase(testCase);
        const { nonForm } = renderForms();

        vi.spyOn(Assertions, "assertElementIsForm");
        expect(() => formObserver.unobserve(nonForm as HTMLFormElement)).toThrow();
        expect(Assertions.assertElementIsForm).toHaveBeenNthCalledWith(1, nonForm);
      });

      it("Does nothing with a `form` that isn't currently being observed", () => {
        const formObserver = getFormObserverByTestCase(testCase);
        const { primaryForm } = renderForms();
        const removeEventListener = vi.spyOn(primaryForm.ownerDocument, "removeEventListener");

        // No errors are thrown, and no attempts are made to remove event listeners
        expect(() => formObserver.unobserve(primaryForm)).not.toThrow();
        expect(removeEventListener).not.toHaveBeenCalled();
      });

      it("Stops listening for events from a `form`'s fields", async () => {
        const formObserver = getFormObserverByTestCase(testCase);
        const { primaryForm, secondaryForm } = renderForms();

        // Observe forms
        formObserver.observe(primaryForm);
        formObserver.observe(secondaryForm);

        // Unobserve forms
        formObserver.unobserve(primaryForm);
        formObserver.unobserve(secondaryForm);

        // Regardless of the `testCase`, NOTHING should be called
        for (const form of [primaryForm, secondaryForm]) {
          for (const field of form.elements) {
            await userEvent.click(field);
            listeners.forEach((l) => expect(l).not.toHaveBeenCalled());
          }
        }
      });

      it("Returns `true` if the received `form` WAS already being observed (and `false` otherwise)", () => {
        const formObserver = getFormObserverByTestCase(testCase);
        const { primaryForm, secondaryForm } = renderForms();

        // Returns `false` because the `form`s were not originally being observed
        expect(formObserver.unobserve(primaryForm)).toBe(false);
        expect(formObserver.unobserve(secondaryForm)).toBe(false);

        // Returns `true` because the `form`s were already being observed
        formObserver.observe(primaryForm);
        expect(formObserver.unobserve(primaryForm)).toBe(true);

        formObserver.observe(secondaryForm);
        expect(formObserver.unobserve(secondaryForm)).toBe(true);
      });

      it("Does not remove the `delegated` event listener(s) until ALL `form`s are unobserved", () => {
        const formObserver = getFormObserverByTestCase(testCase);

        // Render Form
        const { primaryForm, secondaryForm } = renderForms();
        expect(primaryForm.ownerDocument).toBe(secondaryForm.ownerDocument);
        const removeEventListener = vi.spyOn(primaryForm.ownerDocument, "removeEventListener");

        formObserver.observe(primaryForm);
        formObserver.observe(secondaryForm);

        // `removeEventListener` is not called because other `form`s are still being observed
        formObserver.unobserve(secondaryForm);
        expect(removeEventListener).not.toHaveBeenCalled();

        // `removeEventListener` is called after ALL `form`s are unobserved
        formObserver.unobserve(primaryForm);

        // Single Type, Single Listener, Single Options
        if (testCase === testCases[0]) {
          expect(removeEventListener).toHaveBeenCalledWith(types[0], expect.any(Function), options[0]);
          expect(removeEventListener).toHaveBeenCalledTimes(1);
        }
        // Multiple Types, Single Listener, Single Options
        else if (testCase === testCases[1]) {
          expect(removeEventListener).toHaveBeenCalledWith(types[0], expect.any(Function), options[0]);
          expect(removeEventListener).toHaveBeenCalledWith(types[1], expect.any(Function), options[0]);
          expect(removeEventListener).toHaveBeenCalledTimes(2);
        }
        // Multiple Types, Multiple Listeners, Multiple Options
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        else if (testCase === testCases[2]) {
          expect(removeEventListener).toHaveBeenCalledWith(types[0], expect.any(Function), options[0]);
          expect(removeEventListener).toHaveBeenCalledWith(types[1], expect.any(Function), options[1]);
          expect(removeEventListener).toHaveBeenCalledTimes(2);
        }
        // Guard against invalid test cases
        else throwUnsupportedTestCaseError(testCase);
      });
    });

    describe("disconnect (Method)", () => {
      it("Unobserves ALL `form`s currently being observed", () => {
        const formObserver = getFormObserverByTestCase(testCase);
        vi.spyOn(formObserver, "unobserve");

        // Render Form
        const { primaryForm, secondaryForm } = renderForms();
        formObserver.observe(primaryForm);
        formObserver.observe(secondaryForm);

        // Disconnect
        formObserver.disconnect();
        expect(formObserver.unobserve).toHaveBeenCalledTimes(2);
        expect(formObserver.unobserve).toHaveBeenCalledWith(primaryForm);
        expect(formObserver.unobserve).toHaveBeenCalledWith(secondaryForm);
      });
    });
  });

  /* -------------------- Unshared Test Cases -------------------- */
  describe("Unshared Test Cases", () => {
    describe(`${testCases[2]}`, () => {
      it("Uses the same `options` for all `listeners` when only a single set of options is provided", () => {
        const singleOptions = options[0];
        const formObserver = new FormObserver(types, listeners, singleOptions);

        // Render Form
        const { primaryForm } = renderForms();
        const addEventListener = vi.spyOn(primaryForm.ownerDocument, "addEventListener");
        const removeEventListener = vi.spyOn(primaryForm.ownerDocument, "removeEventListener");

        formObserver.observe(primaryForm);
        expect(addEventListener).toHaveBeenCalledWith(expect.anything(), expect.anything(), singleOptions);
        expect(addEventListener).toHaveBeenCalledWith(expect.anything(), expect.anything(), singleOptions);
        expect(addEventListener).toHaveBeenCalledTimes(2);

        formObserver.unobserve(primaryForm);
        expect(removeEventListener).toHaveBeenCalledWith(expect.anything(), expect.anything(), singleOptions);
        expect(removeEventListener).toHaveBeenCalledWith(expect.anything(), expect.anything(), singleOptions);
        expect(removeEventListener).toHaveBeenCalledTimes(2);
      });
    });
  });
});

/* ---------------------------------------- TypeScript Type-only Tests ---------------------------------------- */
/* eslint-disable no-new */
/* eslint-disable no-unreachable */
/* eslint-disable @typescript-eslint/no-empty-function */
(function runTypeOnlyTests() {
  /*
   * This early return statement allows our type-only tests to be validated by `ts-jest` WITHOUT us getting
   * false positives for code coverage.
   */
  return;

  /*
   * To prove that our inferred types work correctly, we must test 2 different events that have properties
   * exclusive to each other AND properties common to each other. The `InputEvent` and `MouseEvent`
   * both extend `UIEvent`, but they also have properties that are distinct from each other:
   *
   * - Only `InputEvent` has `event.data`
   * - Only `MouseEvent` has `event.x`
   * - Both have `event.detail`
   */
  const event1 = "beforeinput" satisfies keyof DocumentEventMap; // Correlates to `InputEvent`
  const event2 = "click" satisfies keyof DocumentEventMap; // Correlates to `MouseEvent`

  // Single Type, Single Listener, Single Options
  new FormObserver(event1, (event) => event.data);
  new FormObserver(event2, (event) => event.x, true);

  // Multiple Types, Single Listener, Single Options
  new FormObserver([event1, event2], (event) => event.detail);
  new FormObserver([event1, event2], (event) => event.detail, undefined);

  new FormObserver([event1, event2] as const, (event) => event.detail);
  new FormObserver([event1, event2] as const, (event) => event.detail, { passive: true });

  // Multiple Types, Multiple Listeners, Multiple Options
  new FormObserver([event1, event2], [(e) => e.detail, (e) => e.detail]);
  new FormObserver([event1, event2], [(e) => e.detail, (e) => e.detail], {}); // Options as single value
  new FormObserver([event1, event2], [(e) => e.detail, (e) => e.detail], [{ once: true }, false]); // Options as array

  new FormObserver([event1, event2] as const, [(e) => e.data, (e) => e.x]);
  new FormObserver([event1, event2] as const, [(e) => e.data, (e) => e.x], true); // Options as single value
  new FormObserver([event1, event2] as const, [(e) => e.data, (e) => e.x], []); // Options as INCOMPLETE array
})();
/* eslint-enable @typescript-eslint/no-empty-function */
/* eslint-enable no-unreachable */
/* eslint-enable no-new */
