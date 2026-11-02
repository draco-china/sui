import { cn } from "cn";
import type * as React from "react";

type AppMainProps = React.ComponentProps<"div"> & {
  /** Fills the remaining height and scrolls inside, for boards and tables. */
  fixed?: boolean;
  /** Spans the full width instead of centering at 80rem. */
  fluid?: boolean;
};

/** Page content region. The landmark is the surrounding AppShell inset. */
function AppMain({
  fixed = false,
  fluid = false,
  className,
  ...props
}: AppMainProps) {
  return (
    <div
      data-slot="app-main"
      data-layout={fixed ? "fixed" : "auto"}
      className={cn(
        // Even padding, aligned with AppHeader's 16px inline edge.
        "p-4",
        fixed && "flex min-h-0 grow flex-col overflow-auto",
        !fluid &&
          "@7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl",
        className,
      )}
      {...props}
    />
  );
}

export { AppMain, type AppMainProps };
