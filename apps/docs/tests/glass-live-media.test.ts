import { expect, test } from "bun:test";

test("mixed playing video stays native, pauses recover GPU and pure-media peers remain independent", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/glass-sharing.tsx", import.meta.url).pathname,
      "--live-media-only",
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "mixed live video, pause recovery, pure-media isolation and cleanup passed",
  );
}, 10_000);
