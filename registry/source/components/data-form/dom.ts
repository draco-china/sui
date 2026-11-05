/** The id of a form's `<form>` element. */
export function formElementId(form: { readonly id: string }) {
  return `${form.id}-form`;
}

/** Element ids for a field, unique per form instance. */
export function fieldIds(form: { readonly id: string }, name: string) {
  const base = `${form.id}-${name.replace(/[^\w-]/g, "-")}`;
  return {
    control: base,
    label: `${base}-label`,
    description: `${base}-description`,
    error: `${base}-error`,
  };
}

/** Runs after React has rendered and the browser has laid the page out. */
export function nextFrame(callback: () => void) {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => window.requestAnimationFrame(callback));
}

/** Moves focus to the first visible invalid control of a form. */
export function focusFirstError(form: { readonly id: string }) {
  nextFrame(() => {
    const root = document.getElementById(formElementId(form));
    const target = [
      ...(root?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? []),
    ].find((element) => element.getClientRects().length > 0);
    if (!target) return;
    target.focus({ preventScroll: true });
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    target.scrollIntoView({
      block: "center",
      behavior: reduced ? "auto" : "smooth",
    });
  });
}
