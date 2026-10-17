import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  ToastProvider,
  ToastViewport,
  toastViewportVariants,
} from "@workspace/ui/components/toast";
import { Window } from "happy-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { compiledStylesheet, declaredValues } from "./support/css";

const viewport = (props: Parameters<typeof ToastViewport>[0] = {}) =>
  renderToStaticMarkup(
    <ToastProvider>
      <ToastViewport {...props} />
    </ToastProvider>,
  );

test("toasts appear top center and colorful by default", () => {
  const html = viewport();
  expect(html).toContain('data-toast-side="top"');
  expect(html).toContain('data-colorful="true"');
  expect(toastViewportVariants()).toContain("top-4");
  expect(toastViewportVariants()).not.toContain("bottom-4");
});

test("other positions anchor to their edge and corner", () => {
  expect(viewport({ position: "bottom-right" })).toContain(
    'data-toast-side="bottom"',
  );
  expect(viewport({ colorful: false })).toContain('data-colorful="false"');
  const corner = toastViewportVariants({ position: "bottom-right" });
  expect(corner).toContain("bottom-4");
  expect(corner).toContain("sm:inset-e-4");
  expect(toastViewportVariants({ position: "top-left" })).toContain(
    "sm:inset-s-4",
  );
});

test("colorful toasts tint status toasts while errors always mark their icon", () => {
  const css = compiledStylesheet("components/toast.css");
  const { document } = new Window();
  const toast = (type: string) =>
    `<div data-slot="toast" data-type="${type}"><span data-slot="toast-icon"></span></div>`;
  const types = ["success", "info", "warning", "error"];
  document.body.innerHTML = `
    <div data-slot="toast-viewport" data-colorful="true" id="colorful">${types.map(toast).join("")}</div>
    <div data-slot="toast-viewport" data-colorful="false" id="quiet">${types.map(toast).join("")}</div>`;
  const declared = (selector: string, property: string) => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`Missing ${selector}`);
    return declaredValues(css, element, property);
  };
  for (const type of types) {
    const colorful = `#colorful [data-type="${type}"]`;
    const quiet = `#quiet [data-type="${type}"]`;
    expect(declared(colorful, "--toast-accent")).toHaveLength(1);
    expect(declared(colorful, "background-color")[0]).toContain(
      "var(--toast-accent) 12%",
    );
    expect(
      declared(`${colorful} [data-slot="toast-icon"]`, "color"),
    ).not.toEqual([]);
    expect(declared(quiet, "background-color")).toEqual([]);
    // Without color, only an error's icon still takes its status color.
    expect(declared(`${quiet} [data-slot="toast-icon"]`, "color")).toEqual(
      type === "error" ? ["var(--toast-accent)"] : [],
    );
  }
  expect(
    readFileSync(
      new URL("../../../packages/ui/src/styles/globals.css", import.meta.url),
      "utf8",
    ),
  ).toMatch(/@import\s+["']\.\/components\/toast\.css["']/);
});
