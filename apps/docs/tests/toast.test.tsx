import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  ToastProvider,
  ToastViewport,
  toastViewportVariants,
} from "@workspace/ui/components/toast";
import { renderToStaticMarkup } from "react-dom/server";

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
  expect(corner).toContain("sm:end-4");
  expect(toastViewportVariants({ position: "top-left" })).toContain(
    "sm:start-4",
  );
});

test("colorful toasts tint status toasts while errors always mark their icon", () => {
  const css = readFileSync(
    new URL(
      "../../../packages/ui/src/styles/components/toast.css",
      import.meta.url,
    ),
    "utf8",
  );
  for (const type of ["success", "info", "warning", "error"])
    expect(css).toContain(`&[data-type="${type}"]`);
  expect(css).toContain('[data-slot="toast-viewport"][data-colorful="true"]');
  expect(css).toContain(
    '[data-slot="toast"][data-type="error"] [data-slot="toast-icon"]',
  );
  expect(
    readFileSync(
      new URL("../../../packages/ui/src/styles/globals.css", import.meta.url),
      "utf8",
    ),
  ).toContain('@import "./components/toast.css";');
});
