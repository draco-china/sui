"use client";

import { useEffect, useRef, useState } from "react";
import { type FeedbackOption, useFeedback } from "@/components/ui/feedback";

type ClipboardStatus = "idle" | "pending" | "copied" | "error";
/** English defaults. Pass overrides or `clipboardLabelsZhCN` through `labels`. */
const clipboardLabels = {
  copy: "Copy",
  pending: "Copying…",
  copied: "Copied",
  copyFailed: "Copy failed",
};
const clipboardLabelsZhCN: ClipboardLabels = {
  copy: "复制",
  pending: "正在复制…",
  copied: "已复制",
  copyFailed: "复制失败",
};
type ClipboardLabels = Partial<typeof clipboardLabels>;
type ClipboardOptions = {
  disabled?: boolean;
  resetDelay?: number;
  onCopy?: (value: string) => void;
  onCopyError?: (error: Error) => void;
  /** Haptics for a finished copy; follows `FeedbackProvider` when unset. */
  feedback?: FeedbackOption;
  labels?: ClipboardLabels;
};
type ClipboardControllerOptions = Omit<
  ClipboardOptions,
  "disabled" | "feedback" | "labels"
> & {
  writeText: (value: string) => Promise<void>;
  onStatusChange: (status: ClipboardStatus) => void;
};

// The controller owns each async attempt, so late results never update a newer
// value, a second attempt, or an unmounted component.
function createClipboardController(options: ClipboardControllerOptions) {
  let active = true;
  let pending = false;
  let attempt = 0;
  let copiedValue: string | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const clear = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const reset = () => {
    attempt++;
    pending = false;
    copiedValue = undefined;
    clear();
    if (active) options.onStatusChange("idle");
  };
  return {
    activate() {
      active = true;
    },
    reset,
    synchronize(value: string) {
      // An uncontrolled input can synchronize after copying its live DOM value.
      if (value !== copiedValue) reset();
    },
    dispose() {
      active = false;
      attempt++;
      pending = false;
      copiedValue = undefined;
      clear();
    },
    async copy(value: string): Promise<boolean> {
      if (!active || pending) return false;
      const current = ++attempt;
      copiedValue = value;
      pending = true;
      clear();
      options.onStatusChange("pending");
      try {
        await options.writeText(value);
      } catch (reason) {
        if (!active || current !== attempt) return false;
        pending = false;
        const error =
          reason instanceof Error ? reason : new Error(String(reason));
        options.onStatusChange("error");
        options.onCopyError?.(error);
        return false;
      }
      if (!active || current !== attempt) return false;
      pending = false;
      options.onStatusChange("copied");
      const delay = options.resetDelay ?? 1500;
      timer = setTimeout(
        () => {
          timer = undefined;
          if (active && current === attempt) options.onStatusChange("idle");
        },
        Number.isFinite(delay) ? Math.max(0, delay) : 1500,
      );
      options.onCopy?.(value);
      return true;
    },
  };
}

function useClipboard(value: string, options: ClipboardOptions = {}) {
  const [status, setStatus] = useState<ClipboardStatus>("idle");
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const trigger = useFeedback(options.feedback);
  const [controller] = useState(() =>
    createClipboardController({
      writeText: async (text) => {
        if (
          typeof navigator === "undefined" ||
          !navigator.clipboard?.writeText
        ) {
          throw new Error(
            "Clipboard access is unavailable. Select and copy the text manually.",
          );
        }
        await navigator.clipboard.writeText(text);
      },
      onStatusChange: setStatus,
      onCopy: (text) => {
        trigger("success");
        optionsRef.current.onCopy?.(text);
      },
      onCopyError: (error) => {
        trigger("error");
        optionsRef.current.onCopyError?.(error);
      },
      get resetDelay() {
        return optionsRef.current.resetDelay;
      },
    }),
  );
  useEffect(() => {
    controller.activate();
    return () => controller.dispose();
  }, [controller]);
  useEffect(() => {
    if (options.disabled) controller.reset();
    else controller.synchronize(value);
  }, [controller, value, options.disabled]);
  const text = { ...clipboardLabels, ...options.labels };
  return {
    status,
    /** The label for the current status: the copy action while idle. */
    message: {
      idle: text.copy,
      pending: text.pending,
      copied: text.copied,
      error: text.copyFailed,
    }[status],
    copy: (text = value) =>
      options.disabled ? Promise.resolve(false) : controller.copy(text),
    reset: controller.reset,
  };
}

export type { ClipboardLabels, ClipboardOptions, ClipboardStatus };
export {
  clipboardLabels,
  clipboardLabelsZhCN,
  createClipboardController,
  useClipboard,
};
