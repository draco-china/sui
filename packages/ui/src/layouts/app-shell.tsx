"use client";

import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { cn } from "cn";
import type * as React from "react";
import { LayoutProvider, type LayoutProviderProps } from "./layout-provider";

export const MAIN_CONTENT_ID = "main-content";

type AppShellProps = LayoutProviderProps &
  React.ComponentProps<typeof SidebarProvider> & {
    skipLabel?: string;
  };

/**
 * Sidebar application frame: preferences and a skip link around an
 * AppSidebar and an AppInset.
 */
function AppShell({
  children,
  skipLabel = "Skip to main content",
  variant,
  defaultVariant,
  onVariantChange,
  collapsible,
  defaultCollapsible,
  onCollapsibleChange,
  currentPath,
  linkComponent,
  onNavigate,
  matcher,
  ...props
}: AppShellProps) {
  return (
    <LayoutProvider
      variant={variant}
      defaultVariant={defaultVariant}
      onVariantChange={onVariantChange}
      collapsible={collapsible}
      defaultCollapsible={defaultCollapsible}
      onCollapsibleChange={onCollapsibleChange}
      currentPath={currentPath}
      linkComponent={linkComponent}
      onNavigate={onNavigate}
      matcher={matcher}
    >
      <SidebarProvider {...props}>
        <a
          href={`#${MAIN_CONTENT_ID}`}
          className="fixed start-4 top-4 z-999 -translate-y-24 rounded-3xl bg-primary px-4 py-2 font-medium text-primary-foreground text-sm opacity-0 shadow-md transition focus-visible:translate-y-0 focus-visible:opacity-100"
        >
          {skipLabel}
        </a>
        {children}
      </SidebarProvider>
    </LayoutProvider>
  );
}

/** Content region beside the sidebar and the page's main landmark. */
function AppInset({
  className,
  ...props
}: React.ComponentProps<typeof SidebarInset>) {
  return (
    <SidebarInset
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className={cn(
        "@container/content min-w-0 outline-none",
        // A fixed AppMain scrolls inside the frame instead of the page.
        "has-data-[layout=fixed]:h-svh has-data-[layout=fixed]:overflow-hidden",
        "md:peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(--spacing(4)))]",
        className,
      )}
      {...props}
    />
  );
}

export { AppInset, AppShell, type AppShellProps };
