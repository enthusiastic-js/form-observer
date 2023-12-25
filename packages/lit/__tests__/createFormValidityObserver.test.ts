/* eslint-disable testing-library/prefer-screen-queries -- Necessary when testing Shadow DOMs */
import { vi, beforeEach, describe, it, expect } from "vitest";
import { findByRole, getByRole } from "@testing-library/dom";
import "@testing-library/jest-dom/vitest";
import { LitElement, render, html } from "lit";
import FormValidityObserver from "@form-observer/core/FormValidityObserver";
import createFormValidityObserver from "../createFormValidityObserver.js";
import type { RenderableLitValue } from "../createFormValidityObserver.js";
import automate from "../automate.js";
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

  it("Uses a default `renderer` that accepts any `Renderable Lit Value`", async () => {
    /* ---------- Setup ---------- */
    const tag = "lit-example";
    // These values are assigned in the `LitExample` constructor, and they're initialized here to appease TypeScript.
    let setFieldError: FormValidityObserver<RenderableLitValue | RenderableLitValue[]>["setFieldError"] = () => {};
    let clearFieldError: FormValidityObserver<RenderableLitValue | RenderableLitValue[]>["clearFieldError"] = () => {};

    class LitExample extends LitElement {
      #observer = createFormValidityObserver(types[0]);

      constructor() {
        super();
        setFieldError = this.#observer.setFieldError;
        clearFieldError = this.#observer.clearFieldError;
      }

      render() {
        return html`
          <form ${automate(this.#observer)}>
            <input name="first-name" type="text" required aria-describedby="first-name-error" />
            <div id="first-name-error" role="alert"></div>
          </form>
        `;
      }
    }

    customElements.define(tag, LitExample);
    render(html`<lit-example></lit-example>`, document.body);

    // eslint-disable-next-line testing-library/no-node-access -- Necessary for the test
    const component = document.querySelector(tag) as LitExample;
    const shadowRoot = component.shadowRoot as ShadowRoot;

    const input = await findByRole<HTMLInputElement>(shadowRoot as unknown as HTMLElement, "textbox");
    const errorContainer = getByRole(shadowRoot as unknown as HTMLElement, "alert");

    /* ---------- Rendering a Single Template Result ---------- */
    const messageSingle = "Something is wrong here...";
    const messageSingleTemplateResult = html`<p>${messageSingle}</p>`;
    setFieldError(input.name, messageSingleTemplateResult, true);

    expect(input).toHaveAttribute("aria-invalid", String(true));
    expect(input).toHaveAccessibleDescription(messageSingle);
    expect(errorContainer.childNodes[1]).toEqual(expect.any(HTMLParagraphElement));

    clearFieldError(input.name);
    expect(input).toHaveAttribute("aria-invalid", String(false));
    expect(input).not.toHaveAccessibleDescription();
    expect(errorContainer).toBeEmptyDOMElement();

    /* ---------- Rendering Multiple DOM Nodes ---------- */
    const messageDivided = ["This is the first line", "of multiple lines", "found in this message."] as const;
    const node1 = document.createElement("div");
    const node2 = document.createTextNode(` ${messageDivided[1]} `);
    const node3 = document.createElement("p");
    [node1.textContent, , node3.textContent] = messageDivided;

    setFieldError(input.name, [node1, node2, node3], true);
    expect(input).toHaveAttribute("aria-invalid", String(true));
    expect(input).toHaveAccessibleDescription(messageDivided.join(" "));
    [node1, node2, node3].forEach((n) => expect(errorContainer).toContain(n));

    clearFieldError(input.name);
    expect(input).toHaveAttribute("aria-invalid", String(false));
    expect(input).not.toHaveAccessibleDescription();
    expect(errorContainer).toBeEmptyDOMElement();

    /* ---------- Rendering Pure Strings ---------- */
    const messageString = "This is a PURE string!!!";
    setFieldError(input.name, messageString, true);

    expect(input).toHaveAttribute("aria-invalid", String(true));
    expect(input).toHaveAccessibleDescription(messageString);
    expect(errorContainer.childNodes[1]).toEqual(expect.any(Text));

    clearFieldError(input.name);
    expect(input).toHaveAttribute("aria-invalid", String(false));
    expect(input).not.toHaveAccessibleDescription();
    expect(errorContainer).toBeEmptyDOMElement();

    /* ---------- Cleanup ---------- */
    document.body.replaceChildren();
  });
});
