"use client";

import type { ComponentProps } from "react";
import { Button } from "./button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

export type TooltipButtonProps = ComponentProps<typeof Button> & {
  /** Tooltip text, also used as the button's accessible name. */
  tooltip: string;
};

/** An icon button that names itself with a tooltip. */
export function TooltipButton({
  tooltip,
  children,
  ...props
}: TooltipButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={<Button type="button" aria-label={tooltip} {...props} />}
        >
          {children}
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
