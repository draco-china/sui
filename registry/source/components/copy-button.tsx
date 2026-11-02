"use client";

import { cn } from "cn";
import { useClipboard } from "@/hooks/use-clipboard";
import { CopyIcon } from "@/components/ui/copy-icon";
import { TooltipButton, type TooltipButtonProps } from "@/components/ui/tooltip-button";

export const copyButtonLabels = {
  copy: "Copy",
  copied: "Copied",
  copyFailed: "Copy failed",
};

export type CopyButtonLabels = typeof copyButtonLabels;

export const copyButtonLabelsZhCN: CopyButtonLabels = {
  copy: "复制",
  copied: "已复制",
  copyFailed: "复制失败",
};

export interface CopyButtonProps
  extends Omit<TooltipButtonProps, "tooltip" | "value" | "onClick"> {
  readonly value: string;
  readonly labels?: Partial<CopyButtonLabels>;
}

/** Copies `value`, with copied and failed feedback in the icon and tooltip. */
export function CopyButton({
  value,
  labels,
  variant = "ghost",
  size = "icon-sm",
  disabled,
  className,
  ...props
}: Readonly<CopyButtonProps>) {
  const text = { ...copyButtonLabels, ...labels };
  const { status, copy } = useClipboard(value);
  const message = {
    idle: text.copy,
    pending: text.copy,
    copied: text.copied,
    error: text.copyFailed,
  }[status];
  return (
    <>
      <TooltipButton
        {...props}
        variant={variant}
        size={size}
        tooltip={message}
        disabled={disabled || status === "pending"}
        aria-busy={status === "pending"}
        onClick={() => void copy(value)}
        className={cn(
          "text-muted-foreground hover:bg-background/70 hover:text-foreground",
          className,
        )}
      >
        <CopyIcon
          status={status}
          aria-hidden="true"
          className={cn(
            "size-3.5",
            status === "copied" && "text-primary",
            status === "error" && "text-destructive",
          )}
        />
      </TooltipButton>
      <span className="sr-only" role="status">
        {status === "copied" || status === "error" ? message : ""}
      </span>
    </>
  );
}
