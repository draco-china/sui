import { expect, test } from "bun:test";

test("theme and locale SVG paths morph, handle pending navigation and hydrate consistently", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/toggle-motion-runtime.tsx", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "Toggle morph geometry, async callbacks, reduced motion and hydration passed",
  );
});
