import FormObserver from "./FormObserver.js";
import { assertElementIsForm } from "./utils/assertions.js";

/**
 * @template {import("./types.d.ts").OneOrMany<import("./types.d.ts").EventType>} T
 * @type {import("./types.d.ts").FormStorageObserverConstructor}
 */
const FormStorageObserver = class extends FormObserver {
  /** @readonly @type {Required<import("./types.d.ts").FormStorageObserverOptions>["automate"]} */
  #automate;

  /**
   * @param {T} types
   * @param {import("./types.d.ts").FormStorageObserverOptions} [options]
   */
  constructor(types, options) {
    super(types, eventListener, { passive: true, capture: options?.useEventCapturing });
    this.#automate = options?.automate ?? "loading";
  }

  /**
   * @param {HTMLFormElement} form
   * @returns {boolean}
   */
  observe(form) {
    const newlyObserved = super.observe(form);
    if (newlyObserved && (this.#automate === "loading" || this.#automate === "both")) FormStorageObserver.load(form);
    return newlyObserved;
  }

  /**
   * @param {HTMLFormElement} form
   * @param {string} [name]
   * @returns {void}
   */
  static load(form, name) {
    assertElementIsForm(form);

    /* -------------------- 1st Overload -------------------- */
    if (name == null) {
      /** @type {Set<string>} */
      const loadedRadiogroups = new Set();

      for (let i = 0; i < form.elements.length; i++) {
        const field = /** @type {import("./types.d.ts").FormField} */ (form.elements[i]);

        // Avoid loading the same `radiogroup` more than once
        if (loadedRadiogroups.has(field.name)) {
          const radiogroup = /** @type {RadioNodeList} */ (form.elements.namedItem(field.name));
          i += radiogroup.length - 2; // Skip all remaining radio buttons
          continue;
        }

        // Keep track of radio button groups that have loaded their `localStorage` data
        if (field.type === "radio") loadedRadiogroups.add(field.name);

        if (field.name) FormStorageObserver.load(form, field.name);
      }

      return;
    }

    /* -------------------- 2nd Overload -------------------- */
    /* ---------- Argument Validation ---------- */
    if (name === "") return; // Empty strings represent unnamed fields and are not allowed

    const field = /** @type {import("./types.d.ts").FormField | RadioNodeList | null} */ (
      form.elements.namedItem(name)
    );
    if (!field) return; // No field to load data into

    // Require that the provided `name` matches the name of the form field
    if (!(field instanceof RadioNodeList) && field.name !== name) {
      const err = `Expected to find a field with name "${name}", but instead found a field with name "${field.name}".`;
      const hint = "Did you accidentally provide your field's `id` instead of your field's `name`?";
      throw new Error(`${err} ${hint}`);
    }

    /* ---------- Data Loading ---------- */
    // The following elements do not have their "values" stored and are therefore ignored
    if (field instanceof HTMLFieldSetElement) return;
    if (field instanceof HTMLOutputElement) return;
    if (field instanceof HTMLObjectElement) return;
    if (field instanceof HTMLInputElement) {
      if (field.type === "password" || field.type === "hidden" || field.type === "file") return;
    }

    const storedValueString = localStorage.getItem(getFieldKey(form.name, name));
    if (!storedValueString) return; // No value was stored for this field

    const storedValue = /** @type {unknown} */ (JSON.parse(storedValueString));

    // Checkboxes
    if (field instanceof HTMLInputElement && field.type === "checkbox") {
      field.checked = /** @type {boolean} */ (storedValue);
    }
    // Multi-Selects
    else if (field instanceof HTMLSelectElement && field.multiple && Array.isArray(storedValue)) {
      // Loop over the `options` as long as there are stored values to read
      /** @type {number | undefined} */
      let brokenAt;

      for (let i = 0; i < field.options.length; i++) {
        if (!storedValue.length) {
          brokenAt = i;
          break;
        }

        const option = field.options[i];
        const index = storedValue.findIndex((/** @type {string} */ v) => v === option.value);

        option.selected = index >= 0;
        if (index >= 0) storedValue.splice(index, 1);
      }

      // Deselect all remaining `options` after the stored values are emptied
      for (let i = /** @type {number} */ (brokenAt); i < field.options.length; i++) field.options[i].selected = false;
    }
    // Other Form Fields
    else field.value = /** @type {string} */ (storedValue);
  }

  /**
   * @param {HTMLFormElement} form
   * @returns {boolean}
   */
  unobserve(form) {
    const newlyUnobserved = super.unobserve(form);
    if (newlyUnobserved && (this.#automate === "deletion" || this.#automate === "both")) {
      FormStorageObserver.clear(form);
    }

    return newlyUnobserved;
  }

  /**
   * @param {HTMLFormElement} form
   * @param {string} [name]
   * @returns {void}
   */
  static clear(form, name) {
    assertElementIsForm(form);

    // 2nd Overload
    if (name) return localStorage.removeItem(getFieldKey(form.name, name));

    // 1st Overload
    for (let i = 0; i < form.elements.length; i++) {
      // Note: We're assuming that this operation is fast enough not to warrant skipping duplicate radio buttons
      const field = /** @type {import("./types.d.ts").FormField} */ (form.elements[i]);
      if (field.name) localStorage.removeItem(getFieldKey(form.name, field.name));
    }
  }
};

/* -------------------- Utility Functions -------------------- */
/*
 * TODO: Should we expose a static `FormStorageObserver.save` method instead for greater flexibility?
 * We'd have to update our tests if we did that.`
 */
/**
 * Event Listener used to store `form` data in `localStorage`
 *
 * @param {import("./types.d.ts").FormFieldEvent<import("./types.d.ts").EventType>} event
 * @returns {void}
 */
function eventListener(event) {
  const field = event.target;
  if (!field.name) return; // We only store "known" (named) form values

  // The following elements are not relevant for form data storage and are therefore ignored
  if (field instanceof HTMLFieldSetElement) return; // Isn't really supposed to have a value
  if (field instanceof HTMLOutputElement) return; // Value is derived from its inputs
  if (field instanceof HTMLObjectElement) return; // Doesn't seem like a relevant element for form data

  // eslint-disable-next-line prefer-destructuring -- ESLint doesn't understand the necessary TS syntax
  const form = /** @type {HTMLFormElement} */ (field.form);
  const scope = getFieldKey(form.name, field.name);

  // Multiselects
  if (field instanceof HTMLSelectElement && field.multiple) {
    /** @type {string[]} */
    const values = [];

    for (let i = 0; i < field.selectedOptions.length; i++) values.push(field.selectedOptions[i].value);

    localStorage.setItem(scope, JSON.stringify(values));
    return;
  }

  // Unique Input Scenarios
  if (field instanceof HTMLInputElement) {
    // Checkboxes
    if (field.type === "checkbox") return localStorage.setItem(scope, JSON.stringify(field.checked));

    // Sensitive or Unsupported Inputs
    if (field.type === "password" || field.type === "hidden" || field.type === "file") return;
  }

  // Other Form Fields
  localStorage.setItem(scope, JSON.stringify(field.value));
}

/**
 * Derives the proper `localStorage` key for a given `form`'s field
 *
 * @param {string} formName
 * @param {string} fieldName
 * @returns {`form:${string}:${string}`}
 */
function getFieldKey(formName, fieldName) {
  return `form:${formName || "global-scope"}:${fieldName}`;
}

export default FormStorageObserver;
