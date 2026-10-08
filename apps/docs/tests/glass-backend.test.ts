import { expect, test } from "bun:test";
import type { GlassFrame } from "../../../packages/ui/src/lib/glass/renderer";
import { glassDisplacement } from "../../../packages/ui/src/lib/glass/svg-renderer";

test("provider capability detection shares initialization and falls through three renderers", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/glass-backend.ts", import.meta.url).pathname,
    ],
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "three-tier fallback passed",
  );
});

test("SVG normals refract all four edges while leaving the center still", () => {
  const frame: GlassFrame = {
    width: 120,
    height: 80,
    margin: 0,
    radius: [16, 16, 16, 16],
    strength: 22,
    blur: 0,
    tint: [0, 0, 0],
    tintOpacity: 0,
    foreground: [1, 1, 1],
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
