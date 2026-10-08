import { expect, test } from "bun:test";
import releaseConfig from "../../../.releaserc.json";

const { analyzeCommits } = await import(
  Bun.resolveSync("@semantic-release/commit-analyzer", import.meta.dir)
);
const analyzer = releaseConfig.plugins.find(
  (plugin) =>
    Array.isArray(plugin) && plugin[0] === "@semantic-release/commit-analyzer",
);
if (!Array.isArray(analyzer)) throw new Error("Missing commit analyzer");
const analyzerOptions = analyzer[1];

function analyze(...messages: string[]) {
  return analyzeCommits(analyzerOptions, {
    cwd: import.meta.dir,
    commits: messages.map((message, index) => ({ hash: `${index}`, message })),
    logger: { log() {} },
  });
}

test("release configuration excludes documentation and ordinary maintenance", async () => {
  expect(
    await analyze(
      "docs: update installation",
      "docs(ui): document palettes",
      "feat(docs): improve navigation",
      "fix(docs): correct examples",
      ...["chore", "refactor", "style", "test", "ci", "build"].map(
        (type) => `${type}: improve maintenance`,
      ),
    ),
  ).toBeNull();
});

test("release configuration applies conventional commit defaults regardless of path", async () => {
  expect(await analyze("fix(ci): correct workflow")).toBe("patch");
  expect(await analyze("perf(ui): reduce rendering work")).toBe("patch");
  expect(await analyze("feat(ui): add component")).toBe("minor");
  expect(await analyze("feat(ui)!: change component API")).toBe("major");
});

test("pending features and fixes survive a later documentation or test push", async () => {
  expect(
    await analyze(
      "feat(ui): add glass fallback",
      "fix(ui): repair interaction contracts",
      "test(registry): allow cold transforms on CI",
      "docs: add GitHub links",
    ),
  ).toBe("minor");
  expect(await analyze("fix(ui): repair component", "docs: update guide")).toBe(
    "patch",
  );
});
