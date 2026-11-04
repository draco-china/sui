import { describe, expect, test } from "bun:test";
import { BreadcrumbEllipsis } from "@workspace/ui/components/breadcrumb";
import { PaginationEllipsis } from "@workspace/ui/components/pagination";
import {
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { renderToString } from "react-dom/server";

describe("accessible label overrides", () => {
  test("keep the English defaults", () => {
    expect(renderToString(<BreadcrumbEllipsis />)).toContain("More");
    expect(renderToString(<PaginationEllipsis />)).toContain("More pages");
    expect(
      renderToString(
        <SidebarProvider>
          <SidebarTrigger />
        </SidebarProvider>,
      ),
    ).toContain("Toggle Sidebar");
  });

  test("render the text an app passes", () => {
    expect(renderToString(<BreadcrumbEllipsis label="更多" />)).toContain(
      "更多",
    );
    expect(renderToString(<PaginationEllipsis label="更多页面" />)).toContain(
      "更多页面",
    );
    const sidebar = renderToString(
      <SidebarProvider labels={{ toggle: "切换侧边栏" }}>
        <SidebarTrigger />
      </SidebarProvider>,
    );
    expect(sidebar).toContain("切换侧边栏");
    expect(sidebar).not.toContain("Toggle Sidebar");
  });

  test("ellipses expose their label instead of hiding it", () => {
    for (const html of [
      renderToString(<BreadcrumbEllipsis label="更多" />),
      renderToString(<PaginationEllipsis label="更多页面" />),
    ]) {
      const root = html.slice(0, html.indexOf(">") + 1);
      expect(root).not.toContain("aria-hidden");
    }
  });
});
