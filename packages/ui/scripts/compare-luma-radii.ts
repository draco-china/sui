/**
 * Lists components whose corner radius classes differ from shadcn/ui
 * base-luma, whose steps SUI follows. Run by hand after a shadcn update:
 * `bun run radii:compare`. Logical sides (`s`/`e`) count as the physical
 * `l`/`r` luma writes, `rounded-[2px]` is Tailwind's `rounded-xs`, and glass
 * or frosted additions are ignored.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const components = fileURLToPath(
  new URL("../src/components/", import.meta.url),
);
const registry = "https://ui.shadcn.com/r/styles/base-luma";
const radius =
  /(?<![\w-])(?:[\w\-[\]=&*>:/().@]+:)?rounded(?:-[\w\-[\]().%/]+)?(?![\w-])/g;

function normalize(token: string) {
  return token
    .replace(/rounded-(s|ss|es)(?=-|$)/, (_, side: string) =>
      side === "s" ? "rounded-l" : `rounded-${side === "ss" ? "tl" : "bl"}`,
    )
    .replace(/rounded-(e|se|ee)(?=-|$)/, (_, side: string) =>
      side === "e" ? "rounded-r" : `rounded-${side === "se" ? "tr" : "br"}`,
    )
    .replace(/data-\[orientation=(horizontal|vertical)\]/g, "data-$1")
    .replace("rounded-[2px]", "rounded-xs");
}

/** Radius classes per function or cva, keyed without SUI's Implementation suffix. */
function radii(source: string) {
  const result = new Map<string, string[]>();
  for (const part of source.split(
    /\n(?=(?:export )?(?:function |const \w+ = cva))/,
  )) {
    const name = part.match(
      /^(?:export )?(?:function (\w+)|const (\w+) = cva)/,
    );
    if (!name) continue;
    const tokens = [...part.matchAll(radius)]
      .map(([token]) => normalize(token))
      .filter((token) => !/(glass|frosted)/.test(token));
    if (tokens.length === 0) continue;
    const key = (name[1] ?? name[2]).replace(/Implementation$/, "");
    result.set(
      key,
      [...new Set([...(result.get(key) ?? []), ...tokens])].sort(),
    );
  }
  return result;
}

let differences = 0;
for (const file of (await readdir(components)).sort()) {
  if (!file.endsWith(".tsx")) continue;
  const name = file.slice(0, -4);
  const response = await fetch(`${registry}/${name}.json`);
  if (!response.ok) continue;
  const item = (await response.json()) as { files: { content?: string }[] };
  const luma = radii(item.files.map((entry) => entry.content ?? "").join("\n"));
  const sui = radii(await readFile(join(components, file), "utf8"));
  for (const key of new Set([...luma.keys(), ...sui.keys()])) {
    const expected = luma.get(key)?.join(" ") ?? "-";
    const actual = sui.get(key)?.join(" ") ?? "-";
    if (expected === actual) continue;
    differences++;
    console.log(`${name}.${key}\n  luma: ${expected}\n  sui:  ${actual}`);
  }
}
console.log(
  differences
    ? `${differences} difference(s) from base-luma.`
    : "Radii match base-luma.",
);
