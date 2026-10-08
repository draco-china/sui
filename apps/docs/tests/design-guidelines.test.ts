import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as ts from "typescript";
import { examples, sourceFiles } from "../src/examples";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
// These are the complete design topics and sample counts in the source guide,
// independent of this site's implementation or its navigation structure.
const topics = {
  "content-text-size": 2,
  "heading-case": 3,
  "font-tracking": 2,
  "font-weight": 2,
  "related-text-spacing": 2,
  "text-spacing": 2,
  "hover-color-transitions": 2,
  "shadow-borders": 2,
  "concentric-border-radius": 2,
  "icon-alignment": 3,
  "inline-monospace-size": 2,
  "sticky-borders": 2,
  "collapse-content-size": 2,
  "layer-card-nesting": 2,
  "dialog-rendering": 2,
} as const;

describe("complete design guidelines", () => {
  for (const locale of ["en-US", "zh-CN"] as const) {
    test(`${locale} preserves every design topic, both sample roles and all original comparisons`, () => {
      const suffix = locale === "zh-CN" ? ".zh-CN" : "";
      const raw = readFileSync(
        join(root, `content/docs/design-guidelines${suffix}.mdx`),
        "utf8",
      );
      const sections = raw.split(/^## /m).slice(1);
      expect(raw).not.toMatch(
        /kumo|cloudflare|DANGEROUS_className|<Text\b|<LayerCard\b|Dialog\.Root/i,
      );
      for (const [id, expectedSamples] of Object.entries(topics)) {
        const section = sections.find((text) =>
          text.split("\n", 1)[0]?.endsWith(`[#${id}]`),
        );
        expect(section, `${locale}: missing full rule ${id}`).toBeDefined();
        if (!section) continue;
        expect(section).toContain(
          locale === "zh-CN" ? "**推荐**" : "**Recommended**",
        );
        expect(section).toContain(
          locale === "zh-CN" ? "**避免**" : "**Avoid**",
        );
        expect([...section.matchAll(/^```tsx/gm)].length).toBe(expectedSamples);
        const name = `design-guidelines-${id}`;
        expect(section).toContain(`<ComponentPreview name="${name}" />`);
        expect(name in examples).toBe(true);
        expect(name in sourceFiles).toBe(true);
        for (const [, snippet] of section.matchAll(
          /```tsx\n([\s\S]*?)\n```/g,
        )) {
          const result = ts.transpileModule(snippet, {
            reportDiagnostics: true,
            compilerOptions: {
              jsx: ts.JsxEmit.ReactJSX,
              target: ts.ScriptTarget.ESNext,
            },
          });
          expect(
            result.diagnostics?.filter(
              (diagnostic) =>
                diagnostic.category === ts.DiagnosticCategory.Error,
            ) ?? [],
          ).toEqual([]);
        }
      }
      expect([...raw.matchAll(/^```tsx/gm)].length).toBe(32);
    });

    test(`${locale} comparison modules render labeled, usable alternatives`, async () => {
      for (const id of Object.keys(topics)) {
        const name = `design-guidelines-${id}` as keyof typeof examples;
        const { default: Example } = await examples[name]();
        const html = renderToStaticMarkup(createElement(Example, { locale }));
        expect(html).toContain(locale === "zh-CN" ? "推荐" : "Recommended");
        expect(html).toContain(locale === "zh-CN" ? "避免" : "Avoid");
        expect((html.match(/<section\b/g) ?? []).length).toBe(2);
        if (id === "dialog-rendering") {
          expect((html.match(/<button\b/g) ?? []).length).toBe(2);
          expect(html).toContain(
            locale === "zh-CN" ? "打开弹窗" : "Open dialog",
          );
        }
        if (id === "collapse-content-size") {
          expect((html.match(/<button\b/g) ?? []).length).toBe(2);
          expect(html).toContain(
            locale === "zh-CN" ? "切换面板" : "Toggle panel",
          );
        }
      }
    });
  }

  test("English and Chinese anchor topology stays identical", () => {
    const anchors = (suffix: string) =>
      [
        ...readFileSync(
          join(root, `content/docs/design-guidelines${suffix}.mdx`),
          "utf8",
        ).matchAll(/^## .*\[#([^\]]+)\]/gm),
      ].map((match) => match[1]);
    expect(anchors(".zh-CN")).toEqual(anchors(""));
    expect(anchors("")).toEqual(["shared-styles", ...Object.keys(topics)]);
  });
});
