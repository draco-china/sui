import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  glassEdge,
  glassHighlight,
  glassShadow,
} from "../../../packages/ui/src/lib/glass/edge";

const decode = (image: string) =>
  decodeURIComponent(image.slice(image.indexOf(",") + 1, -2));

function lights(style?: "diagonal" | "vertical") {
  const source = decode(
    glassEdge(240, 80, ["40px", "40px", "40px", "40px"], {
      highlight: 0.3,
      style,
    }),
  );
  return [
    ...source.matchAll(/gradientTransform="translate\(([^ ]+) ([^)]+)\)/g),
  ].map(([, x, y]) => [Number(x), Number(y)]);
}

test("diagonal light is the default 1.1 rim lit on the top-left and bottom-right arcs", () => {
  const arc = 40 * (1 - Math.SQRT1_2);
  const [first, second] = lights();
  expect(first[0]).toBeCloseTo(arc);
  expect(first[1]).toBeCloseTo(arc);
  expect(second[0]).toBeCloseTo(240 - arc);
  expect(second[1]).toBeCloseTo(80 - arc);
  expect(lights("diagonal")).toEqual(lights());
  const source = decode(
    glassEdge(240, 80, ["40px", "40px", "40px", "40px"], { highlight: 0.3 }),
  );
  expect(source).not.toContain("feSpecularLighting");
  // The 1.1 falloff fades along the sides instead of drawing a border.
  expect(
    [...source.matchAll(/stop-opacity="([^"]+)"/g)]
      .slice(0, 4)
      .map(([, opacity]) => Number(opacity)),
  ).toEqual([0.85, 0.36, 0.06, 0]);
  const strokes = [...source.matchAll(/ opacity="([^"]+)"/g)].map(
    ([, opacity]) => Number(opacity),
  );
  expect(strokes[1]).toBeCloseTo(strokes[0] * 0.7);
  expect(
    glassEdge(240, 80, ["40px", "40px", "40px", "40px"], { highlight: 0 }),
  ).toBe("none");
});

test("square and elliptical corners keep the light on their own arc", () => {
  const position = (radii: [string, string, string, string]) =>
    [
      ...decode(glassEdge(100, 50, radii, { highlight: 0.3 })).matchAll(
        /translate\(([^ ]+) ([^)]+)\)/g,
      ),
    ].map(([, x, y]) => [Number(x), Number(y)]);
  expect(position(["0px", "0px", "0px", "0px"])).toEqual([
    [0, 0],
    [100, 50],
  ]);
  const [ellipse] = position(["40px 20px", "0px", "0px", "0px"]);
  expect(ellipse[0]).toBeCloseTo(40 * (1 - Math.SQRT1_2));
  expect(ellipse[1]).toBeCloseTo(20 * (1 - Math.SQRT1_2));
});

test("the 1.1 stroke narrows continuously on denser screens", () => {
  function line(pixelRatio: number) {
    const source = decode(
      glassEdge(120, 40, ["20px", "20px", "20px", "20px"], {
        highlight: 0.3,
        pixelRatio,
      }),
    );
    return Number(source.match(/stroke-width="([^"]+)"/)?.[1]);
  }
  expect(line(1)).toBe(0.9);
  expect(line(2)).toBe(0.9);
  expect(line(2.5)).toBeCloseTo(0.72);
  expect(line(3)).toBeCloseTo(0.6);
});

test("the diagonal rim follows the foreground and the continuous density strength", () => {
  const source = (color: number[], pixelRatio: number) =>
    decode(
      glassEdge(120, 40, ["20px", "20px", "20px", "20px"], {
        highlight: glassHighlight(pixelRatio),
        color,
        pixelRatio,
      }),
    );
  // As in 1.1: white over dark themes, a soft light gray over light ones.
  expect(source([1, 1, 1], 2)).toContain("rgb(255 255 255)");
  expect(source([0, 0, 0], 2)).toContain("rgb(204 204 204)");
  const strength = (pixelRatio: number) =>
    Number(source([1, 1, 1], pixelRatio).match(/ opacity="([^"]+)"/)?.[1]);
  expect(strength(1)).toBeCloseTo(0.3);
  expect(strength(1.5)).toBeCloseTo(0.45);
  expect(strength(2)).toBeCloseTo(0.6);
  expect(strength(3)).toBeCloseTo(0.6);
});

