"use client";

import { Loader } from "@workspace/ui/components/loader";
import { RefreshCw } from "lucide-react";
import type { ComponentProps } from "react";
import { defaultTableLabels, type TableLabels } from "./labels";
import { TooltipButton } from "./tooltip-button";

export type DataTableRefreshProps = Omit<
  ComponentProps<typeof TooltipButton>,
  "children" | "tooltip" | "onClick"
> & {
  onRefresh: () => void;
  loading?: boolean;
  labels?: TableLabels;
};

/** Refresh action usable in any header, with the caller's request lifecycle. */
export function DataTableRefresh({
  onRefresh,
  loading = false,
  disabled = false,
  size = "icon-sm",
  variant = "ghost",
  labels = defaultTableLabels,
  ...props
}: DataTableRefreshProps) {
  return (
    <TooltipButton
      {...props}
      size={size}
      variant={variant}
      tooltip={labels.refresh}
      aria-busy={loading}
      disabled={disabled || loading}
      onClick={onRefresh}
    >
      {loading ? <Loader label={labels.loading} /> : <RefreshCw />}
    </TooltipButton>
  );
}
