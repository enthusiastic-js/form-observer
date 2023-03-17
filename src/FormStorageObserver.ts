import FormObserver from "./FormObserver";
import { assertElementIsForm } from "./utils/assertions";
import type { OneOrMany, EventType, FormFieldEvent, ListenerOptions, FormField } from "./types";

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
   * Determines whether or not the observer will automatically load/clear the form data stored in `localStorage`.
   * If `false`, the observer will automatically load any relevant data from `localStorage` when a
   * form is observed, and it will automatically clear any relevant data from `localStorage` when the
   * form is unobserved.
   *
   * Defaults to `false`.
   */
  manual?: boolean;

  /**
   * The `addEventListener` options to use for the observer's event listener.
   *
   * See {@link https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener addEventListener}.
   */
  eventListenerOpts?: ListenerOptions;
}

const FormStorageObserver: FormStorageObserverConstructor = class<T extends OneOrMany<EventType>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Necessary due to a restriction in TS
  extends FormObserver<any>
{
  #manual?: boolean;
  constructor(types: T, { manual, eventListenerOpts }: FormStorageObserverOptions = {}) {
    super(types, eventListener, eventListenerOpts);
    this.#manual = manual;
  }

  observe(form: HTMLFormElement): boolean {
    const newlyObserved = super.observe(form);
    if (newlyObserved && !this.#manual) FormStorageObserver.load(form);
    return newlyObserved;
  }

  static load(form: HTMLFormElement): void;
  static load(form: HTMLFormElement, name: string): void;
  static load(form: HTMLFormElement, name?: string): void {
    assertElementIsForm(form);

    /* -------------------- 1st Overload -------------------- */
    if (name == null) {
      for (let i = 0; i < form.elements.length; i += 1) {
        const field = form.elements[i] as FormField;
        if (field.name) FormStorageObserver.load(form, field.name);
      }

      return;
    }

    /* -------------------- 2nd Overload -------------------- */
    /* ---------- Argument Validation ---------- */
    if (name === "") return; // Empty strings represent unnamed fields and are not allowed

    const field = form.elements.namedItem(name) as FormField | RadioNodeList | null;
    if (!field) return; // Nothing to load

    // Require that the provided `name` matches the name of the form field
    if (!(field instanceof RadioNodeList) && field.name !== name) {
      const err = `Expected to find a field with name "${name}", but instead found a field with name "${field.name}".`;

      const hint = field.name
        ? "Did you accidentally give this field an `id` that matches the `name` of a different element?"
        : "Did you forget to give this field a `name` attribute?";

      throw new Error(`${err} ${hint}`);
    }

    /* ---------- Data Loading ---------- */
    // The following elements do not have their "values" stored and are therefore ignored
    if (field instanceof HTMLFieldSetElement) return;
    if (field instanceof HTMLOutputElement) return;
    if (field instanceof HTMLObjectElement) return;

    const storedValueString = localStorage.getItem(getFieldKey(form.name, name));
    if (!storedValueString) return; // No value was stored for this field

    const storedValue = JSON.parse(storedValueString) as unknown;

    // Checkboxes
    if (field instanceof HTMLInputElement && field.type === "checkbox") field.checked = storedValue as boolean;
    // Multi-Selects
    else if (field instanceof HTMLSelectElement && field.multiple) {
      if (!Array.isArray(storedValue)) return; // Only used for type casting

      // Loop over the `options` as long as there are stored values to read
      let brokenAt: number | undefined;
      for (let i = 0; i < field.options.length; i += 1) {
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
      for (let i = brokenAt as number; i < field.options.length; i += 1) field.options[i].selected = false;
    }
    // Other Form Fields
    else field.value = storedValue as string;
  }

  unobserve(form: HTMLFormElement): boolean {
    const newlyUnobserved = super.unobserve(form);
    if (newlyUnobserved && !this.#manual) FormStorageObserver.clear(form);
    return newlyUnobserved;
  }

  static clear(form: HTMLFormElement): void;
  static clear(form: HTMLFormElement, name: string): void;
  static clear(form: HTMLFormElement, name?: string): void {
    assertElementIsForm(form);

    // 1st Overload
    if (name) return localStorage.removeItem(getFieldKey(form.name, name));

    // 2nd Overload
    for (let i = 0; i < form.elements.length; i += 1) {
      const field = form.elements[i] as FormField;
      if (field.name) localStorage.removeItem(getFieldKey(form.name, field.name));
    }
  }
};

/* -------------------- Utility Functions -------------------- */
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

  // Multi-Selects
  if (field instanceof HTMLSelectElement && field.multiple) {
    const values = Array.from(field.selectedOptions).map((option) => option.value);
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
