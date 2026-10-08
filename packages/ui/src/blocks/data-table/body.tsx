"use client";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { RowData } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { TableCell, TableRow } from "@workspace/ui/components/table";
import { cn } from "cn";
import { GripVertical, Inbox } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { defaultTableLabels, type TableLabels } from "./labels";
import { type Cell, type Column, flexRender, type Row } from "./types";

const TABLE_ROW_CLASS_NAME = "group/row bg-background";
const TABLE_CELL_STATE_CLASS_NAME = "bg-inherit bg-clip-padding";
const TABLE_ROW_COLOR_TRANSITION =
  "color 150ms cubic-bezier(0.4, 0, 0.2, 1), background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), border-color 150ms cubic-bezier(0.4, 0, 0.2, 1)";

/** Measured left and right offsets for sticky table columns. */
export interface TablePinnedColumnOffsets {
  start: Record<string, number>;
  end: Record<string, number>;
  dragWidth: number;
  headerTop: number[];
}

/** Renders loading, empty, static, and sortable Table rows. */
export function TableBody<TData extends RowData>({
  rows,
  visibleColumns,
  visibleColumnCount,
  dragSort,
  loading,
  loadingRows,
  paddingClass,
  emptyFallbackText,
  onRetry,
  pinnedOffsets,
  labels = defaultTableLabels,
}: Readonly<{
  rows: Row<TData>[];
  visibleColumns: ReturnType<Row<TData>["getVisibleCells"]>[number]["column"][];
  visibleColumnCount: number;
  dragSort: boolean;
  loading: boolean;
  loadingRows: number;
  paddingClass: string;
  emptyFallbackText?: ReactNode;
  onRetry?: () => void;
  pinnedOffsets: TablePinnedColumnOffsets;
  labels?: TableLabels;
}>) {
  const emptyRow = (
    <TableRow data-slot="ui-table-row" className={TABLE_ROW_CLASS_NAME}>
      <TableCell
        colSpan={visibleColumnCount}
        className={cn("h-32", TABLE_CELL_STATE_CLASS_NAME)}
      >
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox />
            </EmptyMedia>
            <EmptyTitle>{emptyFallbackText ?? labels.noData}</EmptyTitle>
          </EmptyHeader>
          {onRetry && (
            <EmptyContent>
              <Button variant="outline" size="sm" onClick={onRetry}>
                {labels.retry}
              </Button>
            </EmptyContent>
          )}
        </Empty>
      </TableCell>
    </TableRow>
  );

  if (loading) {
    return Array.from({ length: loadingRows }, (_, index) => (
      <TableRow
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are fixed placeholders.
        key={`skeleton-row-${index}`}
        className={TABLE_ROW_CLASS_NAME}
      >
        {dragSort && (
          <TableCell
            data-ui-table-drag-column=""
            className={cn(
              "sticky inset-s-0 z-20 w-10 p-2 text-center align-middle",
              TABLE_CELL_STATE_CLASS_NAME,
            )}
          >
            <Skeleton data-slot="ui-table-skeleton" className="size-4" />
          </TableCell>
        )}
        {visibleColumns.map((column) => (
          <TableCell
            key={column.id}
            className={getPinnedColumnClassName(
              column,
              cn(
                "border-b",
                TABLE_CELL_STATE_CLASS_NAME,
                column.columnDef.meta?.className,
              ),
            )}
            style={getPinnedColumnStyle(column, pinnedOffsets)}
            data-ui-table-column-id={column.id}
          >
            <Skeleton data-slot="ui-table-skeleton" className="h-4 w-full" />
          </TableCell>
        ))}
      </TableRow>
    ));
  }

  if (dragSort) {
    return (
      <SortableContext
        items={rows.map((row) => row.id)}
        strategy={verticalListSortingStrategy}
      >
        {rows.map((row) => (
          <SortableRow
            key={row.id}
            row={row}
            paddingClass={paddingClass}
            labels={labels}
          >
            {row.getVisibleCells().map((cell) => (
              <BodyCell
                key={cell.id}
                cell={cell}
                paddingClass={paddingClass}
                pinnedOffsets={pinnedOffsets}
              />
            ))}
          </SortableRow>
        ))}
        {rows.length === 0 && emptyRow}
      </SortableContext>
    );
  }

  if (rows.length === 0) return emptyRow;
  return rows.map((row) => (
    <TableRow
      key={row.id}
      data-state={row.getIsSelected() && "selected"}
      className={TABLE_ROW_CLASS_NAME}
    >
      {row.getVisibleCells().map((cell) => (
        <BodyCell
          key={cell.id}
          cell={cell}
          paddingClass={paddingClass}
          pinnedOffsets={pinnedOffsets}
        />
      ))}
    </TableRow>
  ));
}