function vertical(
  width: number,
  height: number,
  radii: [string, string, string, string],
  pixelRatio = 2,
) {
  return decode(
    glassEdge(width, height, radii, {
      highlight: 0.3,
      style: "vertical",
      pixelRatio,
    }),
  );
}

test("vertical light is the 1.3 bevel lit from the top and bottom", () => {
  const source = vertical(240, 80, ["40px", "40px", "40px", "40px"]);
  expect(source).toContain('clip-path="url(#inside)"');
  expect(source).toContain('mask="url(#bevel)"');
  expect(source).toContain("feSpecularLighting");
  expect(source).not.toContain("radialGradient");
  expect([...source.matchAll(/azimuth="([^"]+)"/g)].map(([, a]) => a)).toEqual([
    "270",
    "90",
  ]);
  // Reflections stay continuous, with restrained sides.
  const stops = [...source.matchAll(/stop-opacity="([^"]+)"/g)].map(
    ([, opacity]) => Number(opacity),
  );
  expect(stops[0]).toBeGreaterThan(stops[2]);
  expect(stops.at(-1)).toBeGreaterThan(stops[3]);
  expect(stops[2]).toBeGreaterThan(0);
});

test("the vertical bevel narrows on small controls and keeps one device pixel at 1x", () => {
  const bevel = (width: number, height: number) =>
    Number(
      vertical(width, height, ["50%", "50%", "50%", "50%"]).match(
        /stroke-width="([^"]+)"/,
      )?.[1],
    );
  // Tiny surfaces such as pressed thumbs keep a 1.25px rim.
  expect(bevel(24, 24)).toBeCloseTo(1.25);
  expect(bevel(40, 40)).toBeCloseTo(1.8);
  expect(bevel(400, 180)).toBe(2.5);
  const softness = (pixelRatio: number) =>
    Number(
      vertical(24, 24, ["12px", "12px", "12px", "12px"], pixelRatio).match(
        /SourceAlpha" stdDeviation="([^"]+)"/,
      )?.[1],
    );
  expect(softness(1)).toBeCloseTo(0.6);
  expect(softness(2)).toBeCloseTo(1.25 * 0.46);
  // Larger controls keep the 1.3 bevel exactly.
  const regular = vertical(120, 40, ["20px", "20px", "20px", "20px"], 1);
  expect(regular).toContain('stdDeviation="0.828"');
  expect(regular).toContain('surfaceScale="2.016"');
});

test("outer glass shading has no component rings or focus decorations", () => {
  const css = readFileSync(
    new URL(
      "../../../packages/ui/src/styles/components/glass.css",
      import.meta.url,
    ),
    "utf8",
  );
  const outer = glassShadow();
  expect(outer).not.toContain("inset");
  const shadows = [...outer.matchAll(/rgb\(0 0 0 \/ ([^)]+)\)/g)].map(
    ([, opacity]) => Number(opacity),
  );
  expect(shadows).toHaveLength(1);
  expect(shadows[0]).toBeGreaterThan(0);
  expect(outer).toStartWith("0 1px 3px -1px ");
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
  expect(glassShadow([0, 0, 0])).not.toBe(outer);
});

test("edge highlight strength is built in and follows pixel density", () => {
  expect(glassHighlight(1)).toBeCloseTo(0.15);
  expect(glassHighlight(1.5)).toBeCloseTo(0.225);
  expect(glassHighlight(2)).toBeCloseTo(0.3);
  expect(glassHighlight(3)).toBeCloseTo(0.3);
  expect(glassHighlight(0.5)).toBeCloseTo(0.15);
  expect(glassHighlight()).toBeCloseTo(0.15);
});
