/* eslint-disable testing-library/prefer-screen-queries -- Necessary when testing Shadow DOMs */
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import { LitElement, html, render } from "lit";
import { findByRole } from "@testing-library/dom";
import { userEvent } from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { FormObserver } from "@form-observer/core";
import automate from "../automate.js";

describe("Automate (Lit Directive)", () => {
  beforeEach(vi.restoreAllMocks as () => void);
  afterEach(() => document.body.replaceChildren());

  it("Automatically sets up any `FormObserver` (onMount) and cleans it up (onUnmount)", async () => {
    /* ---------- Setup ---------- */
    const tag = "lit-example";
    vi.spyOn(FormObserver.prototype, "observe");
    vi.spyOn(FormObserver.prototype, "unobserve");

    class LitExample extends LitElement {
      declare count: number;
      static properties = { count: { type: Number } };
      #observer = new FormObserver("input", () => undefined);

      render() {
        return html`
          <form ${automate(this.#observer)} aria-label="Test Form"></form>
          <button type="button" @click="${() => (this.count += 1)}">Click Count: ${this.count}</button>
        `;
      }
    }

    customElements.define(tag, LitExample);
    render(html`<lit-example></lit-example>`, document.body);

    /* ---------- Run Assertions ---------- */
    // eslint-disable-next-line testing-library/no-node-access -- Necessary for the test
    const component = document.querySelector(tag) as LitExample;
    const shadowRoot = component.shadowRoot as ShadowRoot;

    // After Mounting
    const form = await findByRole<HTMLFormElement>(shadowRoot as unknown as HTMLElement, "form");
    expect(FormObserver.prototype.observe).toHaveBeenCalledTimes(1);
    expect(FormObserver.prototype.observe).toHaveBeenNthCalledWith(1, form);

    // Re-rendering (No Change)
    const button = await findByRole<HTMLButtonElement>(shadowRoot as unknown as HTMLElement, "button");
    await userEvent.click(button);
    expect(FormObserver.prototype.observe).toHaveBeenCalledTimes(1);

    // Disconnecting
    const fragment = new DocumentFragment();
    fragment.appendChild(component);
    expect(FormObserver.prototype.unobserve).toHaveBeenCalledTimes(1);
    expect(FormObserver.prototype.unobserve).toHaveBeenNthCalledWith(1, form);

    // Reconnecting
    document.body.appendChild(component);
    expect(FormObserver.prototype.observe).toHaveBeenCalledTimes(2);
    expect(FormObserver.prototype.observe).toHaveBeenNthCalledWith(2, form);

    // DOM Erasure
    document.body.replaceChildren();
    expect(FormObserver.prototype.unobserve).toHaveBeenCalledTimes(2);
    expect(FormObserver.prototype.unobserve).toHaveBeenNthCalledWith(2, form);
  });
});
