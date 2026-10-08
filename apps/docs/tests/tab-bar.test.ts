import { expect, test } from "bun:test";

test("Tab Bar preserves navigation semantics through floating press interaction", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/tab-bar-dom.tsx", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "keyboard and cleanup passed",
  );
}, 10000);
