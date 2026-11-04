"use client";

import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import { cn } from "cn";
import * as React from "react";

type AppHeaderProps = React.ComponentProps<"header"> & {
  /** Sticks to the top of its scroll container and gains a shadow once content scrolls under it. */
  fixed?: boolean;
  /** Shows the sidebar toggle. Turn off in layouts without an AppShell sidebar. */
  sidebarTrigger?: boolean;
  /** Placed after the toggle, usually a Breadcrumb. */
  breadcrumb?: React.ReactNode;
};

/** Watches a marker above the header, so any scrolling ancestor works. */
function useScrolledPast(enabled: boolean) {
  const marker = React.useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const node = marker.current;
    if (!enabled || !node || typeof IntersectionObserver === "undefined")
      return;
    const observer = new IntersectionObserver(([entry]) =>
      setScrolled(entry ? !entry.isIntersecting : false),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);
  return { marker, scrolled: enabled && scrolled };
}

function AppHeader({
  fixed = false,
  sidebarTrigger = true,
  breadcrumb,
  className,
  children,
  ...props
}: AppHeaderProps) {
  const { marker, scrolled } = useScrolledPast(fixed);
  return (
    <>
      {fixed && <div ref={marker} aria-hidden className="-mb-px h-px" />}
      <header
        data-slot="app-header"
        data-fixed={fixed || undefined}
        data-scrolled={scrolled || undefined}
        className={cn(
          "z-40 flex h-16 shrink-0 items-center gap-3 px-4 transition-shadow sm:gap-4",
          "data-fixed:sticky data-fixed:top-0 data-fixed:rounded-t-[inherit]",
          "data-scrolled:bg-background/70 data-scrolled:shadow-sm data-scrolled:backdrop-blur-lg",
          className,
        )}
        {...props}
      >
        {sidebarTrigger && (
          <>
            {/* The header's icon size, as its toggles and actions */}
            <SidebarTrigger size="icon" className="-ms-1" />
            <Separator
              orientation="vertical"
              className="data-vertical:h-5 data-vertical:self-center"
            />
          </>
        )}
        {breadcrumb}
        {children}
      </header>
    </>
  );
}

export { AppHeader, type AppHeaderProps };
