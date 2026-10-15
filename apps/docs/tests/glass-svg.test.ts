import { expect, test } from "bun:test";

test("native SVG filters share geometry maps and release their DOM definitions", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/glass-svg.ts", import.meta.url).pathname,
    ],
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "Native SVG filter definitions, geometry cache and lifecycle passed",
  );
});
