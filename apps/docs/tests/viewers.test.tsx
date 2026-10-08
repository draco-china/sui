import { describe, expect, test } from "bun:test";
import {
  CodeViewer,
  ShikiProvider,
} from "@workspace/ui/components/code-viewer";
import { DiffViewer } from "@workspace/ui/components/diff-viewer";
import { Editor } from "@workspace/ui/components/editor";
import { GlassSurface } from "@workspace/ui/components/glass";
import { HtmlViewer } from "@workspace/ui/components/html-viewer";
import { ImageViewer } from "@workspace/ui/components/image-viewer";
import { MarkdownViewer } from "@workspace/ui/components/markdown-viewer";
import { renderToStaticMarkup } from "react-dom/server";
import {
  clampImageScale,
  normalizeImageIndex,
  wrapImageIndex,
} from "../../../packages/ui/src/lib/viewer/image-transform";
import {
  codeToViewerTokens,
  getViewerHighlighter,
} from "../../../packages/ui/src/lib/viewer/shiki";

describe("viewer SSR and untrusted content", () => {
  test("code escapes executable content before asynchronous highlighting", () => {
    const html = renderToStaticMarkup(
      <CodeViewer code={'<script>alert("unsafe")</script>'} copyable={false} />,
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain('role="status"');
    expect(html).toContain('data-slot="skeleton"');
    expect(html).toContain('class="sr-only"');
  });
  test("HTML keeps an opaque script-capable sandbox, and accepts script-free previews", () => {
    const html = renderToStaticMarkup(
      <HtmlViewer
        content="<h1>Test</h1><script>alert(1)</script>"
        labels={{ preview: "HTML 预览" }}
      />,
    );
    expect(html).toContain('sandbox="allow-scripts"');
    expect(html).not.toContain("allow-same-origin");
    expect(html).toContain('title="HTML 预览"');
    expect(html).toContain('srcDoc="&lt;h1&gt;Test&lt;/h1&gt;');
    expect(
      renderToStaticMarkup(<HtmlViewer content="<h1>Test</h1>" sandbox="" />),
    ).toContain('sandbox=""');
  });
  test("markdown removes scripts, handlers, dangerous links and preserves safe HTML/GFM", () => {
    const html = renderToStaticMarkup(
      <MarkdownViewer
        content={
          '<script>alert(1)</script>\n\n<img src="/safe.svg" onerror="alert(1)"/>\n\n[Bad](javascript:alert(1))\n\n<details><summary>Safe details</summary>Body</details>\n\n- [x] Done\n\n| Name | Value |\n| --- | --- |\n| A | 1 |\n\n> [!NOTE]\n> Keep this complete sentence.'
        }
        labels={{ note: "提示" }}
      />,
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("<details");
    expect(html).toContain("<table");
    expect(html).toContain('type="checkbox" disabled="" checked=""');
    expect(html).toContain("提示");
    expect(html).toContain("Keep this complete sentence.");
  });
  test("all block code uses CodeViewer while inline code remains inline", () => {
    const html = renderToStaticMarkup(
      <MarkdownViewer
        content={
          "Inline `one`.\n\n```\nfirst line\n  second line\n```\n\n```typescript\nconst answer = 42;\n```\n\n    indented block\n    with two lines\n"
        }
      />,
    );
    expect((html.match(/data-slot="code-viewer"/g) ?? []).length).toBe(3);
    expect(html).toContain("first line\n  second line");
    expect(html).toContain("indented block\nwith two lines");
    expect((html.match(/<code\b/g) ?? []).length).toBe(1);
    expect(html).toContain(">one</code>");
    expect(html).toContain("Copy code");
  });
  test("TOC and footnotes link to independent viewer IDs in one SSR root", () => {
    const content =
      "# Document\n\n## Contents\n\n## Introduction\n\nText with a footnote[^one].\n\n## Details\n\n[^one]: A footnote.";
    const html = renderToStaticMarkup(
      <>
        <MarkdownViewer content={content} />
        <MarkdownViewer content={content} />
      </>,
    );
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(8);
    expect(new Set(ids).size).toBe(ids.length);
    const targets = [...html.matchAll(/href="#([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(targets.length).toBeGreaterThanOrEqual(8);
    for (const target of targets) expect(ids).toContain(target);
    expect(html).not.toMatch(/href="#[^"]+"[^>]+target="_blank"/);
  });
  test("Markdown code blocks keep each viewer's translated feedback isolated", () => {
    const content = "```tsx\nconst value = 42;\n```";
    const html = renderToStaticMarkup(
      <>
        <MarkdownViewer
          content={content}
          labels={{ code: { copy: "复制代码", loading: "正在加载代码" } }}
        />
        <MarkdownViewer content={content} />
      </>,
    );
    expect(html).toContain('aria-label="复制代码"');
    expect(html).toContain("正在加载代码");
    expect(html).toContain('aria-label="Copy code"');
    expect(html).toContain("Loading...");
  });
  test("diff replacement blocks preserve one-sided line counts and aligned padding", () => {
    const html = renderToStaticMarkup(
      <DiffViewer
        oldCode={"shared\nold\n"}
        newCode={"shared\nnew-a\nnew-b\n"}
        copyable={false}
      />,
    );
    expect(html).toContain(">+2</span>");
    expect(html).toContain(">−1</span>");
    expect(html).toContain("old");
    expect(html).toContain("new-a");
    expect(html).toContain("new-b");
    expect((html.match(/>shared</g) ?? []).length).toBe(2);
  });
  test("editor SSR has a bounded labeled skeleton and no Monaco DOM or change callbacks", () => {
    let changed = false;
    const html = renderToStaticMarkup(
      <Editor
        defaultValue="draft"
        language="typescript"
        height={280}
        labels={{ loading: "正在加载编辑器" }}
        onChange={() => {
          changed = true;
        }}
      />,
    );
    expect(html).toContain("height:280px");
    expect(html).toContain('aria-label="正在加载编辑器"');
    expect(html).not.toContain("monaco-editor");
    expect(changed).toBe(false);
    expect(
      renderToStaticMarkup(
        <ImageViewer
          images={[]}
          open
          onClose={() => {
            throw new Error("SSR close");
          }}
        />,
      ),
    ).toBe("");
  });
});

describe("shared lazy syntax highlighting", () => {
  test("shares the core across languages and treats unrecognized/prototype names as plain text", async () => {
    const [{ instance: one }, { instance: two }] = await Promise.all([
      getViewerHighlighter("typescript", "light"),
      getViewerHighlighter("python", "dark"),
    ]);
    expect(one).toBe(two);
    for (const lang of ["not-a-language", "constructor", "__proto__"]) {
      const result = await getViewerHighlighter(lang, "light");
      expect(result.lang).toBe("text");
      const tokens = await codeToViewerTokens(
        "const value = 42",
        lang,
        "light",
      );
      expect(
        tokens
          .flat()
          .map((token) => token.content)
          .join(""),
      ).toBe("const value = 42");
    }
  });
  test("supports language aliases, previously absent grammars and configured dual themes", async () => {
    for (const lang of ["rb", "rust", "vue", "swift", "sql"]) {
      const tokens = await codeToViewerTokens("let answer = 42", lang, "dark");
      expect(
        tokens
          .flat()
          .map((token) => token.content)
          .join(""),
      ).toBe("let answer = 42");
    }
    const themes = { light: "github-light", dark: "github-dark" } as const;
    const light = await codeToViewerTokens(
      "const answer = 42",
      "ts",
      "light",
      themes,
    );
    const dark = await codeToViewerTokens(
      "const answer = 42",
      "ts",
      "dark",
      themes,
    );
    expect(light[0].some((token) => token.color)).toBe(true);
    expect(light[0].map((token) => token.color)).not.toEqual(
      dark[0].map((token) => token.color),
    );
    const html = renderToStaticMarkup(
      <ShikiProvider languages={["python"]} themes={themes}>
        <CodeViewer code="print(42)" lang="python" variant="plain" />
      </ShikiProvider>,
    );
    expect(html).toContain("print(42)");
  });
});

describe("gallery limits", () => {
  test("normalizes invalid positions and wraps navigation without negative indexes", () => {
    expect(normalizeImageIndex(Number.NaN, 3)).toBe(0);
    expect(normalizeImageIndex(20, 3)).toBe(2);
    expect(normalizeImageIndex(-1, 3)).toBe(0);
    expect(wrapImageIndex(-4, 3)).toBe(2);
    expect(wrapImageIndex(3, 3)).toBe(0);
    expect(normalizeImageIndex(2, 0)).toBe(0);
  });
  test("keeps zoom within safe finite limits", () => {
    expect(clampImageScale(20)).toBe(5);
    expect(clampImageScale(-2)).toBe(0.1);
    expect(clampImageScale(Number.NaN)).toBe(1);
  });
});

test("isolated DOM exercises editor state, viewer controls, streaming and fullscreen", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/viewers-dom.tsx", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "detached fullscreen passed",
  );
}, 20_000);

test("editor maps real JSX and TSX Shiki grammars onto native Monaco model languages", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/editor-highlighting.ts", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "actual official JSX/TSX tokenizers",
  );
});

