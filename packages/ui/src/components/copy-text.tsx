"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva } from "class-variance-authority";
import { cn } from "cn";
import type { ReactNode } from "react";
import { type ClipboardOptions, useClipboard } from "../hooks/use-clipboard";
import { CopyIcon } from "./copy-icon";

type CopyTextProps = Omit<
  ButtonPrimitive.Props,
  "children" | "onCopy" | "value" | "variant" | "size"
> &
  ClipboardOptions & {
    children: ReactNode;
    value?: string;
    variant?: "default" | "muted";
    size?: "sm" | "default";
    truncate?: boolean;
    iconVisibility?: "hover" | "always";
  };

const copyTextVariants = cva(
  "group/copy-text inline-flex min-w-0 max-w-full select-text items-center gap-1.5 rounded-sm border-0 bg-transparent p-0 align-baseline font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[copy-status=pending]:disabled:opacity-100",
  {
    variants: {
      variant: {
        default: "text-foreground",
        muted:
          "text-muted-foreground hover:text-foreground focus-visible:text-foreground",
      },
      size: {
        default: "text-sm leading-5",
        sm: "text-xs leading-4",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function CopyText({
  children,
  value,
  variant = "default",
  size = "default",
  truncate = true,
  iconVisibility = "hover",
  disabled = false,
  resetDelay,
  onCopy,
  onCopyError,
  feedback,
  labels,
  onClick,
  className,
  ...props
}: CopyTextProps) {
  const text = value ?? (typeof children === "string" ? children : null);
  if (text === null)
    throw new Error("CopyText requires value when children is not a string.");
  const { status, message, copy } = useClipboard(text, {
    disabled,
    resetDelay,
    onCopy,
    onCopyError,
    feedback,
    labels,
  });
  return (
    <ButtonPrimitive
      {...props}
      type="button"
      disabled={disabled || status === "pending"}
      data-slot="copy-text"
      data-copy-status={status}
      aria-busy={status === "pending"}
      aria-label={props["aria-label"] ?? labels?.copy ?? `Copy ${text}`}
      className={cn(copyTextVariants({ variant, size }), className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) void copy();
      }}
    >
      <code className={cn("min-w-0 font-mono", truncate && "truncate")}>
        {children}
      </code>
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex size-3.5 shrink-0 items-center justify-center transition-opacity motion-reduce:transition-none",
          status === "idle" &&
            iconVisibility === "hover" &&
            "opacity-0 group-focus-within/copy-text:opacity-100 group-focus-within:opacity-100 group-hover/copy-text:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
        )}
      >
        <CopyIcon status={status} className="size-3.5" />
      </span>
      <span role="status" className="sr-only">
        {status === "idle" ? "" : message}
      </span>
    </ButtonPrimitive>
  );
}

export type { CopyTextProps };

export { CopyText, copyTextVariants };
