import { describe, expect, test } from "bun:test";
import {
  glassCaptureRatio,
  glassMediaBounds,
} from "../../../packages/ui/src/lib/glass/capture-media";
import {
  glassBevelWidth,
  glassRefractionProfile,
  glassRefractionStrength,
} from "../../../packages/ui/src/lib/glass/refraction";
import type { GlassFrame } from "../../../packages/ui/src/lib/glass/renderer";
import {
  glassDisplacement,
  type SvgGlassGeometry,
} from "../../../packages/ui/src/lib/glass/svg-renderer";

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
      const bevel = glassRefractionProfile(Math.max(-corners(point), 0), 17);
      const displacement = glassRefractionStrength(22, 100, 100) * 0.45 * bevel;
      expect(
        (point.x - nx * displacement - point.x) * expected.x +
          (point.y - ny * displacement - point.y) * expected.y,
      ).toBeLessThan(0);
    }
    expect(distance({ x: 151, y: 0.7 })).toBeCloseTo(-0.7, 10);
  });
});

test("refraction keeps inward background samples ordered at high strength and on small controls", () => {
  for (const [width, height] of [
    [120, 80],
    [240, 32],
    [80, 80],
    [96, 36],
    [24, 24],
  ]) {
    const bevel = glassBevelWidth(width, height);
    for (const strength of [0, 22, 64]) {
      const frame: GlassFrame = {
        width,
        height,
        margin: 0,
        radius: [height / 2, height / 2, height / 2, height / 2],
        strength,
        blur: 6,
        tint: [0, 0, 0],
        tintOpacity: 0,
        foreground: [1, 1, 1],
      };
      const scale = glassRefractionStrength(strength, width, height);
      let previous = -Infinity;
      for (let depth = 0.5; depth <= bevel; depth += 0.25) {
        const [dx] = glassDisplacement(depth, height / 2, frame);
        const sample = depth + dx * scale;
        expect(sample).toBeGreaterThan(previous);
        previous = sample;
      }
      expect(glassDisplacement(bevel + 0.5, height / 2, frame)).toEqual([0, 0]);
    }
  }
});

test("smooth lens retains more bending across the bevel with matching GPU and SVG profiles", () => {
  const expression = shaderFunction("bevelProfile")
    .replace(/\bfn\s+/g, "function ")
    .replace(/:\s*f32/g, "")
    .replace(/\s*->\s*f32/g, "");
  const gpuProfile = new Function(
    "smoothstep",
    `${expression}; return bevelProfile;`,
  )((start: number, end: number, value: number) => {
    const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
    return t * t * (3 - 2 * t);
  }) as (depth: number, width: number) => number;
  for (const [width, height] of [
    [120, 80],
    [96, 36],
    [24, 24],
  ]) {
    const bevel = glassBevelWidth(width, height);
    for (let depth = 0; depth <= bevel + 1; depth += 0.25)
      expect(gpuProfile(depth, bevel)).toBeCloseTo(
        glassRefractionProfile(depth, bevel),
        10,
      );
    const previous = ((bevel * 22) / (bevel + 22)) * 0.45 * 0.25;
    const current =
      glassRefractionStrength(22, width, height) *
      0.45 *
      glassRefractionProfile(bevel / 2, bevel);
    expect(current).toBeGreaterThan(previous * 2.5);
    expect(glassRefractionProfile(0, bevel)).toBe(1);
    expect(glassRefractionProfile(bevel, bevel)).toBe(0);
    // Both ends flatten out smoothly rather than introducing an optical seam.
    const step = 0.001;
    expect((1 - glassRefractionProfile(step, bevel)) / step).toBeLessThan(
      0.001,
    );
    expect(glassRefractionProfile(bevel - step, bevel) / step).toBeLessThan(
      0.001,
    );
  }
});

test("square corners keep background samples ordered across the diagonal", () => {
  for (const [width, height] of [
    [407, 55],
    [407, 131],
    [24, 24],
    [1, 1],
  ]) {
    const bevel = glassBevelWidth(width, height);
    for (const strength of [0, 22, 64]) {
      const frame: SvgGlassGeometry = {
        width,
        height,
        radius: [0, 0, 0, 0],
        strength,
      };
      const scale = glassRefractionStrength(strength, width, height);
      for (const horizontal of [false, true]) {
        for (const vertical of [false, true]) {
          for (const axis of [0, 1]) {
            let previous = -Infinity;
            for (let step = 0; step <= 64; step++) {
              const depth = (bevel * step) / 64;
              const xDepth = axis === 0 ? depth : bevel / 2;
              const yDepth = axis === 1 ? depth : bevel / 2;
              const x = horizontal ? width - xDepth : xDepth;
              const y = vertical ? height - yDepth : yDepth;
              const [dx, dy] = glassDisplacement(x, y, frame);
              const samples = [x + dx * scale, y + dy * scale];
              const sample = axis === 0 ? samples[0] : samples[1];
              const ordered = (axis === 0 ? horizontal : vertical)
                ? (axis === 0 ? width : height) - sample
                : sample;
              expect(ordered).toBeGreaterThan(previous);
              expect(samples[0]).toBeGreaterThanOrEqual(0);
              expect(samples[0]).toBeLessThanOrEqual(width);
              expect(samples[1]).toBeGreaterThanOrEqual(0);
              expect(samples[1]).toBeLessThanOrEqual(height);
              previous = ordered;
            }
          }
        }
      }
    }
  }
});

