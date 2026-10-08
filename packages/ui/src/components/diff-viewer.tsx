"use client";

import { cn } from "cn";
import { diffLines } from "diff";
import { FileCode2 } from "lucide-react";
import { type ReactNode, useMemo, useRef, useState } from "react";
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

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  tokenIndex: number;
  oldLineNo?: number;
  newLineNo?: number;
}

export type DiffViewerLabels = {
  before: string;
  after: string;
  viewMode: string;
  split: string;
  unified: string;
  writing: string;
  loading: string;
  ready: string;
  error: string;
  copy: string;
  copied: string;
  copyFailed: string;
};

export interface DiffViewerProps {
  readonly oldCode: string;
  readonly newCode: string;
  readonly oldTitle?: string;
  readonly newTitle?: string;
  readonly filename?: ReactNode;
  readonly lang?: string;
  readonly theme?: "light" | "dark";
  readonly className?: string;
  readonly glass?: boolean;
  readonly labels?: Partial<DiffViewerLabels>;
  readonly status?: "streaming" | "complete";
  readonly maxHeight?: number;
  readonly copyable?: boolean;
}

const DEFAULT_DIFF_VIEWER_LABELS: DiffViewerLabels = {
  before: "Before",
  after: "After",
  viewMode: "Diff view",
  split: "Split",
  unified: "Unified",
  writing: "Writing",
  loading: "Loading...",
  ready: "Ready",
  error: "Unable to highlight diff",
  copy: "Copy updated code",
  copied: "Copied",
  copyFailed: "Copy failed",
};

export function DiffViewer({
  oldCode,
  newCode,
  oldTitle,
  newTitle,
  filename,
  lang = "typescript",
  theme,
  className,
  glass,
  labels,
  status = "complete",
  maxHeight = 280,
  copyable = true,
}: Readonly<DiffViewerProps>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const glassEnabled = useGlassEnabled(glass);
  const text = { ...DEFAULT_DIFF_VIEWER_LABELS, ...labels };
  const { resolvedTheme: appTheme } = useViewerTheme(rootRef);
  const resolvedTheme = theme ?? appTheme;
  const reduceMotion = useReducedMotion() ?? false;
  const viewportRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"split" | "unified">("split");
  const streaming = status === "streaming";

  const { unified, left, right, added, removed } = useMemo(() => {
    let oldLineNo = 1;
    let newLineNo = 1;
    let added = 0;
    let removed = 0;
    const unified: DiffLine[] = [];
    for (const change of diffLines(oldCode, newCode)) {
      const contents = change.value.split("\n");
      if (change.value.endsWith("\n")) contents.pop();
      for (const content of contents) {
        let type: DiffLine["type"] = "unchanged";
        if (change.added) type = "added";
        else if (change.removed) type = "removed";
        const line: DiffLine = {
          type,
          content,
          tokenIndex: unified.length,
        };
        if (line.type !== "added") line.oldLineNo = oldLineNo++;
        if (line.type !== "removed") line.newLineNo = newLineNo++;
        if (line.type === "added") added++;
        if (line.type === "removed") removed++;
        unified.push(line);
      }
    }

    // Pair replaced lines across panes, then pad only the shorter side.
    const left: (DiffLine | null)[] = [];
    const right: (DiffLine | null)[] = [];
    for (let index = 0; index < unified.length; ) {
      const line = unified[index];
      if (line.type === "unchanged") {
        left.push(line);
        right.push(line);
        index++;
        continue;
      }
      const removedBlock: DiffLine[] = [];
      const addedBlock: DiffLine[] = [];
      while (index < unified.length && unified[index].type !== "unchanged") {
        const changed = unified[index++];
        if (changed.type === "removed") removedBlock.push(changed);
        else addedBlock.push(changed);
      }
      for (
        let pair = 0;
        pair < Math.max(removedBlock.length, addedBlock.length);
        pair++
      ) {
        left.push(removedBlock[pair] ?? null);
        right.push(addedBlock[pair] ?? null);
      }
    }
    return { unified, left, right, added, removed };
  }, [oldCode, newCode]);
  const oldHighlight = useHighlightedLines(oldCode, lang, resolvedTheme);
  const newHighlight = useHighlightedLines(newCode, lang, resolvedTheme);

  useStreamingScroll(viewportRef, `${oldCode}\u0000${newCode}`, streaming);

  return (
    <GlassSurface
      ref={rootRef}
      glass={glassEnabled}
      data-slot="diff-viewer"
      data-state={status}
      aria-busy={streaming}
      className={cn(
        "w-full overflow-hidden rounded-2xl bg-muted/80 text-foreground text-sm",
        className,
      )}
    >
      <div className="flex min-h-10 flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-1.5">
        <FileCode2
          aria-hidden="true"
          className="size-3.5 shrink-0 text-muted-foreground/70"
        />
        {filename ? (
          <span className="min-w-0 truncate font-mono text-foreground/80 text-sm">
            {filename}
          </span>
        ) : null}
        <span className="font-medium text-muted-foreground/65 text-sm">
          {lang}
        </span>
        <span className="font-mono text-primary text-sm tabular-nums">
          +{added}
        </span>
        <span className="font-mono text-destructive text-sm tabular-nums">
          −{removed}
        </span>
        <fieldset
          aria-label={text.viewMode}
          className="ml-auto inline-flex items-center gap-1 border-0 p-0"
        >
          <Button
            variant={view === "split" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setView("split")}
            aria-pressed={view === "split"}
          >
            {text.split}
          </Button>
          <Button
            variant={view === "unified" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setView("unified")}
            aria-pressed={view === "unified"}
          >
            {text.unified}
          </Button>
        </fieldset>
        <ViewerStatus
          streaming={streaming}
          loading={oldHighlight.loading || newHighlight.loading}
          failed={oldHighlight.failed || newHighlight.failed}
          reducedMotion={reduceMotion}
          labels={text}
        />
        {copyable ? <ViewerCopyButton value={newCode} labels={text} /> : null}
      </div>
      <div
        ref={viewportRef}
        tabIndex={0}
        role={streaming ? "log" : undefined}
        aria-live={streaming ? "polite" : undefined}
        className="overflow-auto border-foreground/10 border-t outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        style={{ maxHeight }}
      >
        {view === "unified" ? (
          <table className="w-full min-w-max border-collapse font-mono text-sm leading-5">
            <tbody>
              {unified.map((line) => (
                <DiffRow
                  key={line.tokenIndex}
                  line={line}
                  tokens={
                    line.type === "removed"
                      ? oldHighlight.lines[(line.oldLineNo ?? 1) - 1]
                      : newHighlight.lines[(line.newLineNo ?? 1) - 1]
                  }
                  mode="unified"
                />
              ))}
            </tbody>
          </table>
        ) : (
          <div className="grid min-w-[48rem] grid-cols-2 divide-x divide-border">
            <SplitDiffPane
              title={oldTitle ?? text.before}
              lines={left}
              side="old"
              tokens={oldHighlight.lines}
            />
            <SplitDiffPane
              title={newTitle ?? text.after}
              lines={right}
              side="new"
              tokens={newHighlight.lines}
            />
          </div>
        )}
      </div>
    </GlassSurface>
  );
}

