import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  glassEdge,
  glassShadow,
} from "../../../packages/ui/src/lib/glass/edge";

function svg(highlight: number) {
  const image = glassEdge(240, 80, ["40px", "40px", "40px", "40px"], highlight);
  return decodeURIComponent(image.slice(image.indexOf(",") + 1, -2));
}

test("glass SVG preserves opposite highlights without an inner dark outline", () => {
  const source = svg(0.3);
  expect(source.match(/<path\b/g)).toHaveLength(2);
  expect(source).toContain('stroke="url(#light0)"');
  expect(source).toContain('stroke="url(#light1)"');
  expect(source).not.toContain('stop-color="black"');
  expect(source).not.toContain("shadow0");
  expect(source).not.toContain("shadow1");
  const lights = [
    ...source.matchAll(/gradientTransform="translate\(([^ ]+) ([^)]+)\)/g),
  ].map(([, x, y]) => [Number(x), Number(y)]);
  expect(lights).toHaveLength(2);
  expect(lights[0][0] + lights[1][0]).toBeCloseTo(240);
  expect(lights[0][1] + lights[1][1]).toBeCloseTo(80);
  expect(glassEdge(240, 80, ["40px", "40px", "40px", "40px"], 0)).toBe("none");
});

test("outer glass shading matches initial CSS, composes with focus rings, and obeys disabled highlights", () => {
  const css = readFileSync(
    new URL(
      "../../../packages/ui/src/styles/components/glass.css",
      import.meta.url,
    ),
    "utf8",
  );
  const outer = glassShadow(0.3);
  expect(outer).not.toContain("inset");
  for (const shadow of outer.split(", ")) expect(css).toContain(shadow);
  expect(css).not.toMatch(/inset[^;\n]*rgb\(0 0 0/);
  for (const shadow of [
    "inset-shadow",
    "inset-ring-shadow",
    "ring-offset-shadow",
    "ring-shadow",
    "shadow",
  ])
    expect(css).toContain(`var(--tw-${shadow},`);
  expect(glassShadow(0)).toBe("0 0 #0000");
  expect(glassShadow(-1)).toBe("0 0 #0000");
  expect(glassShadow(0.6)).not.toBe(outer);
});
