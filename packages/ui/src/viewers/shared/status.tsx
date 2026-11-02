"use client";

import { cn } from "cn";
import { AlertCircle, LoaderCircle } from "lucide-react";

/**
 * The writing / loading / error line in a viewer header. Once content is
 * ready the line disappears; screen readers still hear that it finished.
 */
export function ViewerStatus({
  streaming,
  loading,
  failed,
  reducedMotion,
  labels,
}: {
  streaming: boolean;
  loading: boolean;
  failed: boolean;
  reducedMotion: boolean | null;
  labels: { writing: string; loading: string; ready: string; error: string };
}) {
  let state: keyof typeof labels = "ready";
  if (failed) state = "error";
  else if (streaming) state = "writing";
  else if (loading) state = "loading";
  if (state === "ready")
    return (
      <span role="status" className="sr-only">
        {labels.ready}
      </span>
    );
  const Icon = {
    error: AlertCircle,
    writing: LoaderCircle,
    loading: LoaderCircle,
  }[state];
  const color = {
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
