import type * as React from "react";

export type LayoutVariant = "sidebar" | "floating" | "inset";
export type LayoutCollapsible = "offcanvas" | "icon" | "none";

/** Props every router link receives from the layouts. */
export type LayoutLinkProps = React.ComponentProps<"a"> & { href: string };

type BaseNavItem = {
  title: string;
  icon?: React.ElementType;
  badge?: React.ReactNode;
  disabled?: boolean;
};

export type NavLink = BaseNavItem & { href: string; items?: never };

export type NavCollapsible = BaseNavItem & {
  items: NavLink[];
  href?: never;
};

export type NavItem = NavLink | NavCollapsible;

export type NavGroupData = {
  title?: string;
  items: NavItem[];
};

/** Decides whether a link matches the current location. */
export type NavMatcher = (href: string, currentPath: string) => boolean;
