"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { RowData } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Separator } from "@workspace/ui/components/separator";
import {
  GripVertical,
  PanelLeft,
  PanelRight,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useId } from "react";
import { getColumnDropState, getSystemColumnPinning } from "./columns";
import { CheckboxControl } from "./filter-controls";
import { defaultTableLabels, type TableLabels } from "./labels";
import { type ButtonSize, TooltipButton } from "./tooltip-button";
import type { Column, ColumnPinningState, Table } from "./types";

export interface DataTableColumnSettingsProps<TData extends RowData> {
  table: Table<TData>;
  defaultColumnOrder?: string[];
  defaultColumnPinning?: ColumnPinningState;
  size?: ButtonSize;
  disabled?: boolean;
  labels?: TableLabels;
  className?: string;
  align?: "start" | "center" | "end";
}

/** Column visibility, ordering, and pinning, independently placed by the caller. */
export function DataTableColumnSettings<TData extends RowData>({
  table,
  defaultColumnOrder = table
    .getAllFlatColumns()
    .filter((column) => column.columns.length === 0)
    .map((column) => column.id),
  defaultColumnPinning = getDefaultColumnPinning(table),
  size = "icon-sm",
  disabled = false,
  labels = defaultTableLabels,
  className,
  align = "end",
}: DataTableColumnSettingsProps<TData>) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <TooltipButton
            size={size}
            variant="ghost"
            tooltip={labels.columns}
            disabled={disabled}
            className={className}
          >
            <SlidersHorizontal />
          </TooltipButton>
        }
      />
      <PopoverContent
        align={align}
        sideOffset={4}
        className="w-64 max-w-[calc(100vw-2rem)] gap-2 p-2.5"
      >
        <TableColumnSettings
          labels={labels}
          table={table}
          defaultColumnOrder={defaultColumnOrder}
          defaultColumnPinning={defaultColumnPinning}
        />
      </PopoverContent>
    </Popover>
  );
}

function getDefaultColumnPinning<TData extends RowData>(
  table: Table<TData>,
): ColumnPinningState {
  const initial = table.initialState.columnPinning;
  if (initial?.start?.length || initial?.end?.length) return initial;
  const columns = table
    .getAllFlatColumns()
    .filter((column) => column.columns.length === 0);
  return {
    start: columns
      .filter(
        (column) =>
          (column.columnDef.meta?.pinned ??
            getSystemColumnPinning(column.id)) === "start",
      )
      .map((column) => column.id),
    end: columns
      .filter(
        (column) =>
          (column.columnDef.meta?.pinned ??
            getSystemColumnPinning(column.id)) === "end",
      )
      .map((column) => column.id),
  };
}

