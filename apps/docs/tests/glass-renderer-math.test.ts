import { describe, expect, test } from "bun:test";
import {
  glassBevelWidth,
  glassRefractionProfile,
  glassRefractionStrength,
} from "../../../packages/ui/src/lib/glass/refraction";
import {
  glassDisplacement,
  glassEdgeDensity,
  glassRoundedDistance,
  type SvgGlassGeometry,
} from "../../../packages/ui/src/lib/glass/svg-renderer";

type Corners = [number, number, number, number];
function shape(
  width: number,
  height: number,
  radius: Corners,
  radiusY: Corners,
) {
  const frame = { width, height, radius, radiusY, strength: 0 };
  return (p: { x: number; y: number }) => glassRoundedDistance(p.x, p.y, frame);
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

describe("rounded boundary distance", () => {
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
      const frame: SvgGlassGeometry = {
        width,
        height,
        radius: [height / 2, height / 2, height / 2, height / 2],
        strength,
        blur: 6,
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

test("smooth lens retains more bending across the bevel", () => {
  for (const [width, height] of [
    [120, 80],
    [96, 36],
    [24, 24],
  ]) {
    const bevel = glassBevelWidth(width, height);
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

test("low-density screens keep less of the aliasing sharp edge layer", () => {
  expect(glassEdgeDensity(1)).toBe(0.4);
  expect(glassEdgeDensity(1.5)).toBe(0.4);
  expect(glassEdgeDensity(2)).toBe(1);
  expect(glassEdgeDensity(3)).toBe(1);
  expect(glassEdgeDensity()).toBe(0.4);
});
