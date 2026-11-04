"use client";

import { Button } from "@workspace/ui/components/button";
import { Separator } from "@workspace/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef } from "react";
import { useDataTableContext } from "../context";
import type { DataTableInstance, DataTablePlugin } from "../types";

export interface BulkAction<TData> {
  readonly label: string;
  readonly icon: ReactNode;
  readonly onClick: (
    rows: readonly TData[],
    table: DataTableInstance<TData>,
  ) => void;
  readonly variant?: "default" | "destructive";
  readonly disabled?: (rows: readonly TData[]) => boolean;
}

type BulkRender<TData> = (
  rows: readonly TData[],
  table: DataTableInstance<TData>,
) => ReactNode;

/** Icon-only buttons; the label is the tooltip and accessible name. */
function iconActions<TData>(
  actions: readonly BulkAction<TData>[],
): BulkRender<TData> {
  return (rows, table) =>
    actions.map((action) => (
      <Tooltip key={action.label}>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={action.label}
              disabled={action.disabled?.(rows)}
              className={
                action.variant === "destructive"
                  ? "rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  : "rounded-full"
              }
              onClick={() => action.onClick(rows, table)}
            />
          }
        >
          {action.icon}
        </TooltipTrigger>
        <TooltipContent>{action.label}</TooltipContent>
      </Tooltip>
    ));
}

function BulkBar<TData>({
  render,
}: {
  render: (
    rows: readonly TData[],
    table: DataTableInstance<TData>,
  ) => ReactNode;
}) {
  const table = useDataTableContext<TData>();
  const reduced = useReducedMotion();
  const bar = useRef<HTMLDivElement>(null);
  const selection = table.selection;
  const count = selection?.rows.length ?? 0;
  const clear = selection?.clear;
  useEffect(() => {
    if (count === 0 || !clear) return;
    // Only Escape pressed in this table clears it, so closing a dialog or a
    // menu, or clearing a field, keeps the selection.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target;
      const root = bar.current?.closest('[data-slot="data-table-root"]');
      const inTable =
        target === document.body ||
        (target instanceof Node && !!root?.contains(target));
      const editing =
        target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable]");
      if (inTable && !editing) clear();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [count, clear]);
  return (
    <AnimatePresence>
      {selection && count > 0 && (
        <motion.div
          ref={bar}
          role="toolbar"
          aria-label={table.labels.bulkToolbar(count)}
          initial={
            reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="pointer-events-auto flex max-w-[calc(100%-1rem)] items-center gap-2 rounded-full border bg-popover p-1.5 ps-4 text-popover-foreground text-sm shadow-lg"
        >
          <span className="whitespace-nowrap font-medium tabular-nums">
            {table.labels.selected(count)}
          </span>
          <Separator
            orientation="vertical"
            className="h-5 data-vertical:self-center"
          />
          <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
            {render(selection.rows, table)}
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  aria-label={table.labels.clearSelection}
                  onClick={selection.clear}
                />
              }
            >
              <X />
            </TooltipTrigger>
            <TooltipContent>{table.labels.clearSelection}</TooltipContent>
          </Tooltip>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * A floating bar above the pagination while rows are selected. Pass actions
 * for icon-only buttons with tooltips, or a render function for custom
 * content. Requires `rowSelection`; Escape clears the selection.
 */
export function bulkActions<TData>(
  actions: readonly BulkAction<TData>[] | BulkRender<TData>,
): DataTablePlugin<TData> {
  const render = typeof actions === "function" ? actions : iconActions(actions);
  return {
    name: "bulkActions",
    slots: { floating: () => <BulkBar render={render} /> },
  };
}