function TableColumnSettings<TData extends RowData>({
  table,
  defaultColumnOrder,
  defaultColumnPinning,
  labels,
}: Readonly<{
  table: Table<TData>;
  defaultColumnOrder: string[];
  defaultColumnPinning: ColumnPinningState;
  labels: TableLabels;
}>) {
  const dragContextId = useId();
  const columns = table
    .getAllLeafColumns()
    .filter((column) => !column.columnDef.meta?.filterOnly);
  const tableState = table.store.state;
  const columnOrder = tableState.columnOrder.length
    ? tableState.columnOrder
    : defaultColumnOrder;
  const columnLookup = new Map(
    columns.map((column) => [column.id, column] as const),
  );
  const leftPinnedIds = new Set(tableState.columnPinning.start ?? []);
  const rightPinnedIds = new Set(tableState.columnPinning.end ?? []);
  const visualColumnOrder = [
    ...(tableState.columnPinning.start ?? []),
    ...columnOrder.filter(
      (columnId) =>
        !leftPinnedIds.has(columnId) && !rightPinnedIds.has(columnId),
    ),
    ...(tableState.columnPinning.end ?? []),
  ];
  const orderedIds = new Set<string>();
  const orderedColumns = [
    ...visualColumnOrder.flatMap((columnId) => {
      const column = columnLookup.get(columnId);
      if (!column || orderedIds.has(column.id)) return [];
      orderedIds.add(column.id);
      return [column];
    }),
    ...columns.filter((column) => {
      if (orderedIds.has(column.id)) return false;
      orderedIds.add(column.id);
      return true;
    }),
  ];
  const hideableColumns = orderedColumns.filter(
    (column) =>
      column.getCanHide() && getSystemColumnPinning(column.id) === undefined,
  );
  const canPinColumns = table.options.enableColumnPinning !== false;
  const visibleDataColumnCount = table
    .getVisibleLeafColumns()
    .filter((column) => getSystemColumnPinning(column.id) === undefined).length;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="font-medium text-foreground text-sm">
          {labels.columns}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => {
            table.resetColumnVisibility();
            table.setColumnOrder(defaultColumnOrder);
            if (canPinColumns) table.setColumnPinning(defaultColumnPinning);
          }}
        >
          <RotateCcw data-icon="inline-start" />
          {labels.reset}
        </Button>
      </div>
      <Separator />
      <DndContext
        id={dragContextId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={({ active, over }) => {
          if (!over || active.id === over.id) return;

          const activeId = String(active.id);
          const overId = String(over.id);
          const sortableOrder = hideableColumns.map((column) => column.id);
          const targetSide = columnLookup.get(overId)?.getIsPinned() ?? false;
          const next = getColumnDropState({
            columnOrder,
            sortableOrder,
            columnPinning: tableState.columnPinning,
            activeId,
            overId,
            targetSide,
            pinningEnabled: canPinColumns,
          });
          if (!next) return;

          table.setColumnOrder(next.order);
          if (canPinColumns) table.setColumnPinning(next.pinning);
        }}
      >
        <SortableContext
          items={hideableColumns.map((column) => column.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid max-h-72 gap-1 overflow-y-auto overscroll-contain">
            {hideableColumns.map((column) => (
              <SortableColumnItem
                key={column.id}
                column={column}
                canPin={canPinColumns}
                lastVisible={
                  column.getIsVisible() && visibleDataColumnCount <= 1
                }
                labels={labels}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </>
  );
}

function SortableColumnItem<TData extends RowData>({
  column,
  canPin,
  lastVisible,
  labels,
}: Readonly<{
  column: Column<TData, unknown>;
  canPin: boolean;
  lastVisible: boolean;
  labels: TableLabels;
}>) {
  const checkboxId = useId();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
  });
  const pinned = column.getIsPinned();
  const canPinColumn = canPin && column.getCanPin();
  const leftPinned = pinned === "start";
  const rightPinned = pinned === "end";

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="grid min-h-9 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 rounded-xl px-1 py-1 text-sm hover:bg-muted/60"
    >
      <Button
        variant="ghost"
        size="icon-xs"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        aria-label={labels.dragReorder}
      >
        <GripVertical />
      </Button>
      <Label
        htmlFor={checkboxId}
        className="flex min-w-0 flex-1 cursor-pointer select-none items-center gap-2"
      >
        <CheckboxControl
          id={checkboxId}
          checked={column.getIsVisible()}
          disabled={!column.getCanHide() || lastVisible}
          onCheckedChange={(checked) =>
            column.toggleVisibility(checked === true)
          }
          onClick={(event) => event.stopPropagation()}
        />
        <span className="truncate">
          {typeof column.columnDef.header === "string"
            ? column.columnDef.header
            : column.id}
        </span>
      </Label>
      {canPinColumn && (
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground aria-pressed:bg-primary/10 aria-pressed:text-primary aria-pressed:hover:bg-primary/15 aria-pressed:hover:text-primary"
            aria-pressed={leftPinned}
            aria-label={leftPinned ? labels.unpinStart : labels.pinStart}
            title={leftPinned ? labels.unpinStart : labels.pinStart}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              column.pin(leftPinned ? false : "start");
            }}
          >
            <PanelLeft className="rtl:-scale-x-100" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground aria-pressed:bg-primary/10 aria-pressed:text-primary aria-pressed:hover:bg-primary/15 aria-pressed:hover:text-primary"
            aria-pressed={rightPinned}
            aria-label={rightPinned ? labels.unpinEnd : labels.pinEnd}
            title={rightPinned ? labels.unpinEnd : labels.pinEnd}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              column.pin(rightPinned ? false : "end");
            }}
          >
            <PanelRight className="rtl:-scale-x-100" />
          </Button>
        </div>
      )}
    </div>
  );
}
