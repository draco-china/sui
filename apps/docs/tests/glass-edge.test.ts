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

test("glass SVG keeps beveled reflections continuous with restrained sides", () => {
  const source = svg(0.3);
  expect(source).toContain('clip-path="url(#inside)"');
  expect(source).toContain('mask="url(#bevel)"');
  expect(source).toContain("feSpecularLighting");
  expect(source).not.toContain('stop-color="black"');
  expect(source).not.toContain("shadow0");
  expect(source).not.toContain("shadow1");
  const stops = [...source.matchAll(/stop-opacity="([^"]+)"/g)].map(
    ([, opacity]) => Number(opacity),
  );
  expect(stops[0]).toBeGreaterThan(stops[2]);
  expect(stops.at(-1)).toBeGreaterThan(stops[3]);
  expect(stops[2]).toBeGreaterThan(0);
  expect(source).not.toContain("radialGradient");
  expect(glassEdge(240, 80, ["40px", "40px", "40px", "40px"], 0)).toBe("none");
});

test("small controls use a proportionally thinner optical bevel than large panels", () => {
  function bevel(width: number, height: number) {
    const source = decodeURIComponent(
      glassEdge(width, height, ["50%", "50%", "50%", "50%"], 0.3),
    );
    return Number(source.match(/stroke-width="([^"]+)"/)?.[1]);
  }
  expect(bevel(24, 24)).toBeCloseTo(1.08);
  expect(bevel(40, 40)).toBeCloseTo(1.8);
  expect(bevel(400, 180)).toBe(2.5);
  expect(bevel(100, 20)).toBeCloseTo(0.9);
});

test("outer glass shading has no component rings or focus decorations", () => {
  const css = readFileSync(
    new URL(
      "../../../packages/ui/src/styles/components/glass.css",
      import.meta.url,
    ),
    "utf8",
  );
  const outer = glassShadow(0.3);
  expect(outer).not.toContain("inset");
  const shadows = [...outer.matchAll(/rgb\(0 0 0 \/ ([^)]+)\)/g)].map(
    ([, opacity]) => Number(opacity),
  );
  expect(shadows).toHaveLength(2);
  expect(shadows[1]).toBeGreaterThan(0);
  expect(shadows[1]).toBeLessThan(shadows[0]);
  for (const shadow of outer.split(", ")) expect(css).toContain(shadow);
  expect(css).not.toMatch(/inset[^;\n]*rgb\(0 0 0/);
  for (const shadow of ["inset-shadow", "shadow"])
    expect(css).toContain(`var(--tw-${shadow},`);
  for (const shadow of [
    "inset-ring-shadow",
    "ring-offset-shadow",
    "ring-shadow",
  ])
    expect(css).toContain(`--tw-${shadow}: 0 0 #0000;`);
  expect(css).not.toContain("--glass-focus-shadow");
  expect(css).toContain("outline: none;");
  expect(glassShadow(0)).toBe("0 0 #0000");
  expect(glassShadow(-1)).toBe("0 0 #0000");
  expect(glassShadow(0.6)).not.toBe(outer);
});
