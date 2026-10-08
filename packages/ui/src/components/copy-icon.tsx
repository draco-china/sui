"use client";

import { cn } from "cn";
import type { ClipboardStatus } from "../hooks/use-clipboard";
import {
  type IconInput,
  type IconNode,
  MorphIcon,
  type MorphIconProps,
} from "./morph-icon";

const copyShape: IconNode = [
  ["rect", { width: 14, height: 14, x: 8, y: 8, rx: 2, ry: 2 }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }],
];
const checkShape: IconNode = [["path", { d: "m20 6-11 11-5-5" }]];
const errorShape: IconNode = [["path", { d: "m18 6-12 12M6 6l12 12" }]];
const pendingShape: IconNode = [["path", { d: "M12 2a10 10 0 1 0 10 10" }]];

type CopyIconProps = Omit<
  MorphIconProps,
  "icon" | "from" | "to" | "progress"
> & {
  status?: ClipboardStatus;
  copied?: boolean;
  error?: boolean;
  pending?: boolean;
  idleIcon?: IconInput;
};

function CopyIcon({
  status,
  copied = false,
  error = false,
  pending = false,
  className,
  idleIcon = copyShape,
  ...props
}: CopyIconProps) {
  let state: ClipboardStatus = status ?? "idle";
  if (status === undefined) {
    if (error) state = "error";
    else if (pending) state = "pending";
    else if (copied) state = "copied";
  }
  const icon = {
    idle: idleIcon,
    pending: pendingShape,
    copied: checkShape,
    error: errorShape,
  }[state];
  return (
    <MorphIcon
      icon={icon}
      data-slot="copy-icon"
      data-copy-state={state}
      className={cn(
        state === "pending" && "animate-spin motion-reduce:animate-none",
        state === "error" && "text-destructive",
        className,
      )}
      {...props}
    />
  );
}

export type { CopyIconProps };
export { CopyIcon };