function BodyCell<TData extends RowData>({
  cell,
  paddingClass,
  pinnedOffsets,
}: Readonly<{
  cell: Cell<TData, unknown>;
  paddingClass: string;
  pinnedOffsets: TablePinnedColumnOffsets;
}>) {
  const meta = cell.column.columnDef.meta;
  const pinned = cell.column.getIsPinned();
  const align = meta?.align ?? (pinned === "end" ? "end" : pinned || undefined);

  return (
    <TableCell
      className={getPinnedColumnClassName(
        cell.column,
        cn(
          "border-b",
          TABLE_CELL_STATE_CLASS_NAME,
          paddingClass,
          align === "center" && "text-center",
          align === "end" && "text-end",
          align === "start" && "text-start",
          meta?.className,
        ),
      )}
      style={getPinnedColumnStyle(cell.column, pinnedOffsets)}
      data-ui-table-column-id={cell.column.id}
    >
      <div
        data-slot="data-table-cell-content"
        className={cn(
          "flex min-w-0 items-center gap-2",
          align === "center" && "justify-center",
          align === "end" && "justify-end",
        )}
      >
        {flexRender(cell.column.columnDef.cell, cell.getContext())}
      </div>
    </TableCell>
  );
}

function SortableRow<TData extends RowData>({
  row,
  children,
  paddingClass,
  labels,
}: Readonly<{
  row: Row<TData>;
  children: ReactNode;
  paddingClass: string;
  labels: TableLabels;
}>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.id,
  });

  return (
    <TableRow
      ref={setNodeRef}
      data-state={row.getIsSelected() && "selected"}
      className={TABLE_ROW_CLASS_NAME}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: [transition, TABLE_ROW_COLOR_TRANSITION]
          .filter(Boolean)
          .join(", "),
        opacity: isDragging ? 0.5 : 1,
        position: isDragging ? "relative" : undefined,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <TableCell
        data-ui-table-drag-column=""
        className={cn(
          "border-b",
          paddingClass,
          TABLE_CELL_STATE_CLASS_NAME,
          "sticky inset-s-0 z-20 w-10 px-2 text-center",
        )}
      >
        <Button
          variant="ghost"
          size="icon-xs"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none active:cursor-grabbing"
          aria-label={labels.dragReorder}
        >
          <GripVertical />
        </Button>
      </TableCell>
      {children}
    </TableRow>
  );
}

/** Returns sticky-column classes shared by table headers and body cells. */
export function getPinnedColumnClassName<TData extends RowData>(
  column: Column<TData, unknown>,
  className?: string,
) {
  const pinned = column.getIsPinned();

  return cn(
    column.columnDef.meta?.__uiTableFixedSize !== undefined && "truncate",
    pinned && "sticky z-10",
    className,
  );
}

/** Computes sticky-column inline offsets after measured widths are applied. */
export function getPinnedColumnStyle<TData extends RowData>(
  column: Column<TData, unknown>,
  offsets: TablePinnedColumnOffsets,
): CSSProperties {
  const pinned = column.getIsPinned();
  const style: CSSProperties = {};
  const fixedSize = column.columnDef.meta?.__uiTableFixedSize;

  if (typeof fixedSize === "number") {
    style.width = `${fixedSize}px`;
    style.minWidth = `${fixedSize}px`;
    style.maxWidth = `${fixedSize}px`;
  }

  if (pinned === "start") {
    const left =
      offsets.start[column.id] ?? column.getStart("start") + offsets.dragWidth;
    style.insetInlineStart = `${left}px`;
  }
  if (pinned === "end") {
    style.insetInlineEnd = `${offsets.end[column.id] ?? column.getAfter("end")}px`;
  }

  return style;
}
