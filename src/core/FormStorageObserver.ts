import FormObserver from "./FormObserver";
import { assertElementIsForm } from "./utils/assertions";
import type { OneOrMany, EventType, FormFieldEvent, FormField } from "./types";

/*
 * NOTE: Watch GitHub Issue for Static Methods on Interfaces: https://github.com/microsoft/TypeScript/issues/33892.
 * If this gets supported, then we can enforce these `static` method types on our physical `class expression`.
 */
interface FormStorageObserverConstructor {
  /**
   * Provides a way to store an `HTMLFormElement`'s data in `localStorage` automatically in response to
   * the events emitted from its fields.
   *
   * @param types The type(s) of event(s) that trigger(s) updates to `localStorage`.
   * @param options
   */
  new <T extends OneOrMany<EventType>>(types: T, options?: FormStorageObserverOptions): FormObserver;

  /** Loads all of the data in `localStorage` related to the provided `form`. */
  load(form: HTMLFormElement): void;
  /**
   * Loads the data in `localStorage` for the field that has the provided `name` and belongs to
   * the provided `form`.
   */
  load(form: HTMLFormElement, name: string): void;

  /** Clears all of the data in `localStorage` related to the provided `form`. */
  clear(form: HTMLFormElement): void;
  /**
   * Clears the data in `localStorage` for the field that has the provided `name` and belongs to
   * the provided `form`.
   */
  clear(form: HTMLFormElement, name: string): void;
}

interface FormStorageObserverOptions {
  /**
   * Indicates whether or not the observer should automate the loading/removal of a form's `localStorage` data.
   * - `loading` (Default): A form's data will automatically be loaded from `localStorage` when it is observed.
   * - `deletion`: A form's data will automatically be removed from `localStorage` when it is unobserved.
   * - `both`: Behaves as if `loading` and `deletion` were specified simultaneously.
   * - `neither`: The observer will not automate any data loading or data removal.
   */
  automate?: "loading" | "deletion" | "both" | "neither";

  /**
   * Indicates that the observer's event listener should be called during the event capturing phase
   * instead of the event bubbling phase. Defaults to `false`.
   * @see {@link https://www.w3.org/TR/DOM-Level-3-Events/#event-flow DOM Event Flow}
   */
  useEventCapturing?: boolean;
}

const FormStorageObserver: FormStorageObserverConstructor = class<T extends OneOrMany<EventType>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Necessary due to a restriction in TS
  extends FormObserver<any>
{
  readonly #automate: Required<FormStorageObserverOptions>["automate"];
  constructor(types: T, { automate, useEventCapturing }: FormStorageObserverOptions = {}) {
    super(types, eventListener, { passive: true, capture: useEventCapturing });
    this.#automate = automate ?? "loading";
  }

  observe(form: HTMLFormElement): boolean {
    const newlyObserved = super.observe(form);
    if (newlyObserved && (this.#automate === "loading" || this.#automate === "both")) FormStorageObserver.load(form);
    return newlyObserved;
  }

  static load(form: HTMLFormElement): void;
  static load(form: HTMLFormElement, name: string): void;
  static load(form: HTMLFormElement, name?: string): void {
    assertElementIsForm(form);

    /* -------------------- 1st Overload -------------------- */
    if (name == null) {
      const loadedRadiogroups = new Set<string>();

      for (let i = 0; i < form.elements.length; i++) {
        const field = form.elements[i] as FormField;

        // Avoid loading the same `radiogroup` more than once
        if (loadedRadiogroups.has(field.name)) {
          const radiogroup = form.elements.namedItem(field.name) as RadioNodeList;
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

    const field = form.elements.namedItem(name) as FormField | RadioNodeList | null;
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

    const storedValue = JSON.parse(storedValueString) as unknown;

    // Checkboxes
    if (field instanceof HTMLInputElement && field.type === "checkbox") field.checked = storedValue as boolean;
    // Multi-Selects
    else if (field instanceof HTMLSelectElement && field.multiple && Array.isArray(storedValue)) {
      // Loop over the `options` as long as there are stored values to read
      let brokenAt: number | undefined;
      for (let i = 0; i < field.options.length; i++) {
        if (!storedValue.length) {
          brokenAt = i;
          break;
        }

        const option = field.options[i];
        const index = storedValue.findIndex((v: string) => v === option.value);

        option.selected = index >= 0;
        if (index >= 0) storedValue.splice(index, 1);
      }

      // Deselect all remaining `options` after the stored values are emptied
      for (let i = brokenAt as number; i < field.options.length; i++) field.options[i].selected = false;
    }
    // Other Form Fields
    else field.value = storedValue as string;
  }

  unobserve(form: HTMLFormElement): boolean {
    const newlyUnobserved = super.unobserve(form);
    if (newlyUnobserved && (this.#automate === "deletion" || this.#automate === "both")) {
      FormStorageObserver.clear(form);
    }

    return newlyUnobserved;
  }

  static clear(form: HTMLFormElement): void;
  static clear(form: HTMLFormElement, name: string): void;
  static clear(form: HTMLFormElement, name?: string): void {
    assertElementIsForm(form);

    // 2nd Overload
    if (name) return localStorage.removeItem(getFieldKey(form.name, name));

    // 1st Overload
    for (let i = 0; i < form.elements.length; i++) {
      // Note: We're assuming that this operation is fast enough not to warrant skipping duplicate radio buttons
      const field = form.elements[i] as FormField;
      if (field.name) localStorage.removeItem(getFieldKey(form.name, field.name));
    }
  }
};

/* -------------------- Utility Functions -------------------- */
// TODO: Should we expose a static `FormStorageObserver.save` method instead for greater flexibility?
/** Event Listener used to store `form` data in `localStorage` */
function eventListener(event: FormFieldEvent<EventType>): void {
  const field = event.target;
  if (!field.name) return; // We only store "known" (named) form values

  // The following elements are not relevant for form data storage and are therefore ignored
  if (field instanceof HTMLFieldSetElement) return; // Isn't really supposed to have a value
  if (field instanceof HTMLOutputElement) return; // Value is derived from its inputs
  if (field instanceof HTMLObjectElement) return; // Doesn't seem like a relevant element for form data

  const form = field.form as HTMLFormElement;
  const scope = getFieldKey(form.name, field.name);

  // Multiselects
  if (field instanceof HTMLSelectElement && field.multiple) {
    const values: string[] = [];
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

/** Derives the proper `localStorage` key for a given `form`'s field */
function getFieldKey(formName: string, fieldName: string): `form:${string}:${string}` {
  return `form:${formName || "global-scope"}:${fieldName}` as const;
}

export default FormStorageObserver;