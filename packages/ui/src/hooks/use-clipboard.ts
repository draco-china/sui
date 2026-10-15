"use client";

import { useEffect, useRef, useState } from "react";

type ClipboardStatus = "idle" | "pending" | "copied" | "error";
type ClipboardLabels = {
  copy?: string;
  pending?: string;
  copied?: string;
  failed?: string;
};
type ClipboardOptions = {
  disabled?: boolean;
  resetDelay?: number;
  onCopy?: (value: string) => void;
  onCopyError?: (error: Error) => void;
};
type ClipboardControllerOptions = Omit<ClipboardOptions, "disabled"> & {
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
      onCopy: (text) => optionsRef.current.onCopy?.(text),
      onCopyError: (error) => optionsRef.current.onCopyError?.(error),
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
  return {
    status,
    copy: (text = value) =>
      options.disabled ? Promise.resolve(false) : controller.copy(text),
    reset: controller.reset,
  };
}

export type { ClipboardLabels, ClipboardOptions, ClipboardStatus };
export { createClipboardController, useClipboard };
