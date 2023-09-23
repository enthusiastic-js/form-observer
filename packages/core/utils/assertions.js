/*
 * NOTE: This file is for common assertions only. If an assertion is only used by a single class/file,
 * then _keep it local to that class/file_.
 */

/**
 * @param {Element} element
 * @returns {asserts element is HTMLFormElement}
 */
export function assertElementIsForm(element) {
  if (element instanceof HTMLFormElement) return;
  throw new TypeError(`Expected argument to be an instance of \`HTMLFormElement\`. Instead, received \`${element}\`.`);
}
