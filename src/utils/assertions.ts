/*
 * NOTE: This file is for common assertions only. If an assertion is only used by a single class/file,
 * then _keep it local to that class/file_.
 */

// eslint-disable-next-line import/prefer-default-export -- TODO: Remove this comment when more assertions are added.
export function assertElementIsForm(element: Element): asserts element is HTMLFormElement {
  if (element instanceof HTMLFormElement) return;
  throw new TypeError(`Expected argument to be an instance of \`HTMLFormElement\`. Instead, received \`${element}\`.`);
}
