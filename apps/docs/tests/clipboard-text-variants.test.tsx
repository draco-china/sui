import { expect, test } from "bun:test";
import {
  ClipboardText,
  clipboardTextVariants,
} from "@workspace/ui/components/clipboard-text";
import { Window } from "happy-dom";
import { renderToStaticMarkup } from "react-dom/server";

function root(props: Parameters<typeof ClipboardText>[0]) {
  const window = new Window();
  window.document.body.innerHTML = renderToStaticMarkup(
    <ClipboardText {...props} />,
  );
  return window.document.querySelector('[data-slot="clipboard-text"]');
}

test("ClipboardText offers shadcn-style variants", () => {
  const filled = root({ text: "bun run dev" });
  // The default follows the theme color, like shadcn/ui default variants.
  expect(filled?.getAttribute("data-variant")).toBe("default");
  expect(filled?.className).toContain("bg-primary/10");
  expect(filled?.className).toContain("text-primary");

  const outline = root({ text: "bun run dev", variant: "outline" });
  expect(outline?.getAttribute("data-variant")).toBe("outline");
  expect(outline?.className).toContain("border-border");
  expect(outline?.className).toContain("bg-transparent");
  expect(outline?.className).not.toContain("bg-input/50");

  const secondary = root({ text: "bun run dev", variant: "secondary" });
  expect(secondary?.className).toContain("bg-secondary");
  expect(secondary?.className).not.toContain("bg-primary/10");

  const ghost = root({ text: "bun run dev", variant: "ghost" });
  expect(ghost?.className).toContain("bg-transparent");
  // Ghost text aligns with surrounding content instead of field padding.
  expect(ghost?.querySelector("span[title]")?.className).toContain("ps-0");

  expect(clipboardTextVariants({ variant: "outline", size: "sm" })).toContain(
    "h-8",
  );
});

test("ClipboardText is a glass field on its own and ordinary inside glass", async () => {
  const { GlassSurface } = await import("@workspace/ui/components/glass");
  const window = new Window();
  window.document.body.innerHTML = renderToStaticMarkup(
    <>
      <ClipboardText id="glass" glass text="bun run dev" />
      <GlassSurface>
        <ClipboardText id="inside" text="bun run dev" />
      </GlassSurface>
      <ClipboardText id="plain" text="bun run dev" />
    </>,
  );
  const element = (id: string) => window.document.getElementById(id);
  expect(element("glass")?.getAttribute("data-glass")).toBe("true");
  expect(
    element("glass")?.querySelector("button")?.getAttribute("data-glass-part"),
  ).toBe("control");
  expect(element("inside")?.hasAttribute("data-glass")).toBe(false);
  expect(element("plain")?.hasAttribute("data-glass")).toBe(false);
});
