import { appendFileSync } from "node:fs";
import { analyzeCommits } from "@semantic-release/commit-analyzer";
import releaseConfig from "../.releaserc.json";

function git(...args: string[]) {
  const result = Bun.spawnSync(["git", ...args]);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr.toString());
  }
  return result.stdout.toString().trim();
}

async function needsRelease() {
  if (process.env.EVENT_NAME === "workflow_dispatch") return true;
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA;
  if (!base || !head) throw new Error("BASE_SHA and HEAD_SHA are required");

  const range = /^0+$/.test(base) ? head : `${base}..${head}`;
  const commits = git("rev-list", "--reverse", range)
    .split("\n")
    .filter(Boolean)
    .filter((hash) =>
      Boolean(
        git(
          "diff-tree",
          "--root",
          "--no-commit-id",
          "--name-only",
          "-r",
          hash,
          "--",
          "packages/ui",
          "registry/r",
          ":!**/*.md",
          ":!**/*.mdx",
        ),
      ),
    )
    .map((hash) => ({ hash, message: git("show", "-s", "--format=%B", hash) }));
  const analyzer = releaseConfig.plugins.find(
    (plugin) =>
      Array.isArray(plugin) &&
      plugin[0] === "@semantic-release/commit-analyzer",
  );
  if (!analyzer || !Array.isArray(analyzer)) {
    throw new Error("Missing semantic-release commit analyzer configuration");
  }
  return Boolean(
    await analyzeCommits(analyzer[1], {
      cwd: import.meta.dir,
      commits,
      logger: { log() {} },
    }),
  );
}

const release = await needsRelease();
console.log(`release=${release}`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `release=${release}\n`);
}
