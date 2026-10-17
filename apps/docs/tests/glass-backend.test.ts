import { expect, test } from "bun:test";
import {
  glassDisplacement,
  type SvgGlassGeometry,
} from "../../../packages/ui/src/lib/glass/svg-renderer";
import { describeFixture } from "./support/fixture";

describeFixture(
  "The shared SVG renderer initializes once and falls back to CSS",
  "glass-backend.ts",
);

test("SVG normals refract all four edges while leaving the center still", () => {
  const frame: SvgGlassGeometry = {
    width: 120,
    height: 80,
    radius: [16, 16, 16, 16],
    strength: 22,
    blur: 0,
  };
  expect(glassDisplacement(2, 40, frame)[0]).toBeGreaterThan(0.3);
  expect(glassDisplacement(118, 40, frame)[0]).toBeLessThan(-0.3);
  expect(glassDisplacement(60, 2, frame)[1]).toBeGreaterThan(0.3);
  expect(glassDisplacement(60, 78, frame)[1]).toBeLessThan(-0.3);
  expect(glassDisplacement(60, 40, frame)).toEqual([0, 0]);
  const corner = glassDisplacement(5, 5, frame);
  expect(corner[0]).toBeGreaterThan(0);
  expect(corner[1]).toBeGreaterThan(0);
  expect(corner[0]).toBeCloseTo(corner[1], 5);
});
