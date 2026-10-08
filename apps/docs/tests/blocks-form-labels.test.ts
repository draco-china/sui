import { expect, test } from "bun:test";

test("forms use English defaults and application-owned translations through validation and submission", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/blocks-form-labels.tsx", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "English defaults, external Chinese validation and feedback, reset and partial overrides passed",
  );
}, 10000);
