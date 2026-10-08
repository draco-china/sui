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

test("production CSS preserves standard and Safari backdrop blur until an enhanced frame is ready", () => {
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
  const ready = code.match(
    /\[data-glass=true\]\[data-glass-state=ready\]\{[^}]*\}/,
  )?.[0];
  expect(ready).toMatch(/(?:^|;)backdrop-filter:none/);
  expect(ready).toContain("-webkit-backdrop-filter:none");
  expect(ready).toContain("var(--glass-frame,none)");
  const lens = code.match(
    /\[data-slot=tab-bar-indicator\]\[data-glass=true\]\{[^}]*\}/,
  )?.[0];
  expect(lens).toContain("background-color:#0000");
  expect(lens).toMatch(/(?:^|;)backdrop-filter:none/);
  expect(lens).toContain("-webkit-backdrop-filter:none");
});
