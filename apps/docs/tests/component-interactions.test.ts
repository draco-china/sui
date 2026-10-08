import { expect, test } from "bun:test";

test("review regressions preserve focus, state, keyboard behavior and table contracts", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/component-interactions.tsx", import.meta.url)
        .pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "Component interaction regressions passed",
  );
});
