"use client";

import { Button } from "@workspace/ui/components/button";
import { CopyIcon } from "@workspace/ui/components/copy-icon";
import {
  type ClipboardStatus,
  createClipboardController,
} from "@workspace/ui/hooks/use-clipboard";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../lib/i18n";

const markdownCache = new Map<string, string>();
function MarkdownCopyButton({
  markdownUrl,
  locale,
}: {
  markdownUrl: string;
  locale: Locale;
}) {
  const [status, setStatus] = useState<ClipboardStatus>("idle");
  const request = useRef<AbortController | null>(null);
  const [controller] = useState(() =>
    createClipboardController({
      onStatusChange: setStatus,
      writeText: async (url) => {
        const clipboard = navigator.clipboard;
        if (!clipboard) throw new Error("Clipboard unavailable");
        const cached = markdownCache.get(url);
        if (cached !== undefined) return clipboard.writeText(cached);
        const abort = new AbortController();
        request.current = abort;
        const markdown = fetch(url, { signal: abort.signal }).then(
          async (response) => {
            if (!response.ok)
              throw new Error(`Markdown request failed: ${response.status}`);
            const text = await response.text();
            if (abort.signal.aborted)
              throw new DOMException("Cancelled", "AbortError");
            if (markdownCache.size >= 64)
              markdownCache.delete(markdownCache.keys().next().value ?? "");
            markdownCache.set(url, text);
            return text;
          },
        );
        try {
          if (typeof ClipboardItem !== "undefined" && clipboard.write) {
            await clipboard.write([
              new ClipboardItem({
                "text/plain": markdown.then(
                  (text) => new Blob([text], { type: "text/plain" }),
                ),
              }),
            ]);
          } else {
            await clipboard.writeText(await markdown);
          }
        } finally {
          if (request.current === abort) request.current = null;
        }
      },
    }),
  );
  useEffect(() => {
    controller.activate();
    return () => {
      request.current?.abort();
      controller.dispose();
    };
  }, [controller]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Route changes invalidate an in-flight copy and its feedback.
  useEffect(() => {
    request.current?.abort();
    controller.reset();
  }, [controller, markdownUrl]);
  const labels =
    locale === "zh-CN"
      ? {
          idle: "复制 Markdown",
          pending: "正在复制 Markdown",
          copied: "Markdown 已复制",
          error: "复制失败",
        }
      : {
          idle: "Copy Markdown",
          pending: "Copying Markdown",
          copied: "Markdown copied",
          error: "Copy failed",
        };
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={status === "pending"}
      aria-busy={status === "pending"}
      aria-label={labels[status]}
      onClick={() => void controller.copy(markdownUrl)}
      className="gap-2"
    >
      <CopyIcon
        status={status}
        className={
          status === "error"
            ? "size-3.5 text-destructive"
            : "size-3.5 text-muted-foreground"
        }
      />
      <span className="grid text-center">
        {Object.entries(labels).map(([state, label]) => (
          <span
            key={state}
            aria-hidden={state !== status || undefined}
            className={
              state === status
                ? "col-start-1 row-start-1"
                : "invisible col-start-1 row-start-1"
            }
          >
            {label}
          </span>
        ))}
      </span>
      <span role="status" className="sr-only">
        {status === "copied" || status === "error" ? labels[status] : ""}
      </span>
    </Button>
  );
}

export { MarkdownCopyButton };
