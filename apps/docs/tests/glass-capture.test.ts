import { expect, test } from "bun:test";

test("glass capture preserves viewport geometry and cleans up failed snapshots in isolation", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/glass-capture.ts", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "viewport, exclusions, scroll, font cache, taint and restoration passed",
  );
});