test("editor workers release shared threads and reopen with a fresh actual Monaco client", () => {
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      new URL("./fixtures/editor-workers.ts", import.meta.url).pathname,
    ],
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(new TextDecoder().decode(result.stderr)).toBe("");
  expect(result.exitCode).toBe(0);
  expect(new TextDecoder().decode(result.stdout)).toContain(
    "actual Monaco TS/JS/JSON/CSS/HTML cache reset",
  );
});

test("viewer content reuses its shell while independent editor actions inherit glass", () => {
  const markdown = "```typescript\nconst answer = 42;\n```";
  const html = renderToStaticMarkup(
    <MarkdownViewer glass content={markdown} />,
  );
  expect((html.match(/data-glass="true"/g) ?? []).length).toBe(1);
  const Preview = ({ content }: { content: string }) => (
    <MarkdownViewer content={content} />
  );
  const editor = renderToStaticMarkup(
    <Editor
      glass
      value={markdown}
      height={240}
      preview={{ component: Preview, defaultMode: "preview" }}
    />,
  );
  expect(editor).toMatch(/data-slot="editor-surface"[^>]*data-glass="true"/);
  expect(editor).not.toMatch(
    /data-slot="(?:markdown-viewer|code-viewer)"[^>]*data-glass="true"/,
  );
  expect(editor).toMatch(/<button[^>]*data-glass="true"/);
  expect(
    renderToStaticMarkup(
      <GlassSurface>
        <CodeViewer glass={false} code="plain" />
      </GlassSurface>,
    ),
  ).not.toMatch(/data-slot="code-viewer"[^>]*data-glass="true"/);
});
