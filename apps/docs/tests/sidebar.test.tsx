import { expect, test } from "bun:test";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { renderToStaticMarkup } from "react-dom/server";

test("a group label collapsed to icons takes no clicks and no focus", () => {
  const html = renderToStaticMarkup(
    <SidebarProvider defaultOpen={false}>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Overview</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Dashboard</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>,
  );
  expect(html).toContain('data-collapsible="icon"');
  const label =
    html.match(/<div[^>]*data-slot="sidebar-group-label"[^>]*>/)?.[0] ?? "";
  // Faded and moved up, the label would still sit over the first item.
  expect(label).toContain("group-data-[collapsible=icon]:opacity-0");
  expect(label).toContain("group-data-[collapsible=icon]:pointer-events-none");
  expect(label).toContain("group-data-[collapsible=icon]:invisible");
  // Visibility switches after the fade, not before it.
  expect(label).toContain("transition-[margin,opacity,visibility]");
});
