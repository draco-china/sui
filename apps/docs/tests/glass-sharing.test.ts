import { expect, test } from "bun:test";

test("GPU scopes share snapshots and native SVG scopes avoid background capture", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/glass-sharing.tsx", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "shared snapshots, frame coordinates, scene invalidation and layer isolation passed",
  );
}, 45_000);

test("cropped media requests share coverage and retain source coordinates", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/glass-sharing.tsx", import.meta.url).pathname,
      "--media-region-only",
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "shared cropped regions, source offsets, coverage reuse and cleanup passed",
  );
}, 10_000);
