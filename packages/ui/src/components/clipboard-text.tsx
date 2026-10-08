"use client";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "cn";
import {
  type ClipboardLabels,
  type ClipboardOptions,
  useClipboard,
} from "../hooks/use-clipboard";
import { withGlass } from "../lib/glass/context";
import { CopyIcon } from "./copy-icon";
import { InputGroup, InputGroupAddon, InputGroupButton } from "./input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

type ClipboardTextProps = Omit<
  useRender.ComponentProps<"div">,
  "children" | "onCopy"
> &
  ClipboardOptions & {
    text: string;
    textToCopy?: string;
    size?: "sm" | "default" | "lg";
    labels?: ClipboardLabels;
  };

function ClipboardTextImplementation({
  text,
  textToCopy,
  size = "default",
  disabled = false,
  resetDelay,
  onCopy,
  onCopyError,
  labels,
  className,
  render,
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
    render: render ?? <InputGroup />,
    state: { slot: "clipboard-text", "copy-status": status, disabled },
    props: mergeProps<"div">(
      {
        className: cn(
          "gap-1 font-mono",
          { sm: "h-8 text-sm", default: "h-9 text-sm", lg: "h-10 text-sm" }[
            size
          ] ?? "h-9 text-sm",
          disabled && "opacity-50",
          className,
        ),
        children: (
          <>
            <span className="min-w-0 flex-1 truncate px-3" title={text}>
              {text}
            </span>
            <InputGroupAddon align="inline-end">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
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
                            status === "error" && "text-destructive",
                          )}
                        />
                      </InputGroupButton>
                    }
                  />
                  <TooltipContent>{feedback || label}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </InputGroupAddon>
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

const ClipboardText = withGlass(ClipboardTextImplementation, "scope");

export { ClipboardText };
