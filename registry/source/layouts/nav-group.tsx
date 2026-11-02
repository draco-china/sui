"use client";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChevronRight } from "lucide-react";
import type * as React from "react";
import { useLayout } from "@/components/layouts/layout-provider";
import type { NavCollapsible, NavGroupData, NavLink } from "@/components/layouts/types";

function NavBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge className="ms-auto h-5 min-w-5 rounded-full px-1.5 tabular-nums">
      {children}
    </Badge>
  );
}

function linkElement(
  Link: ReturnType<typeof useLayout>["Link"],
  item: NavLink,
  active: boolean,
  onClick?: () => void,
) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-disabled={item.disabled || undefined}
      onClick={onClick}
    />
  );
}

function NavMenuLink({ item }: { item: NavLink }) {
  const { Link, isActive } = useLayout();
  const { setOpenMobile } = useSidebar();
  const active = isActive(item.href);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={item.title}
        render={linkElement(Link, item, active, () => setOpenMobile(false))}
      >
        {item.icon && <item.icon />}
        <span>{item.title}</span>
        {item.badge !== undefined && <NavBadge>{item.badge}</NavBadge>}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavMenuCollapsible({ item }: { item: NavCollapsible }) {
  const { Link, isActive } = useLayout();
  const { setOpenMobile } = useSidebar();
  const childActive = item.items.some((child) => isActive(child.href));
  return (
    <Collapsible
      defaultOpen={childActive}
      className="group/collapsible"
      render={<SidebarMenuItem />}
    >
      <CollapsibleTrigger
        render={<SidebarMenuButton tooltip={item.title} />}
        disabled={item.disabled}
      >
        {item.icon && <item.icon />}
        <span>{item.title}</span>
        {item.badge !== undefined && <NavBadge>{item.badge}</NavBadge>}
        <ChevronRight className="ms-auto transition-transform duration-200 group-data-open/collapsible:rotate-90 rtl:rotate-180 rtl:group-data-open/collapsible:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.items.map((child) => {
            const active = isActive(child.href);
            return (
              <SidebarMenuSubItem key={child.href}>
                <SidebarMenuSubButton
                  isActive={active}
                  render={linkElement(Link, child, active, () =>
                    setOpenMobile(false),
                  )}
                >
                  {child.icon && <child.icon />}
                  <span>{child.title}</span>
                  {child.badge !== undefined && (
                    <NavBadge>{child.badge}</NavBadge>
                  )}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** With the sidebar collapsed to icons, nested links open in a menu beside it. */
function NavMenuDropdown({ item }: { item: NavCollapsible }) {
  const { Link, isActive } = useLayout();
  const childActive = item.items.some((child) => isActive(child.href));
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton
              tooltip={item.title}
              isActive={childActive}
              disabled={item.disabled}
            />
          }
        >
          {item.icon && <item.icon />}
          <span>{item.title}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={4}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {item.items.map((child) => {
              const active = isActive(child.href);
              return (
                <DropdownMenuItem
                  key={child.href}
                  disabled={child.disabled}
                  data-active={active || undefined}
                  className="data-active:bg-accent"
                  render={linkElement(Link, child, active)}
                >
                  {child.icon && <child.icon />}
                  <span className="truncate">{child.title}</span>
                  {child.badge !== undefined && (
                    <NavBadge>{child.badge}</NavBadge>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

type NavGroupProps = NavGroupData & React.ComponentProps<typeof SidebarGroup>;

/** A labelled group of sidebar links and collapsible sections. */
function NavGroup({ title, items, ...props }: NavGroupProps) {
  const { state, isMobile } = useSidebar();
  const iconOnly = state === "collapsed" && !isMobile;
  return (
    <SidebarGroup {...props}>
      {title && <SidebarGroupLabel>{title}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const key = item.href ?? item.title;
          if (!item.items) return <NavMenuLink key={key} item={item} />;
          if (iconOnly) return <NavMenuDropdown key={key} item={item} />;
          return <NavMenuCollapsible key={key} item={item} />;
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export { NavGroup, type NavGroupProps };
