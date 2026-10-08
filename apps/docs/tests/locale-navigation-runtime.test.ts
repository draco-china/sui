import { expect, test } from "bun:test";

test("the real documentation header completes its language morph before navigating", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      "--conditions=browser",
      new URL("./fixtures/locale-navigation-runtime.tsx", import.meta.url)
        .pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "Documentation locale navigation waits for morph completion and preserves the route passed",
  );
});
