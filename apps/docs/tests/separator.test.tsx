import { expect, test } from "bun:test";
import { FieldSeparator } from "@workspace/ui/components/field";
import { GlassSurface } from "@workspace/ui/components/glass";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/resizable";
import { Separator } from "@workspace/ui/components/separator";
import { Window } from "happy-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { compiledStylesheet, declaredValues } from "./support/css";

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
  const css = compiledStylesheet("components/glass.css");
  const document = render(
    renderToStaticMarkup(
      <>
        <Separator id="plain" />
        <GlassSurface>
          <Separator id="glass" />
          <FieldSeparator>Or</FieldSeparator>
          <ResizablePanelGroup>
            <ResizablePanel />
            <ResizableHandle id="handle" />
            <ResizablePanel />
          </ResizablePanelGroup>
        </GlassSurface>
      </>,
    ),
  );
  const line = (element: Parameters<typeof declaredValues>[1] | null) => {
    if (!element) throw new Error("Expected a separator");
    return declaredValues(css, element, "background-color");
  };
  const translucent = [
    "color-mix(in srgb, var(--foreground) 12%, transparent)",
  ];
  expect(line(document.getElementById("glass"))).toEqual(translucent);
  expect(line(document.querySelector('[data-slot="separator-line"]'))).toEqual(
    translucent,
  );
  // Outside glass the theme's border color stays, and resize handles keep theirs.
  expect(line(document.getElementById("plain"))).toEqual([]);
  expect(line(document.getElementById("handle"))).toEqual([]);
});
