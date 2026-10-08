import { expect, test } from "bun:test";

test("DataTable state and remote pagination remain stable in isolation", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/data-table-dom.tsx", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "DataTable initial state, callback stability, request retry and unknown totals passed",
  );
});
