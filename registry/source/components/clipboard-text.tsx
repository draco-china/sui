"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import {
  type ClipboardLabels,
  type ClipboardOptions,
  useClipboard,
} from "@/hooks/use-clipboard";
import type { GlassProps } from "@/lib/glass/with-glass";
import { CopyIcon } from "@/components/ui/copy-icon";
import { InputGroup, InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const clipboardTextVariants = cva("gap-1 font-mono text-sm", {
  variants: {
    variant: {
      // Follows the theme color with a light tint, like other default variants.
      default: "bg-primary/10 text-accent-foreground",
      // A bordered field for cards and panels with their own background.
      outline: "border-border bg-transparent",
      // The neutral secondary fill.
      secondary: "bg-secondary text-secondary-foreground",
      // No fill or border, aligned with surrounding text in lists and tables.
      ghost: "bg-transparent",
    },
    size: { sm: "h-8", default: "h-9", lg: "h-10" },
  },
  defaultVariants: { variant: "default", size: "default" },
});

type ClipboardTextProps = Omit<
  useRender.ComponentProps<"div">,
  "children" | "onCopy"
> &
  ClipboardOptions &
  VariantProps<typeof clipboardTextVariants> & {
    text: string;
    textToCopy?: string;
    labels?: ClipboardLabels;
  } & GlassProps;

function ClipboardText({
  text,
  textToCopy,
  variant = "default",
  size = "default",
  disabled = false,
  resetDelay,
  onCopy,
  onCopyError,
  labels,
  className,
  render,
  glass,
  frosted,
  ...props
}: ClipboardTextProps) {
  const { status, copy } = useClipboard(textToCopy ?? text, {
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
  const label = labels?.copy ?? "Copy to clipboard";
  return useRender({
    defaultTagName: "div",
    render: render ?? <InputGroup glass={glass} frosted={frosted} />,
    state: {
      slot: "clipboard-text",
      variant: variant ?? "default",
      "copy-status": status,
      disabled,
    },
    props: mergeProps<"div">(
      {
        className: cn(
          clipboardTextVariants({ variant, size }),
          disabled && "opacity-50",
          className,
        ),
        children: (
          <>
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                variant === "ghost" ? "ps-0 pe-1" : "px-3",
              )}
              title={text}
            >
              {text}
            </span>
            {/* The tooltip anchors to the addon around the button, so it stays
                open while the button turns busy and changes its label. */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={<InputGroupAddon align="inline-end" />}
                  data-slot="input-group-addon"
                >
                  <InputGroupButton
                    type="button"
                    size={size === "sm" ? "icon-xs" : "icon-sm"}
                    disabled={disabled || status === "pending"}
                    aria-label={status === "copied" ? feedback : label}
                    aria-busy={status === "pending"}
                    onClick={() => void copy()}
                  >
                    <CopyIcon
                      status={status}
                      aria-hidden="true"
                      className={cn(
                        status === "error" && "text-destructive-foreground",
                      )}
                    />
                  </InputGroupButton>
                </TooltipTrigger>
                <TooltipContent>{feedback || label}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="sr-only" role="status">
              {feedback}
            </span>
          </>
        ),
      },
      props,
    ),
  });
}

export type { ClipboardTextProps };

export { ClipboardText, clipboardTextVariants };
