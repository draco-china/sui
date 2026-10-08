import { expect, test } from "bun:test";

test("ImageViewer DOM handles controlled galleries, image feedback, gestures and cleanup", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/image-viewer-runtime.tsx", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "ImageViewer controlled state, loading, retry, gestures, keyboard and cleanup passed",
  );
}, 20_000);
