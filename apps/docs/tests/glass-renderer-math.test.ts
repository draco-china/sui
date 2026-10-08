import { describe, expect, test } from "bun:test";

const source = await Bun.file(
  new URL("../../../packages/ui/src/lib/glass/renderer.ts", import.meta.url),
).text();

function shaderFunction(name: string) {
  const start = source.indexOf(`fn ${name}(`);
  if (start < 0) throw new Error(`Missing production WGSL function: ${name}`);
  const opening = source.indexOf("{", start);
  let depth = 1;
  let end = opening + 1;
  while (end < source.length && depth) {
    if (source[end] === "{") depth++;
    if (source[end] === "}") depth--;
    end++;
  }
  if (depth) throw new Error(`Incomplete WGSL function: ${name}`);
  return source.slice(start, end);
}

// Evaluate the production scalar WGSL expressions, rather than a separate JS
// implementation of the clipping algorithm. Browser tests still compile WGSL.
const expressions = [
  shaderFunction("ellipseDistance"),
  shaderFunction("roundedDistance"),
]
  .join("\n")
  .replace(/\bfn\s+/g, "function ")
  .replace(/:\s*(?:vec2f|f32)/g, "")
  .replace(/\s*->\s*f32/g, "")
  .replace(/\blet\b/g, "const")
  .replace(/\bvar\b/g, "let");
const evaluate = new Function(
  "params",
  "sqrt",
  "max",
  "min",
  `${expressions}; return roundedDistance;`,
);
type Corners = [number, number, number, number];
const vector = ([x, y, z, w]: Corners) => ({ x, y, z, w });
function shape(
  width: number,
  height: number,
  radius: Corners,
  radiusY: Corners,
) {
  return evaluate(
    {
      surface: { x: width, y: height },
      radii: vector(radius),
      verticalRadii: vector(radiusY),
    },
    Math.sqrt,
    Math.max,
    Math.min,
  ) as (p: { x: number; y: number }) => number;
}
function reflect(
  values: Corners,
  horizontal: boolean,
  vertical: boolean,
): Corners {
  let result = values;
  if (horizontal) result = [result[1], result[0], result[3], result[2]];
  if (vertical) result = [result[3], result[2], result[1], result[0]];
  return result;
}

describe("production WGSL rounded boundary expressions", () => {
  const width = 300;
  const height = 64;
  const rx: Corners = [200, 100, 25, 50];
  const ry: Corners = [32, 64 / 6, 16, 80 / 3];
  for (const [horizontal, vertical, name] of [
    [false, false, "top left"],
    [true, false, "top right"],
    [true, true, "bottom right"],
    [false, true, "bottom left"],
  ] as const) {
    test(`${name} ellipse crossing the center uses its real corner region`, () => {
      const distance = shape(
        width,
        height,
        reflect(rx, horizontal, vertical),
        reflect(ry, horizontal, vertical),
      );
      const point = (x: number, y: number) => ({
        x: horizontal ? width - x : x,
        y: vertical ? height - y : y,
      });
      const boundaryY = 32 * (1 - Math.sqrt(1 - ((151 - 200) / 200) ** 2));
      expect(distance(point(151, 0.7))).toBeGreaterThan(0);
      expect(distance(point(151, boundaryY))).toBeCloseTo(0, 10);
      expect(distance(point(151, 4))).toBeLessThan(0);
      expect(distance(point(180, 4))).toBeLessThan(0);
      expect(distance(point(199.9999, 31.9999))).toBeLessThan(-17);
    });
  }
  test("symmetric 50% radii form the complete ellipse and keep the center inside", () => {
    const distance = shape(
      width,
      height,
      [150, 150, 150, 150],
      [32, 32, 32, 32],
    );
    for (const x of [1, 25, 75, 125, 150, 175, 225, 275, 299]) {
      const top = 32 * (1 - Math.sqrt(1 - ((x - 150) / 150) ** 2));
      expect(distance({ x, y: top })).toBeCloseTo(0, 10);
      expect(distance({ x, y: top - 0.1 })).toBeGreaterThan(0);
      expect(distance({ x, y: top + 0.1 })).toBeLessThan(0);
      expect(distance({ x, y: height - top })).toBeCloseTo(0, 10);
    }
    expect(distance({ x: 150, y: 32 })).toBe(-32);
  });
  test("flat edges retain outward normals and sample the inward background on all four sides", () => {
    const distance = shape(width, height, [32, 32, 32, 32], [32, 32, 32, 32]);
    const corners = shape(100, 100, [12, 12, 12, 12], [12, 12, 12, 12]);
    for (const [point, expected] of [
      [
        { x: 1, y: 50 },
        { x: -1, y: 0 },
      ],
      [
        { x: 99, y: 50 },
        { x: 1, y: 0 },
      ],
      [
        { x: 50, y: 1 },
        { x: 0, y: -1 },
      ],
      [
        { x: 50, y: 99 },
        { x: 0, y: 1 },
      ],
    ]) {
      const gx =
        corners({ x: point.x + 0.4, y: point.y }) -
        corners({ x: point.x - 0.4, y: point.y }) +
        0.00001;
      const gy =
        corners({ x: point.x, y: point.y + 0.4 }) -
        corners({ x: point.x, y: point.y - 0.4 }) +
        0.00001;
      const length = Math.hypot(gx, gy);
      const nx = gx / length;
      const ny = gy / length;
      expect(nx).toBeCloseTo(expected.x, 4);
      expect(ny).toBeCloseTo(expected.y, 4);
      const bevel = (1 - Math.max(-corners(point), 0) / 17) ** 2;
      const displacement = 22 * 0.45 * bevel;
      expect(
        (point.x - nx * displacement - point.x) * expected.x +
          (point.y - ny * displacement - point.y) * expected.y,
      ).toBeLessThan(0);
    }
    expect(distance({ x: 151, y: 0.7 })).toBeCloseTo(-0.7, 10);
  });
});
