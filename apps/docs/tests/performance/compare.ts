import { readFile } from "node:fs/promises";

type Measurement = {
  svgFilter?: { count: number; medianMs: number; p95Ms: number };
  frames?: { framesPerSecond: number | null; p95Ms: number };
  reactCommits?: number;
  reactActualMs?: number;
  longTasks?: { count: number; totalMs: number };
};
type Report = Record<string, unknown>;

const [baselinePath, optimizedPath] = process.argv.slice(2);
if (!baselinePath || !optimizedPath)
  throw new Error("Usage: bun compare.ts baseline.json optimized.json");

const [baseline, optimized] = await Promise.all(
  [baselinePath, optimizedPath].map(async (path) =>
    JSON.parse(await readFile(path, "utf8")),
  ),
);

function number(value: number | undefined) {
  return value === undefined ? "—" : value.toFixed(2);
}

function rows(report: Report) {
  const values = new Map<string, number>();
  for (const [scenario, value] of Object.entries(report)) {
    if (!value || typeof value !== "object") continue;
    const measurement = value as Measurement;
    const filter = measurement.svgFilter;
    if (filter) {
      values.set(`${scenario} / SVG filter calls`, filter.count);
      values.set(`${scenario} / SVG filter median ms`, filter.medianMs);
      values.set(`${scenario} / SVG filter p95 ms`, filter.p95Ms);
    }
    const frames = measurement.frames;
    if (frames?.framesPerSecond != null) {
      values.set(`${scenario} / frames per second`, frames.framesPerSecond);
      values.set(`${scenario} / frame p95 ms`, frames.p95Ms);
    }
    for (const name of ["reactCommits", "reactActualMs"] as const) {
      const count = measurement[name];
      if (count !== undefined) values.set(`${scenario} / ${name}`, count);
    }
    if (measurement.longTasks)
      values.set(`${scenario} / long tasks`, measurement.longTasks.count);
  }
  return values;
}

const oldRows = rows(baseline);
const newRows = rows(optimized);
console.log(
  "| Measurement | Baseline | Optimized | Change |\n| --- | ---: | ---: | ---: |",
);
for (const [name, current] of newRows) {
  const previous = oldRows.get(name);
  let change = "—";
  if (previous !== undefined) {
    change = `${number(current - previous)}`;
    if (previous > 0)
      change += ` (${(((current - previous) / previous) * 100).toFixed(1)}%)`;
  }
  console.log(
    `| ${name} | ${number(previous)} | ${number(current)} | ${change} |`,
  );
}
