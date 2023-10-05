# Form Observer Types

These are the important types used by the `FormObserver`. (These types are also relevant for any extensions of the `FormObserver`.) This page serves as a reference for the complex types mentioned in the observer's [API](./README.md#api).

## `FormField`

```ts
type FormField =
  | HTMLButtonElement
  | HTMLFieldSetElement
  | HTMLInputElement
  | HTMLObjectElement
  | HTMLOutputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;
```

An element that belongs to an `HTMLFormElement`. See the [HTMLFormElement.elements](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements) property for more details.

## `EventType`

```ts
type EventType = keyof DocumentEventMap;
```

The union of strings representing all [natively supported event types](https://developer.mozilla.org/en-US/docs/Web/Events).

### Primary Uses

- The [`FormObserver`'s constructor](./README.md#constructor-formobservertypes-listeners-options)
- The [`FormStorageObserver`'s constructor](../form-storage-observer/README.md#constructor-formstorageobservertypes-options)
- The [`FormValidityObserver`'s constructor](../form-validity-observer/README.md#constructor-formvalidityobservertypes-options)

## `FormFieldEvent<T extends `[`EventType`](#eventtype)>

```ts
type FormFieldEvent<T extends EventType> = DocumentEventMap[T] & { target: FormField };
```

An event that originates from a [form control](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements). Because the event is assumed to originate from a form control, the [target](https://developer.mozilla.org/en-US/docs/Web/API/Event/target) property is given the type [`FormField`](#formfield). Additionally, the event interface is inferred from the string `T`.

**Example**

```ts
type Event1 = FormFieldEvent<"input">; // InputEvent & { target: FormField }
type Event2 = FormFieldEvent<"click">; // MouseEvent & { target: FormField }
type Event3 = FormFieldEvent<"close">; // Event & { target: FormField }
```

## `FormFieldListener<T extends `[`EventType`](#eventtype)>

```ts
type FormFieldListener<T extends EventType> = (event: FormFieldEvent<T>) => unknown;
```

An event handler that responds to events emitted from [form controls](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements).

### Primary Uses

- The [`FormObserver`'s constructor](./README.md#constructor-formobservertypes-listeners-options)

## `ListenerOptions`

```ts
type ListenerOptions = Parameters<typeof document.addEventListener>[2];
```

The event listener options supported by [addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener).

### Primary Uses

- The [`FormObserver`'s constructor](./README.md#constructor-formobservertypes-listeners-options)

## `TypesToListeners<A extends ReadonlyArray<`[EventType](#eventtype)`>>`

```ts
type TypesToListeners<A extends ReadonlyArray<EventType>> = A extends infer U extends ReadonlyArray<EventType>
  ? { [I in keyof U]: FormFieldListener<U[I]> }
  : never;
```

A convenience type intended to map an array of [`EventType`s](#eventtype) to an array of [`FormFieldListener`s](#formfieldlistenert-extends-eventtype).

### Primary Uses

- The [`FormObserver`'s constructor](./README.md#constructor-formobservertypes-listeners-options)
