import { afterAll, beforeAll, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const script = resolve(import.meta.dir, "../../../scripts/release-needed.ts");
const repo = mkdtempSync(join(tmpdir(), "sui-release-"));
let revision = 0;

function git(...args: string[]) {
  const result = Bun.spawnSync(["git", ...args], { cwd: repo });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}

function commit(path: string, message: string) {
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), `revision ${revision++}\n`);
  git("add", path);
  git("-c", "core.hooksPath=/dev/null", "commit", "-m", message);
  return git("rev-parse", "HEAD");
}

function check(base: string, head: string, event = "push") {
  const output = join(repo, "output");
  writeFileSync(output, "existing=value\n");
  const result = Bun.spawnSync([process.execPath, script], {
    cwd: repo,
    env: {
      ...process.env,
      BASE_SHA: base,
      HEAD_SHA: head,
      EVENT_NAME: event,
      GITHUB_OUTPUT: output,
    },
  });
  expect(result.stderr.toString()).toBe("");
  expect(result.exitCode).toBe(0);
  expect(readFileSync(output, "utf8")).toBe(
    `existing=value\n${result.stdout.toString()}`,
  );
  return result.stdout.toString().trim();
}

beforeAll(() => {
  git("init", "--initial-branch=main");
  git("config", "user.name", "Release Test");
  git("config", "user.email", "release@example.test");
  commit("README.md", "chore: initialize fixture");
});
afterAll(() => rmSync(repo, { recursive: true, force: true }));

test("documentation, config, and maintenance updates skip automatic release", () => {
  for (const [path, message] of [
    ["apps/docs/src/app.ts", "feat(docs): improve navigation"],
    ["README.md", "feat: document installation"],
    ["packages/ui/src/styles/themes/README.md", "feat(ui): document palettes"],
    [".github/workflows/ci.yml", "fix(ci): update checks"],
    ["packages/ui/src/button.ts", "docs(ui): update examples"],
    ["packages/ui/src/button.ts", "fix(docs): update examples"],
    ...["chore", "refactor", "style", "test", "ci", "build"].map((type) => [
      "packages/ui/src/button.ts",
      `${type}(ui): improve maintenance`,
    ]),
  ]) {
    const base = git("rev-parse", "HEAD");
    expect(check(base, commit(path, message))).toBe("release=false");
  }
});

test("library fixes, features, performance and breaking changes qualify", () => {
  for (const message of [
    "fix(ui): correct spacing",
    "feat(ui): add component",
    "perf(ui): reduce rendering work",
    "feat(ui)!: change component API",
  ]) {
    const base = git("rev-parse", "HEAD");
    expect(check(base, commit("packages/ui/src/button.ts", message))).toBe(
      "release=true",
    );
  }
  const base = git("rev-parse", "HEAD");
  expect(
    check(base, commit("registry/r/button.json", "fix(registry): fix imports")),
  ).toBe("release=true");
});

test("push ranges include earlier library commits and support first pushes", () => {
  const base = git("rev-parse", "HEAD");
  commit("packages/ui/src/button.ts", "fix(ui): correct button");
  const head = commit("README.md", "docs: update guide");
  expect(check(base, head)).toBe("release=true");
  expect(check("0".repeat(40), head)).toBe("release=true");
});

test("manual runs request evaluation and invalid revisions fail visibly", () => {
  const head = git("rev-parse", "HEAD");
  expect(check(head, head, "workflow_dispatch")).toBe("release=true");
  const result = Bun.spawnSync([process.execPath, script], {
    cwd: repo,
    env: {
      ...process.env,
      EVENT_NAME: "push",
      BASE_SHA: "invalid",
      HEAD_SHA: head,
    },
  });
  expect(result.exitCode).not.toBe(0);
});
