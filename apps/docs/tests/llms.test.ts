import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Locale } from "../src/lib/i18n";
import {
  type LLMContent,
  type LLMPage,
  llmsResponse,
  renderLLMIndex,
  toLLMMarkdown,
} from "../src/lib/llms";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const contentRoot = join(appRoot, "content/docs");
const paths = [...new Bun.Glob("**/*.mdx").scanSync(contentRoot)];
const pages = (locale: Locale): LLMPage[] =>
  paths
    .filter((path) => path.endsWith(".zh-CN.mdx") === (locale === "zh-CN"))
    .map((path) => {
      const raw = readFileSync(join(contentRoot, path), "utf8");
      const slug = path
        .replace(/(?:\.zh-CN)?\.mdx$/, "")
        .replace(/(^|\/)index$/, "");
      return {
        path,
        slugs: slug.split("/").filter(Boolean),
        title: raw.match(/^title:\s*(.+)$/m)?.[1] ?? path,
        description: raw.match(/^description:\s*(.+)$/m)?.[1],
      };
    });
const content: LLMContent = {
  pages,
  markdown: async (page) => readFileSync(join(contentRoot, page.path), "utf8"),
  example: async (name) =>
    readFileSync(join(appRoot, `src/examples/variants/${name}.tsx`), "utf8"),
};

function outsideCode(markdown: string) {
  return markdown
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, "")
    .replace(/(`+)[\s\S]*?\1/g, "");
}

describe("LLM Markdown conversion", () => {
  test("expands examples without evaluating MDX and preserves code verbatim", async () => {
    const example =
      'import { Button } from "@workspace/ui/components/button";\nexport default function Demo() { return <Button>Save</Button>; }\n// ``` inside source';
    const raw = `---\ntitle: Button\nlinks:\n  api: https://base-ui.com/react/components/button\n---\nimport { Icon } from "icons"\n\n## Use [#use]\n\n<Callout icon={<Icon />} title="Remember">\nKeep \`<Button />\` intact.\n</Callout>\n<Steps><Step>Import the button</Step></Steps>\n<ComponentPreview name="button-demo" />\n\n\`\`\`tsx\nimport { Button } from "@workspace/ui/components/button";\n<Button />;\n\`\`\`\n<img src="/image.png" alt="Button screenshot" />\n<a href="https://base-ui.com">Base UI</a>`;
    const markdown = await toLLMMarkdown(raw, {
      locale: "en-US",
      origin: "https://docs.test",
      pages: [],
      example: async (name) => {
        expect(name).toBe("button-demo");
        return example;
      },
    });
    expect(markdown).toContain(example);
    expect(markdown).toContain("````tsx");
    expect(markdown).toContain("## Use\n");
    expect(markdown).toContain("**Remember**");
    expect(markdown).toContain("### Import the button");
    expect(markdown).toContain("`<Button />`");
    expect(markdown).toContain("[Base UI](https://base-ui.com)");
    expect(markdown).toContain("![Button screenshot](/image.png)");
    expect(markdown).toContain(
      "[API reference](https://base-ui.com/react/components/button)",
    );
    expect(markdown).not.toContain("import { Icon }");
    expect(outsideCode(markdown)).not.toMatch(
      /<(?:ComponentPreview|Callout|Steps|Step)|\[#|^---\n/m,
    );
  });

  test("missing preview source fails visibly rather than publishing a placeholder", async () => {
    await expect(
      toLLMMarkdown('<ComponentPreview name="missing" />', {
        locale: "en-US",
        origin: "https://docs.test",
        pages: [],
        example: async () => {
          throw new Error("missing example");
        },
      }),
    ).rejects.toThrow("missing example");
  });

  test("preserves Markdown autolinks and multiline code with JSX", async () => {
    const body = [
      "See <https://base-ui.com/react/components/button>.",
      "Use ``a ` b`` for a literal backtick.",
      "```tsx",
      '<Button render={<a href="/" />}>Home</Button>;',
      "```",
    ].join("\n");
    expect(
      await toLLMMarkdown(body, {
        locale: "en-US",
        origin: "https://docs.test",
        pages: [],
        example: content.example,
      }),
    ).toBe(`${body}\n`);
  });

  for (const locale of ["en-US", "zh-CN"] as const) {
    test(`${locale}: every document and its complete examples are available`, async () => {
      const all = pages(locale);
      expect(all.length).toBeGreaterThan(0);
      const index = renderLLMIndex(all, locale, "https://local.test:4321");
      for (const page of all) {
        const raw = await content.markdown(page);
        const markdown = await toLLMMarkdown(raw, {
          locale,
          origin: "https://local.test:4321",
          pages: all,
          example: content.example,
        });
        expect(markdown.trim().length).toBeGreaterThan(0);
        expect(outsideCode(markdown)).not.toMatch(
          /<\/?(?:ComponentPreview|ComponentSource|ComponentIndex|Callout|Steps|Step)\b|\[#[^\]]+\]/,
        );
        for (const [, name] of raw.matchAll(
          /<Component(?:Preview|Source)\s+name="([^"]+)"/g,
        )) {
          expect(markdown).toContain((await content.example(name)).trimEnd());
        }
        const url = new URL("/api/llms-markdown", "https://local.test:4321");
        url.searchParams.set("locale", locale);
        url.searchParams.set("slug", page.slugs.join("/"));
        expect(index).toContain(url.href);
      }
    });
  }

  test("Blocks indexes individual references and removed directory requests return 404", async () => {
    for (const locale of ["en-US", "zh-CN"] as const) {
      const all = pages(locale);
      expect(all.some((page) => page.slugs.join("/") === "blocks")).toBe(false);
      const index = renderLLMIndex(all, locale, "https://docs.test");
      const section = index.split("## Blocks\n\n")[1]?.split("\n\n## ")[0];
      expect(section).toBeDefined();
      expect(section).toContain("[Delete Resource]");
      expect(section).not.toContain("删除资源");
      for (const slug of ["data-table", "tanstack-form", "delete-resource"])
        expect(section).toContain(`slug=blocks%2F${slug}`);
      const response = await llmsResponse(
        content,
        new Request(
          `https://docs.test/api/llms-markdown?locale=${locale}&slug=blocks`,
        ),
        "page",
      );
      expect(response.status).toBe(404);
    }
  });

  test("both locale indexes cover the same dynamically discovered slugs", () => {
    const slugs = (locale: Locale) =>
      pages(locale)
        .map((page) => page.slugs.join("/"))
        .sort();
    expect(slugs("zh-CN")).toEqual(slugs("en-US"));
  });

  test("directory and index include newly discovered pages and alphabetize components", async () => {
    const all: LLMPage[] = [
      {
        path: "design-guidelines.mdx",
        slugs: ["design-guidelines"],
        title: "Design guidelines",
      },
      { path: "components/z.mdx", slugs: ["components", "z"], title: "Zebra" },
      { path: "components/a.mdx", slugs: ["components", "a"], title: "Apple" },
      {
        path: "utils/scroll-fade.mdx",
        slugs: ["utils", "scroll-fade"],
        title: "Scroll fade",
      },
    ];
    const index = renderLLMIndex(all, "zh-CN", "http://localhost:3000");
    expect(index).toContain("slug=design-guidelines");
    expect(index.indexOf("[Apple]")).toBeLessThan(index.indexOf("[Zebra]"));
    expect(index).toContain("/zh-CN/llms-full.txt");
    expect(index).not.toContain("locale=en-US");
    expect(index).toContain("## 工具\n\n- [Scroll fade]");
    expect(index.slice(0, index.indexOf("## 组件"))).not.toContain(
      "[Scroll fade]",
    );
    const directory = await toLLMMarkdown("<ComponentIndex />", {
      locale: "zh-CN",
      origin: "http://localhost:3000",
      pages: all,
      example: content.example,
    });
    expect(directory).toContain("[Apple]");
    expect(directory).toContain("[Zebra]");
    expect(directory).not.toContain("design-guidelines");
  });
});

