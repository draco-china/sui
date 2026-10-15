import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";

const tailwindPlugin = Bun.resolveSync(
  "@tailwindcss/vite",
  new URL("../src", import.meta.url).pathname,
);
const { optimize } = await import(
  Bun.resolveSync("@tailwindcss/node", dirname(tailwindPlugin))
);

test("production CSS keeps fallback blur and separates live SVG from GPU frames", () => {
  const source = readFileSync(
    new URL(
      "../../../packages/ui/src/styles/components/glass.css",
      import.meta.url,
    ),
    "utf8",
  );
  const { code } = optimize(source, { minify: true });
  const material = code.match(
    /\[data-glass=true\]\[data-glass-state\]\{[^}]*background-image[^}]*\}/,
  )?.[0];
  expect(material).toBeDefined();
  expect(material).toMatch(/(?:^|;)backdrop-filter:blur\(/);
  expect(material).toContain("-webkit-backdrop-filter:blur(");
  expect(material).toContain("background-image:var(--glass-edge,none)");
  expect(material).not.toContain("var(--glass-frame");
  const ready: string[] =
    code.match(/[^{}]*\[data-glass-state=ready\][^{}]*\{[^}]*\}/g) ?? [];
  const gpu = ready.find((rule) => rule.includes("[data-glass-renderer=vgpu]"));
  expect(gpu).toMatch(/(?:^|;)backdrop-filter:none/);
  expect(gpu).toContain("-webkit-backdrop-filter:none");
  expect(gpu).toContain("var(--glass-frame,none)");
  const svg = ready.find((rule) => rule.includes("[data-glass-renderer=svg]"));
  expect(svg).toContain("backdrop-filter:var(--glass-filter)");
  expect(svg).toContain("-webkit-backdrop-filter:var(--glass-filter)");
  expect(svg).not.toContain("var(--glass-frame");
  expect(svg).toContain(":where(");
  const lens = code.match(
    /\[data-slot=tab-bar-indicator\]\[data-glass=true\]\{[^}]*\}/,
  )?.[0];
  expect(lens).toContain("background-color:#0000");
  expect(lens).toMatch(/(?:^|;)backdrop-filter:none/);
  expect(lens).toContain("-webkit-backdrop-filter:none");
});
