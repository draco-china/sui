"use client";

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import { cn } from "cn";
import type * as React from "react";

const lineClassName =
  "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch";

function Separator({
  className,
  orientation = "horizontal",
  children,
  ...props
}: SeparatorPrimitive.Props & { children?: React.ReactNode }) {
  if (children == null || children === false)
    return (
      <SeparatorPrimitive
        data-slot="separator"
        orientation={orientation}
        className={cn(lineClassName, className)}
        {...props}
      />
    );
  // Text sits between two lines instead of masking one line with a
  // background, so the separator works on any surface, including glass. The
  // text stays readable to assistive technology outside the separator role.
  const vertical = orientation === "vertical";
  const line = cn(
    "shrink-0 bg-border",
    vertical ? "w-px flex-1" : "h-px min-w-4 flex-1",
  );
  return (
    <div
      data-slot="separator"
      data-orientation={orientation}
      data-content=""
      className={cn(
        "flex shrink-0 items-center gap-3 text-muted-foreground text-xs",
        vertical ? "flex-col self-stretch" : "w-full",
        typeof className === "string" ? className : undefined,
      )}
    >
      <SeparatorPrimitive
        data-slot="separator-line"
        orientation={orientation}
        className={line}
        {...props}
      />
      {/* Vertical text runs along a vertical separator: CJK stays upright and
          Latin text turns with the line. */}
      <span
        data-slot="separator-content"
        className={cn("shrink-0", vertical && "[writing-mode:vertical-rl]")}
      >
        {children}
      </span>
      <span
        aria-hidden="true"
        data-slot="separator-line"
        data-orientation={orientation}
        className={line}
      />
    </div>
  );
}

export { Separator };
