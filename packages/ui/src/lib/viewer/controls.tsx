"use client";

import { cn } from "cn";
import { AlertCircle, Check, LoaderCircle } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "../../components/button";
import { CopyIcon } from "../../components/copy-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/tooltip";
import { useClipboard } from "../../hooks/use-clipboard";

type ViewerButtonProps = ComponentProps<typeof Button> & { tooltip: string };
function ViewerButton({ tooltip, children, ...props }: ViewerButtonProps) {
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

function ViewerCopyButton({
  value,
  labels,
}: {
  value: string;
  labels: { copy: string; copied: string; copyFailed: string };
}) {
  const { status, copy } = useClipboard(value);
  const message = {
    idle: labels.copy,
    pending: labels.copy,
    copied: labels.copied,
    error: labels.copyFailed,
  }[status];
  return (
    <>
      <ViewerButton
        variant="ghost"
        size="icon-sm"
        onClick={() => void copy()}
        disabled={status === "pending"}
        tooltip={message}
        aria-busy={status === "pending"}
        className="text-muted-foreground hover:bg-background/70 hover:text-foreground"
      >
        <CopyIcon
          status={status}
          aria-hidden="true"
          className={cn("size-3.5", status === "error" && "text-destructive")}
        />
      </ViewerButton>
      <span className="sr-only" role="status">
        {status === "copied" || status === "error" ? message : ""}
      </span>
    </>
  );
}

function ViewerStatus({
  streaming,
  loading,
  failed,
  reducedMotion,
  labels,
}: {
  streaming: boolean;
  loading: boolean;
  failed: boolean;
  reducedMotion: boolean;
  labels: { writing: string; loading: string; ready: string; error: string };
}) {
  let state: keyof typeof labels = "ready";
  if (failed) state = "error";
  else if (streaming) state = "writing";
  else if (loading) state = "loading";
  const Icon = {
    ready: Check,
    error: AlertCircle,
    writing: LoaderCircle,
    loading: LoaderCircle,
  }[state];
  const color = {
    ready: "text-muted-foreground",
    error: "text-destructive",
    writing: "text-primary",
    loading: "text-primary",
  }[state];
  return (
    <span
      role="status"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 font-medium text-sm",
        color,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "size-3.5",
          (streaming || loading) && !failed && !reducedMotion && "animate-spin",
        )}
      />
      {labels[state]}
    </span>
  );
}

export type { ViewerButtonProps };
export { ViewerButton, ViewerCopyButton, ViewerStatus };