describe("LLM HTTP responses", () => {
  test("normalizes explicit English and preserves query", async () => {
    for (const filename of ["llms.txt", "llms-full.txt"]) {
      const response = await llmsResponse(
        content,
        new Request(`http://localhost:3000/en-US/${filename}?x=1`),
        "index",
        "en-US",
      );
      expect(response.status).toBe(308);
      expect(response.headers.get("Location")).toBe(
        `http://localhost:3000/${filename}?x=1`,
      );
    }
  });

  test("validates locale and exact document slugs", async () => {
    for (const url of [
      "https://docs.test/api/llms-markdown?locale=fr",
      "https://docs.test/api/llms-markdown?slug=missing",
      "https://docs.test/api/llms-markdown?slug=../installation",
    ]) {
      expect(
        (await llmsResponse(content, new Request(url), "page")).status,
      ).toBe(404);
    }
    expect(
      (
        await llmsResponse(
          content,
          new Request("https://docs.test/fr/llms.txt"),
          "index",
          "fr",
        )
      ).status,
    ).toBe(404);
  });

  test("uses request origin, content types and caching for index, page and full", async () => {
    const request = new Request("http://localhost:3000/llms.txt", {
      headers: { Host: "untrusted.example" },
    });
    const index = await llmsResponse(content, request, "index");
    expect(index.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(index.headers.get("Cache-Control")).toContain("max-age=300");
    const text = await index.text();
    expect(text).toContain("http://localhost:3000/api/llms-markdown");
    expect(text).not.toContain("untrusted.example");
    const page = await llmsResponse(
      content,
      new Request(
        "http://localhost:3000/api/llms-markdown?locale=zh-CN&slug=components/button",
      ),
      "page",
    );
    expect(page.headers.get("Content-Type")).toBe(
      "text/markdown; charset=utf-8",
    );
    expect(await page.text()).toContain(
      "http://localhost:3000/zh-CN/docs/components/button",
    );
    const full = await llmsResponse(
      content,
      new Request("http://localhost:3000/llms-full.txt"),
      "full",
    );
    const fullText = await full.text();
    for (const item of pages("en-US"))
      expect(fullText).toContain(`# ${item.title}\n`);
    expect(outsideCode(fullText)).not.toContain("<ComponentPreview");
  });
});
