"use client";

import { cn } from "cn";
import { type ComponentProps, cloneElement, type ReactElement } from "react";
import { type ClipboardOptions, useClipboard } from "@/hooks/use-clipboard";
import { Button } from "@/components/ui/button";
import { CopyIcon } from "@/components/ui/copy-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface CopyButtonProps
  extends Omit<
      ComponentProps<typeof Button>,
      "value" | "onClick" | "onCopy" | "render"
    >,
    ClipboardOptions {
  readonly value: string;
  /** Renders another button, such as `<InputGroupButton />`, in place of `Button`. */
  readonly render?: ReactElement<{ className?: string }>;
}

/** Copies `value`, with copied and failed feedback in the icon and tooltip. */
export function CopyButton({
  value,
  labels,
  variant = "ghost",
  size = "icon-sm",
  disabled,
  resetDelay,
  onCopy,
  onCopyError,
  feedback,
  render,
  className,
  children,
  ...props
}: Readonly<CopyButtonProps>) {
  const { status, message, copy } = useClipboard(value, {
    disabled,
    resetDelay,
    onCopy,
    onCopyError,
    feedback,
    labels,
  });
  return (
    <>
      {/* The provider keeps the tooltip open while the label changes. */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={cloneElement(
              render ?? <Button variant={variant} size={size} />,
              {
                ...props,
                type: "button",
                "data-slot": "copy-button",
                "data-copy-status": status,
                "aria-label": message,
                "aria-busy": status === "pending",
                disabled: disabled || status === "pending",
                onClick: () => void copy(),
                className: cn(
                  !render &&
                    "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                  render?.props.className,
                  className,
                ),
              },
            )}
          >
            {children ?? (
              <CopyIcon
                status={status}
                aria-hidden="true"
                className="size-3.5"
              />
            )}
          </TooltipTrigger>
          <TooltipContent>{message}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className="sr-only" role="status">
        {status === "copied" || status === "error" ? message : ""}
      </span>
    </>
  );
}
