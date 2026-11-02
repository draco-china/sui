"use client";

import { Button } from "@workspace/ui/components/button";
import { cn } from "cn";
import { ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { utilityColumn } from "../columns";
import { useDataTableContext } from "../context";
import type { DataTablePlugin } from "../types";

export interface ExpandableOptions<TData> {
  readonly render: (row: TData) => ReactNode;
  readonly isExpandable?: (row: TData) => boolean;
}

function ExpandToggle({ id }: { id: string }) {
  const table = useDataTableContext();
  const open = table.isExpanded(id);
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-expanded={open}
      aria-label={open ? table.labels.collapseRow : table.labels.expandRow}
      onClick={(event) => {
        event.stopPropagation();
        table.toggleExpanded(id);
      }}
    >
      <ChevronRight
        className={cn(
          "transition-transform rtl:rotate-180",
          open && "rotate-90 rtl:rotate-90",
        )}
      />
    </Button>
  );
}

function ExpandedRow({ children }: { children: ReactNode }) {
  const table = useDataTableContext();
  const reduced = useReducedMotion();
  const colSpan = table.visibleColumns.length;
  return (
    <tr data-slot="data-table-expanded-row" className="bg-muted/30">
      <td colSpan={colSpan} className="p-0">
        <motion.div
          initial={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          className="overflow-hidden"
        >
          <div className="px-4 py-3">{children}</div>
        </motion.div>
      </td>
    </tr>
  );
}

function RowToggle<TData>({ row, index }: { row: TData; index: number }) {
  const table = useDataTableContext<TData>();
  return <ExpandToggle id={table.getRowId(row, index)} />;
}

/** Rows with a toggle that reveals details below them, with height motion. */
export function expandable<TData>(
  options: ExpandableOptions<TData> | ((row: TData) => ReactNode),
): DataTablePlugin<TData> {
  const { render, isExpandable } =
    typeof options === "function"
      ? { render: options, isExpandable: undefined }
      : options;
  const toggle = utilityColumn<TData>("__expand", (row, index) =>
    isExpandable && !isExpandable(row) ? null : (
      <RowToggle row={row} index={index} />
    ),
  );
  return {
    name: "expandable",
    features: { expandable: true },
    columns: (columns) => [toggle, ...columns],
    renderAfterRow: (row, id, table) =>
      table.isExpanded(id) && (
        <ExpandedRow key={`${id}-expanded`}>{render(row)}</ExpandedRow>
      ),
  };
}
