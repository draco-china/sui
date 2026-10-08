import { expect, test } from "bun:test";

test("delete confirmation uses inline clipboard feedback without submitting its form", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/blocks-delete-resource.tsx", import.meta.url)
        .pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "inline resource copy, feedback, confirmation and busy semantics passed",
  );
}, 10000);
