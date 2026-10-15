import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { FieldSeparator } from "@workspace/ui/components/field";
import { Separator } from "@workspace/ui/components/separator";
import { Window } from "happy-dom";
import { renderToStaticMarkup } from "react-dom/server";

function render(html: string) {
  const window = new Window();
  window.document.body.innerHTML = html;
  return window.document;
}

test("a separator with text places it between two lines without a background patch", () => {
  const document = render(
    renderToStaticMarkup(<Separator>Or continue with</Separator>),
  );
  const wrapper = document.querySelector('[data-slot="separator"]');
  expect(wrapper?.hasAttribute("data-content")).toBe(true);
  expect(
    document.querySelectorAll('[data-slot="separator-line"]'),
  ).toHaveLength(2);
  // One line carries the separator role; the text stays readable content.
  expect(document.querySelectorAll('[role="separator"]')).toHaveLength(1);
  const content = document.querySelector('[data-slot="separator-content"]');
  expect(content?.textContent).toBe("Or continue with");
  expect(content?.closest('[role="separator"]')).toBeNull();
  expect(wrapper?.outerHTML).not.toContain("bg-background");
});

test("vertical separator text runs vertically", () => {
  const document = render(
    renderToStaticMarkup(<Separator orientation="vertical">或者</Separator>),
  );
  expect(
    document.querySelector('[data-slot="separator-content"]')?.className,
  ).toContain("[writing-mode:vertical-rl]");
  expect(
    document
      .querySelector('[data-slot="separator"]')
      ?.getAttribute("data-orientation"),
  ).toBe("vertical");
  // Without children it stays a single line.
  const line = render(renderToStaticMarkup(<Separator />));
  expect(
    line.querySelector('[data-slot="separator"]')?.getAttribute("role"),
  ).toBe("separator");
});

test("FieldSeparator text no longer masks the line with the page background", () => {
  const html = renderToStaticMarkup(<FieldSeparator>Or</FieldSeparator>);
  expect(html).toContain('data-slot="field-separator-content"');
  expect(html).toContain('data-slot="separator-line"');
  expect(html).not.toContain("bg-background");
});

test("separators inside glass use a translucent foreground line", () => {
  const css = readFileSync(
    new URL(
      "../../../packages/ui/src/styles/components/glass.css",
      import.meta.url,
    ),
    "utf8",
  );
  expect(css).toMatch(
    /:is\(\[role="separator"\], \[data-slot="separator-line"\]\):not\(\s*\[data-slot="resizable-handle"\]\s*\) \{\s*background-color: color-mix\(in srgb, var\(--foreground\) 12%, transparent\);/,
  );
});
