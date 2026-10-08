import { expect, test } from "bun:test";

test("glass managers share snapshots with all glass modules excluded", () => {
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
}, 30000);