test("mixed corner surfaces keep independent samples ordered at each flat corner", () => {
  for (const [width, height] of [
    [407, 55],
    [407, 131],
    [24, 24],
  ]) {
    const bevel = glassBevelWidth(width, height);
    const radius = Math.min(18, width / 2, height / 2);
    for (let corner = 0; corner < 4; corner++) {
      const radii: Corners = [radius, radius, radius, radius];
      radii[corner] = 0;
      for (const strength of [0, 22, 64]) {
        const frame: SvgGlassGeometry = {
          width,
          height,
          radius: radii,
          strength,
        };
        const scale = glassRefractionStrength(strength, width, height);
        const right = corner === 1 || corner === 2;
        const bottom = corner === 2 || corner === 3;
        for (const axis of [0, 1]) {
          let previous = -Infinity;
          for (let step = 0; step <= 64; step++) {
            const depth = (bevel * step) / 64;
            let x = axis === 0 ? depth : bevel / 2;
            let y = axis === 1 ? depth : bevel / 2;
            if (right) x = width - x;
            if (bottom) y = height - y;
            const [dx, dy] = glassDisplacement(x, y, frame);
            const sampleX = x + dx * scale;
            const sampleY = y + dy * scale;
            let ordered = sampleX;
            if (axis === 0 && right) ordered = width - sampleX;
            if (axis === 1) ordered = bottom ? height - sampleY : sampleY;
            expect(ordered).toBeGreaterThan(previous);
            expect(sampleX).toBeGreaterThanOrEqual(0);
            expect(sampleX).toBeLessThanOrEqual(width);
            expect(sampleY).toBeGreaterThanOrEqual(0);
            expect(sampleY).toBeLessThanOrEqual(height);
            previous = ordered;
          }
        }
      }
    }
  }
});

describe("shared media capture region", () => {
  function viewport<T>(width: number, height: number, read: () => T) {
    const saved = ["innerWidth", "innerHeight"].map((key) =>
      Object.getOwnPropertyDescriptor(globalThis, key),
    );
    globalThis.innerWidth = width;
    globalThis.innerHeight = height;
    try {
      return read();
    } finally {
      for (const [index, key] of ["innerWidth", "innerHeight"].entries()) {
        const descriptor = saved[index];
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    }
  }
  const request = (
    left: number,
    top: number,
    width: number,
    height: number,
  ) => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  });
  test("coalesces requested surfaces with the optical margin", () => {
    viewport(1024, 768, () => {
      expect(
        glassMediaBounds([
          request(100, 200, 100, 80),
          request(350, 420, 50, 40),
          request(2000, 2000, 100, 100),
        ]),
      ).toEqual({ left: 60, top: 160, right: 440, bottom: 500 });
      expect(glassMediaBounds([request(-10, -10, 50, 50)])).toEqual({
        left: 0,
        top: 0,
        right: 80,
        bottom: 80,
      });
      expect(glassMediaBounds([])).toBeUndefined();
      expect(glassMediaBounds([request(-200, 0, 10, 20)])).toBeUndefined();
    });
  });
  test("odd full pixel dimensions retain that Gaussian axis", () => {
    viewport(2049, 1025, () => {
      const region = glassMediaBounds([request(800, 400, 160, 100)]);
      expect(region).toBeDefined();
      const ratio = glassCaptureRatio();
      expect(region?.left).toBe(0);
      expect(Math.round((region?.right ?? 0) * ratio)).toBe(4095);
      expect(region?.top).toBeGreaterThan(0);
      expect(Math.round((region?.top ?? 0) * ratio) % 2).toBe(0);
      expect(Math.round((region?.bottom ?? 0) * ratio) % 2).toBe(0);
    });
  });
  test("both odd axes preserve full-size input under the existing pixel cap", () => {
    viewport(2100, 1200, () => {
      const region = glassMediaBounds([request(800, 400, 160, 100)]);
      const ratio = glassCaptureRatio();
      expect(region?.left).toBe(0);
      expect(region?.top).toBe(0);
      expect(Math.round((region?.right ?? 0) * ratio)).toBe(3831);
      expect(Math.round((region?.bottom ?? 0) * ratio)).toBe(2189);
    });
  });
});
