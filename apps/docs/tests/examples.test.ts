import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement, Fragment } from "react";
import { renderToString } from "react-dom/server";
import { examples } from "../src/examples";

describe("component examples can render during SSR", () => {
  for (const [slug, load] of Object.entries(examples)) {
    test(slug, async () => {
      const { default: Example } = await load();
      for (const locale of ["en-US", "zh-CN"] as const) {
        const html = renderToString(createElement(Example, { locale }));
        expect(html.length).toBeGreaterThan(0);
      }
    });
  }
});

test("theme comparison isolates light and dark surfaces with a real dark class", async () => {
  const { default: Example } = await examples["theming-mode-comparison"]();
  const html = renderToString(createElement(Example, { locale: "en-US" }));
  const sections = [...html.matchAll(/<section\b([^>]+)>/g)].map(
    (match) => match[1] ?? "",
  );
  expect(sections).toHaveLength(2);
  const classes = sections.map((attributes) =>
    (attributes.match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/),
  );
  expect(classes[0]).not.toContain("dark");
  expect(classes[1]).toContain("dark");
  expect(sections[0]).toContain(
    "--background:oklch(0.97071377 0.00265048 286.35036)",
  );
  expect(sections[1]).toContain(
    "--background:oklch(0.200616 0.00196907 286.22089)",
  );
});

describe("official examples sharing a document keep fixed control IDs independent", () => {
  const directory = fileURLToPath(
    new URL("../content/docs/components", import.meta.url),
  );
  for (const file of new Bun.Glob("*.mdx").scanSync(directory)) {
    if (file.includes(".zh-CN.")) continue;
    test(file, async () => {
      const content = readFileSync(`${directory}/${file}`, "utf8");
      const names = [
        ...content.matchAll(/<ComponentPreview\s+name="([^"]+)"/g),
      ].map((match) => match[1]);
      const demos = await Promise.all(
        names.map(async (name, position) => {
          const load = examples[name as keyof typeof examples];
          if (!load) throw new Error(`Unregistered example: ${name}`);
          const { default: Demo } = await load();
          return createElement(Demo, {
            key: `${name}-${position}`,
            locale: "en-US",
          });
        }),
      );
      const html = renderToString(createElement(Fragment, null, demos));
      const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(
        (match) => match[1],
      );
      const duplicates = ids.filter(
        (id, index) => !id.startsWith("base-ui-") && ids.indexOf(id) !== index,
      );
      expect(duplicates).toEqual([]);
      for (const [, target] of html.matchAll(/\sfor="([^"]+)"/g)) {
        expect(ids).toContain(target);
      }
    });
  }
});
