import { expect, test } from "bun:test";

test("copy icons morph actual paths and preserve clipboard and docs lifecycle semantics", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/copy-motion-runtime.tsx", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "Copy SVG morphs, clipboard integration, Markdown fetching and cleanup passed",
  );
}, 20_000);
