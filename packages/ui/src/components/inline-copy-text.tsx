"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva } from "class-variance-authority";
import { cn } from "cn";
import type { ReactNode } from "react";
import {
  type ClipboardLabels,
  type ClipboardOptions,
  useClipboard,
} from "../hooks/use-clipboard";
import { withGlass } from "../lib/glass/context";
import { CopyIcon } from "./copy-icon";

type InlineCopyTextProps = Omit<
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
    labels?: ClipboardLabels;
  };

const inlineCopyVariants = cva(
  "group/inline-copy inline-flex min-w-0 max-w-full select-text items-center gap-1.5 rounded-sm border-0 bg-transparent p-0 align-baseline font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[copy-status=pending]:disabled:opacity-100",
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

function InlineCopyTextImplementation({
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
  labels,
  onClick,
  className,
  ...props
}: InlineCopyTextProps) {
  const text = value ?? (typeof children === "string" ? children : null);
  if (text === null)
    throw new Error(
      "InlineCopyText requires value when children is not a string.",
    );
  const { status, copy } = useClipboard(text, {
    disabled,
    resetDelay,
    onCopy,
    onCopyError,
  });
  const feedback = {
    idle: "",
    copied: labels?.copied ?? "Copied",
    error: labels?.failed ?? "Copy failed. Select and copy the text manually.",
    pending: labels?.pending ?? "Copying…",
  }[status];
  return (
    <ButtonPrimitive
      {...props}
      type="button"
      disabled={disabled || status === "pending"}
      data-slot="inline-copy-text"
      data-copy-status={status}
      aria-busy={status === "pending"}
      aria-label={props["aria-label"] ?? labels?.copy ?? `Copy ${text}`}
      className={cn(inlineCopyVariants({ variant, size }), className)}
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
            "opacity-0 group-focus-within/inline-copy:opacity-100 group-focus-within:opacity-100 group-hover/inline-copy:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
        )}
      >
        <CopyIcon
          status={status}
          className={cn("size-3.5", status === "error" && "text-destructive")}
        />
      </span>
      <span role="status" className="sr-only">
        {feedback}
      </span>
    </ButtonPrimitive>
  );
}

export type { InlineCopyTextProps };

const InlineCopyText = withGlass(InlineCopyTextImplementation, "control");

export { InlineCopyText };
