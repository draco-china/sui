import { expect, test } from "bun:test";
import { MarkdownViewer } from "@workspace/ui/viewers/markdown-viewer";
import { renderToStaticMarkup } from "react-dom/server";

// One document per feature, so a refactor that changes output points at it.
const samples = {
  headings: "# Title\n\n## Part\n\n## Part\n\n### Deep `code`\n\n###### Small",
  toc: "# Guide\n\n## Contents\n\n## Install\n\n## Use",
  alerts:
    "> [!NOTE]\n> Plain note\n\n> [!WARNING]\n> Careful\n\n> [!CAUTION]\n>\n> Lead break",
  blocks:
    "> Quote\n\n---\n\n1. One\n2. Two\n\n- [x] Done\n- [ ] Todo\n\n<details><summary>More</summary>Hidden</details>",
  inline:
    "**Bold** `code` <kbd>Ctrl</kbd> [site](https://example.com) [jump](#use)\n\n## Use",
  table: "| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |",
  code: "```ts\nconst answer = 42;\n```\n\n```\nplain\n```",
  math: "Inline $x^2$\n\n$$\ny = mx\n$$\n\n```math\na+b\n```",
  footnotes: "Claim[^1]\n\n[^1]: Source",
  images: "![Lake](/lake.png)",
  unsafe:
    '<div class="fixed inset-0">Overlay</div><script>alert(1)</script><a href="javascript:alert(1)">x</a>',
};

// React's generated ids depend on tree depth, not on the rendered content.
const stableIds = (html: string) => html.replace(/_R_[0-9a-z]+_/g, "_R_");

for (const [name, content] of Object.entries(samples))
  test(`markdown renders ${name} as before`, () => {
    expect(
      stableIds(renderToStaticMarkup(<MarkdownViewer content={content} />)),
    ).toMatchSnapshot();
  });

test("streaming closes an open fence and marks that block as writing", () => {
  const html = renderToStaticMarkup(
    <MarkdownViewer
      status="streaming"
      content={"Intro\n\n```ts\nconst partial = 1"}
    />,
  );
  expect(html).toContain('data-slot="code-viewer" data-state="streaming"');
  expect(html).not.toContain("```");
  const done = renderToStaticMarkup(
    <MarkdownViewer content={"```ts\nconst done = 1;\n```\n\nAfter"} />,
  );
  expect(done).not.toContain('data-state="streaming"');
});

test("user plugins and components extend the defaults", () => {
  const shout =
    () => (tree: { children?: { type: string; value?: string }[] }) => {
      for (const node of tree.children ?? [])
        if (node.type === "paragraph")
          for (const child of (node as { children?: { value?: string }[] })
            .children ?? [])
            if (child.value) child.value = child.value.toUpperCase();
    };
  const unsafe = () => (tree: { children?: unknown[] }) => {
    tree.children?.push({
      type: "element",
      tagName: "script",
      properties: {},
      children: [{ type: "text", value: "alert(1)" }],
    });
  };
  const html = renderToStaticMarkup(
    <MarkdownViewer
      content={"quiet [link](https://example.com)"}
      remarkPlugins={[shout]}
      rehypePlugins={[unsafe]}
      components={{ a: ({ children }) => <b data-custom-link>{children}</b> }}
    />,
  );
  expect(html).toContain("QUIET");
  expect(html).toContain("<b data-custom-link");
  expect(html).not.toContain("<script");
});
