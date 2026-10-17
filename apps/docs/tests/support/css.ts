import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Postcss, Rule } from "postcss";

const uiRoot = new URL("../../../../packages/ui/", import.meta.url).pathname;
const tailwindPlugin = Bun.resolveSync(
  "@tailwindcss/vite",
  new URL("../../src", import.meta.url).pathname,
);
const { optimize } = await import(
  Bun.resolveSync("@tailwindcss/node", dirname(tailwindPlugin))
);
const postcss: Postcss = (await import(Bun.resolveSync("postcss", uiRoot)))
  .default;

export { optimize };

/**
 * A UI stylesheet as Tailwind compiles it for production, nesting resolved:
 * the glass custom variants expand as Tailwind expands them.
 */
export function compiledStylesheet(path: string, minify = false): string {
  const source = readFileSync(`${uiRoot}src/styles/${path}`, "utf8")
    .replace(/@custom-variant glass-off \{[^}]*\{[^}]*\}\s*\}/, "")
    .replace(/@custom-variant[^;{]*;/g, "")
    .replaceAll(
      "@variant glass-off {",
      "@media (prefers-reduced-transparency: reduce), (forced-colors: active) {",
    );
  return optimize(source, { minify }).code;
}

/**
 * The values a stylesheet declares for `property` on `element`, in source
 * order, ignoring rules inside media queries. Happy DOM matches selectors
 * but drops values it cannot parse, such as color-mix().
 */
export function declaredValues(
  css: string,
  element: { matches(selector: string): boolean },
  property: string,
) {
  const root = postcss.parse(css);
  const conditional = new Set<Rule>();
  root.walkAtRules("media", (media) =>
    media.walkRules((rule) => {
      conditional.add(rule);
    }),
  );
  const values: string[] = [];
  root.walkRules((rule) => {
    if (conditional.has(rule) || !element.matches(rule.selector)) return;
    for (const node of rule.nodes) {
      if (node.type === "decl" && node.prop === property)
        values.push(node.value);
    }
  });
  return values;
}
