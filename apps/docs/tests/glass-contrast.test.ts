import { expect, test } from "bun:test";

test("glass contrast uses owned text and placeholders without rescanning unchanged frames", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/glass-contrast.ts", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "Owned glass text, placeholder colors, cached styles and contrast constraints passed",
  );
});
