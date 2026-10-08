import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentationLink } from "../src/components/documentation-link";

test("server text and registry links work outside the client router and retain anchor props", () => {
  for (const href of [
    "/llms.txt",
    "/zh-CN/llms-full.txt",
    "/en-US/llms.txt?download=1",
    "/api/llms-markdown?locale=zh-CN&slug=mcp",
    "/r/button.json",
    "#endpoints",
  ]) {
    const html = renderToStaticMarkup(
      <DocumentationLink href={href} className="reference" prefetch>
        Read documentation
      </DocumentationLink>,
    );
    expect(html).toContain(`href="${href.replaceAll("&", "&amp;")}"`);
    expect(html).toContain('class="reference"');
    expect(html).toContain("Read documentation</a>");
    expect(html).not.toContain("prefetch");
  }
});