function SplitDiffPane({
  title,
  lines,
  side,
  tokens,
}: Readonly<{
  title: string;
  lines: (DiffLine | null)[];
  side: "old" | "new";
  tokens: ThemedToken[][];
}>) {
  return (
    <div className="min-w-0">
      <div
        className="min-w-0 truncate border-border border-b px-3 py-1.5 text-muted-foreground text-sm"
        title={title}
      >
        {title}
      </div>
      <table className="w-full min-w-max border-collapse font-mono text-sm leading-5">
        <tbody>
          {lines.map((line, index) =>
            line ? (
              <DiffRow
                key={line.tokenIndex}
                line={line}
                tokens={
                  tokens[
                    (side === "old"
                      ? (line.oldLineNo ?? 1)
                      : (line.newLineNo ?? 1)) - 1
                  ]
                }
                mode={side}
              />
            ) : (
              <tr
                // biome-ignore lint/suspicious/noArrayIndexKey: Padding cells are identified by their position in the aligned diff.
                key={index}
                className="h-5 bg-muted/40"
              >
                <td className="w-10" />
                <td />
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

function DiffRow({
  line,
  tokens,
  mode,
}: Readonly<{
  line: DiffLine;
  tokens: ThemedToken[] | undefined;
  mode: "old" | "new" | "unified";
}>) {
  return (
    <tr
      className={cn(
        "h-5",
        line.type === "added" && "bg-primary/10",
        line.type === "removed" && "bg-destructive/10",
      )}
    >
      {mode === "unified" ? (
        <>
          <LineNumber value={line.oldLineNo} />
          <LineNumber value={line.newLineNo} />
          <td
            className={cn(
              "w-5 select-none text-center",
              line.type === "added" && "text-primary",
              line.type === "removed" && "text-destructive",
            )}
          >
            {{ added: "+", removed: "−", unchanged: "" }[line.type]}
          </td>
        </>
      ) : (
        <LineNumber value={mode === "old" ? line.oldLineNo : line.newLineNo} />
      )}
      <td className="min-w-0 whitespace-pre pr-4 pl-1 text-foreground/85">
        {tokens?.length
          ? tokens.map((token, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: Syntax tokens have no stable identity beyond their position in a line.
                key={index}
                style={{ color: token.color }}
              >
                {token.content}
              </span>
            ))
          : line.content || "\u00a0"}
      </td>
    </tr>
  );
}

function LineNumber({ value }: Readonly<{ value?: number }>) {
  return (
    <td className="w-10 select-none pr-2 text-right text-muted-foreground/50 tabular-nums">
      {value ?? ""}
    </td>
  );
}
