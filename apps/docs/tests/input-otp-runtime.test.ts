import { expect, test } from "bun:test";

test("Base UI OTP preserves native semantics and completes success and error feedback loops", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/input-otp-runtime.tsx", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "Base UI OTP inputs, paste, validation, refs, feedback loop, focus and cleanup passed",
  );
}, 20_000);
