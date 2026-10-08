"use client";

import { cn } from "cn";
import { ChevronRight, FileCode2 } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "../hooks/use-reduced-motion";
import {
  useHighlightedLines,
  useStreamingScroll,
} from "../hooks/use-viewer-code";
import { useViewerTheme } from "../hooks/use-viewer-theme";
import { useGlassEnabled } from "../lib/glass/context";
import { ViewerCopyButton, ViewerStatus } from "../lib/viewer/controls";
import type { ThemedToken } from "../lib/viewer/shiki";
import { Button } from "./button";
import { GlassSurface } from "./glass";
import { Skeleton } from "./skeleton";

interface CodeLine {
  index: number;
  tokens: ThemedToken[];
  content: string;
  indent: number;
  isFoldable: boolean;
  foldEnd: number;
}

export type CodeViewerLabels = {
  copy: string;
  loading: string;
  error: string;
  empty: string;
  expand: string;
  collapse: string;
  writing: string;
  ready: string;
  copied: string;
  copyFailed: string;
};

export interface CodeViewerProps {
  readonly variant?: "default" | "plain";
  readonly code: string;
  readonly lang?: string;
  readonly theme?: "light" | "dark";
  readonly className?: string;
  readonly glass?: boolean;
  readonly title?: ReactNode;
  readonly labels?: Partial<CodeViewerLabels>;
  readonly status?: "streaming" | "complete";
  readonly showLineNumbers?: boolean;
  readonly highlightLines?: number[];
  readonly maxHeight?: number;
  readonly wrap?: boolean;
  readonly copyable?: boolean;
}

const DEFAULT_CODE_VIEWER_LABELS: CodeViewerLabels = {
  copy: "Copy code",
  loading: "Loading...",
  error: "Unable to highlight code",
  empty: "No code",
  expand: "Expand",
  collapse: "Collapse",
  writing: "Writing",
  ready: "Ready",
  copied: "Copied",
  copyFailed: "Copy failed",
};

const EMPTY_LINES: number[] = [];

