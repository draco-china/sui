"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ReactElement, ReactNode } from "react";

/**
 * Names an icon control with a tooltip, as SUI's TooltipButton does. `render`
 * is the control itself: a button, or a menu's or popover's trigger.
 */
export function DataTableIconTooltip({
  label,
  render,
  children,
}: {
  label: string;
  render: ReactElement;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={render}>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
