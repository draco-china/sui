import { expect, test } from "bun:test";
import { MarkdownViewer } from "@workspace/ui/components/markdown-viewer";
import { renderToStaticMarkup } from "react-dom/server";

const render = (content: string) =>
  renderToStaticMarkup(<MarkdownViewer content={content} theme="light" />);

test("Markdown keeps alerts, task lists, math and footnotes", () => {
  const html = render(`
> [!WARNING]
> Careful.

- [x] done
- [ ] todo

Inline $a^2$ and

$$
b^2
$$

Footnote[^1].

[^1]: Note.

| Left | Right |
| :--- | ----: |
| a | b |
`);
  expect(html).toContain("Careful.");
  // The alert keeps its styled surface and title.
  expect(html).toContain("Warning");
  expect(html).toContain("bg-muted/10");
  expect(html).toMatch(/<td[^>]*text-align:right/);
  expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*checked/);
  expect(html).toMatch(/<code[^>]*math-inline[^>]*>a\^2<\/code>/);
  // Display math renders as a math code block.
  expect(html).toContain("b^2</pre>");
  expect(html).toContain("data-footnote-ref");
});

test("raw HTML cannot restyle the page or ask for passwords", () => {
  const html = render(`
<div class="fixed inset-0 z-50 bg-black">overlay</div>
<a href="https://example.com" class="fixed inset-0">link</a>
<span class="absolute inset-0">span</span>
<code class="language-js absolute">x</code>
<input type="password" placeholder="Password">
`);
  expect(html).not.toContain("fixed inset-0");
  expect(html).not.toContain("absolute");
  expect(html).not.toContain('type="password"');
  expect(html).toContain("overlay");
});