export function CodeViewer({
  code,
  variant = "default",
  lang = "typescript",
  theme,
  className,
  glass,
  title,
  labels,
  status = "complete",
  showLineNumbers = true,
  highlightLines = EMPTY_LINES,
  maxHeight = 280,
  wrap = false,
  copyable = true,
}: Readonly<CodeViewerProps>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const glassEnabled = useGlassEnabled(glass);
  const text = { ...DEFAULT_CODE_VIEWER_LABELS, ...labels };
  const { resolvedTheme: appTheme } = useViewerTheme(rootRef);
  const resolvedTheme = theme ?? appTheme;
  const reduceMotion = useReducedMotion() ?? false;
  const viewportRef = useRef<HTMLDivElement>(null);
  const {
    lines: tokenLines,
    failed: highlightError,
    loading: highlightLoading,
  } = useHighlightedLines(code, lang, resolvedTheme);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const highlighted = useMemo(() => new Set(highlightLines), [highlightLines]);
  const streaming = status === "streaming";
  const [hasStreamed, setHasStreamed] = useState(streaming);
  if (streaming && !hasStreamed) setHasStreamed(true);

  const lines = useMemo<CodeLine[]>(() => {
    const parsed = (code ? code.split("\n") : []).map((content, index) => {
      const indent = content.search(/[^ \t]/);
      return {
        index,
        tokens: tokenLines[index] ?? [],
        content,
        indent: indent === -1 ? content.length : indent,
        isFoldable: false,
        foldEnd: index,
      };
    });

    for (let index = 0; index < parsed.length - 1; index++) {
      const line = parsed[index];
      const lastChar = line.content.trimEnd().at(-1);
      if (lastChar !== "{" && lastChar !== "[" && lastChar !== "(") continue;
      let firstContent = index + 1;
      while (
        firstContent < parsed.length &&
        !parsed[firstContent].content.trim()
      )
        firstContent++;
      if (
        firstContent === parsed.length ||
        parsed[firstContent].indent <= line.indent
      )
        continue;
      let nextOutdentIndex = -1;
      for (
        let lineIndex = firstContent;
        lineIndex < parsed.length;
        lineIndex++
      ) {
        if (
          !parsed[lineIndex].content.trim() ||
          parsed[lineIndex].indent > line.indent
        )
          continue;
        nextOutdentIndex = lineIndex;
        break;
      }
      line.isFoldable = true;
      line.foldEnd =
        nextOutdentIndex === -1 ? parsed.length - 1 : nextOutdentIndex - 1;
    }

    return parsed;
  }, [code, tokenLines]);

  const hiddenLines = useMemo(
    () =>
      new Set(
        Array.from(collapsed).flatMap((foldLine) => {
          const line = lines[foldLine];
          if (!line) return [];
          return Array.from(
            { length: line.foldEnd - foldLine },
            (_, index) => foldLine + index + 1,
          );
        }),
      ),
    [collapsed, lines],
  );

  useEffect(() => {
    void code;
    setCollapsed(new Set());
  }, [code]);

  useStreamingScroll(viewportRef, code, streaming);

  function toggleFold(lineIndex: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(lineIndex)) next.delete(lineIndex);
      else next.add(lineIndex);
      return next;
    });
  }

  const showSkeleton = highlightLoading && !streaming && !hasStreamed;
  return (
    <GlassSurface
      ref={rootRef}
      glass={glassEnabled}
      data-slot="code-viewer"
      data-state={status}
      aria-busy={streaming}
      className={cn(
        variant === "plain"
          ? "relative min-w-0 overflow-hidden text-foreground text-sm"
          : "flex min-h-0 w-full flex-col overflow-hidden rounded-2xl bg-muted/80 text-foreground text-sm ring-1 ring-border",
        className,
      )}
    >
      {variant === "default" ? (
        <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-border/70 border-b bg-muted/80 px-3 py-1">
          <FileCode2
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted-foreground/70"
          />
          {title ? (
            <span className="min-w-0 truncate font-medium font-mono text-foreground/80 text-sm">
              {title}
            </span>
          ) : null}
          <span className="font-medium text-muted-foreground/65 text-sm">
            {lang}
          </span>
          <span className="ml-auto">
            <ViewerStatus
              streaming={streaming}
              loading={highlightLoading}
              failed={highlightError}
              reducedMotion={reduceMotion}
              labels={text}
            />
          </span>
          {copyable ? <ViewerCopyButton value={code} labels={text} /> : null}
        </div>
      ) : (
        <div className="absolute end-1 top-1 z-10">
          {copyable && <ViewerCopyButton value={code} labels={text} />}
          <span className="sr-only">
            <ViewerStatus
              streaming={streaming}
              loading={highlightLoading}
              failed={highlightError}
              reducedMotion={reduceMotion}
              labels={text}
            />
          </span>
        </div>
      )}
      <div
        ref={viewportRef}
        tabIndex={0}
        role={streaming ? "log" : undefined}
        aria-live={streaming ? "polite" : undefined}
        className="min-h-0 flex-1 overflow-auto py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        style={{ maxHeight }}
      >
        {showSkeleton && (
          <div role="status" aria-label={text.loading} className="grid px-4">
            {Array.from(
              {
                length: Math.min(
                  lines.length,
                  Math.max(1, Math.ceil(maxHeight / 20)),
                ),
              },
              (_, index) => index + 1,
            ).map((lineNumber) => (
              <Skeleton
                key={lineNumber}
                glass={false}
                className="h-5 w-3/4 rounded-md"
              />
            ))}
            <pre className="sr-only">{code}</pre>
          </div>
        )}
        {!showSkeleton && lines.length > 0 && (
          <table
            className={cn(
              "w-full border-collapse font-mono text-foreground/85 text-sm leading-5",
              wrap ? "table-fixed" : "min-w-max",
            )}
          >
            <tbody>
              {lines.map((line) => {
                if (hiddenLines.has(line.index)) return null;
                const isFolded = collapsed.has(line.index);
                return (
                  <tr
                    key={line.index}
                    className={cn(
                      "group/line h-5 hover:bg-accent/40",
                      highlighted.has(line.index + 1) &&
                        "bg-[var(--code-highlight-bg,color-mix(in_oklch,var(--primary)_10%,transparent))]",
                    )}
                  >
                    {showLineNumbers ? (
                      <td className="w-11 select-none pr-2 text-right text-muted-foreground/50 tabular-nums">
                        {line.index + 1}
                      </td>
                    ) : null}
                    <td className="w-5 select-none">
                      {line.isFoldable ? (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => toggleFold(line.index)}
                          aria-label={isFolded ? text.expand : text.collapse}
                          className="size-4 rounded-xs text-muted-foreground/60"
                        >
                          <ChevronRight
                            className={cn(
                              "size-3 transition-transform motion-reduce:transition-none",
                              !isFolded && "rotate-90",
                            )}
                          />
                        </Button>
                      ) : null}
                    </td>
                    <td
                      className={cn(
                        "min-w-0 pr-4 pl-1",
                        wrap
                          ? "whitespace-pre-wrap break-words"
                          : "whitespace-pre",
                      )}
                    >
                      {line.tokens.length
                        ? line.tokens.map((token, index) => (
                            <span
                              // biome-ignore lint/suspicious/noArrayIndexKey: Tokens have no stable identity beyond their position in a line.
                              key={index}
                              style={{ color: token.color }}
                            >
                              {token.content}
                            </span>
                          ))
                        : line.content || "\u00a0"}
                      {isFolded ? (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => toggleFold(line.index)}
                          className="ml-2 h-4 rounded-xs px-1 text-muted-foreground text-sm"
                        >
                          {line.foldEnd - line.index} lines
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!showSkeleton && lines.length === 0 && (
          <div className="px-4 py-4 font-mono text-muted-foreground text-sm">
            {text.empty}
          </div>
        )}
      </div>
    </GlassSurface>
  );
}

export type { ShikiProviderProps } from "../lib/viewer/shiki-context";
export { ShikiProvider } from "../lib/viewer/shiki-context";
