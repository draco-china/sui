"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@workspace/ui/components/sidebar";
import type * as React from "react";
import { useLayout } from "./layout-provider";
import { NavGroup } from "./nav-group";
import type { NavGroupData } from "./types";

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  /** Brand, app title, or a team switcher. */
  header?: React.ReactNode;
  /** Usually a user menu. */
  footer?: React.ReactNode;
  navGroups?: NavGroupData[];
  /** Shows the edge rail that toggles the sidebar. */
  rail?: boolean;
};

/** Data-driven sidebar that follows the AppShell variant and collapse preferences. */
function AppSidebar({
  header,
  footer,
  navGroups = [],
  rail = true,
  variant,
  collapsible,
  children,
  ...props
}: AppSidebarProps) {
  const layout = useLayout();
  return (
    <Sidebar
      variant={variant ?? layout.variant}
      collapsible={collapsible ?? layout.collapsible}
      {...props}
    >
      {header && <SidebarHeader>{header}</SidebarHeader>}
      <SidebarContent>
        {navGroups.map((group, index) => (
          <NavGroup key={group.title ?? index} {...group} />
        ))}
        {children}
      </SidebarContent>
      {footer && <SidebarFooter>{footer}</SidebarFooter>}
      {rail && <SidebarRail />}
    </Sidebar>
  );
}

export { AppSidebar, type AppSidebarProps };
