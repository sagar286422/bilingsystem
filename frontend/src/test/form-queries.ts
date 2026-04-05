/**
 * Stable input lookups for Formik + shadcn fields (avoids ambiguous label regexes).
 */
export function inputIn(container: Element, id: string): HTMLInputElement {
  const el = container.querySelector(`#${CSS.escape(id)}`);
  if (!el || !(el instanceof HTMLInputElement)) {
    throw new Error(`missing input#${id}`);
  }
  return el;
}
