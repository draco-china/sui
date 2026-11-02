"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  GripVertical,
  RotateCcw,
  Settings2,
} from "lucide-react";
import { useDataTableContext } from "@/components/ui/data-table/context";
import { menuLabel, menuPanel, menuRow } from "@/components/ui/data-table/menu";
import type { DataTablePlugin, NormalizedColumn } from "@/components/ui/data-table/types";

function PinButton({
  column,
  side,
}: {
  column: NormalizedColumn<unknown>;
  side: "start" | "end";
}) {
  const table = useDataTableContext();
  const pinned = table.columnState.pinning[column.id] === side;
  const label = pinned
    ? table.labels.unpin
    : table.labels[side === "start" ? "pinStart" : "pinEnd"];
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={label}
      aria-pressed={pinned}
      title={label}
      className={cn(
        "text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover/column:opacity-100",
        pinned &&
          "bg-primary/15 text-primary opacity-100 hover:bg-primary/20 hover:text-primary",
      )}
      onClick={() =>
        table.setColumnState((current) => ({
          ...current,
          pinning: {
            ...current.pinning,
            [column.id]: pinned ? undefined : side,
          },
        }))
      }
    >
      {side === "start" ? <ArrowLeftToLine /> : <ArrowRightToLine />}
    </Button>
  );
}

function ColumnItem({ column }: { column: NormalizedColumn<unknown> }) {
  const table = useDataTableContext();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });
  const visible = table.columnState.visibility[column.id] !== false;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "group/column flex items-center gap-1 px-1.5 hover:bg-accent",
        menuRow,
        isDragging && "relative z-10 bg-muted shadow-md",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label={table.labels.dragColumn}
        className="grid size-6 cursor-grab touch-none place-items-center text-muted-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      {/* biome-ignore lint/a11y/noLabelWithoutControl: the checkbox renders inside the label. */}
      <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
        <Checkbox
          checked={visible}
          onCheckedChange={(checked) =>
            table.setColumnState((current) => ({
              ...current,
              visibility: { ...current.visibility, [column.id]: checked },
            }))
          }
        />
        <span className="truncate">{column.title}</span>
      </label>
      <PinButton column={column} side="start" />
      <PinButton column={column} side="end" />
    </li>
  );
}

function ColumnSettings() {
  const table = useDataTableContext();
  const rank = new Map(table.columnState.order.map((id, index) => [id, index]));
  const columns = table.columns
    .filter((column) => !column.utility && !column.searchOnly)
    .map((column, index) => ({ column, index }))
    .sort(
      (a, b) =>
        (rank.get(a.column.id) ?? rank.size + a.index) -
        (rank.get(b.column.id) ?? rank.size + b.index),
    )
    .map((entry) => entry.column);
  const ids = columns.map((column) => column.id);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const order = arrayMove(
      ids,
      ids.indexOf(String(active.id)),
      ids.indexOf(String(over.id)),
    );
    table.setColumnState((current) => ({ ...current, order }));
  }
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={table.labels.columns}
            title={table.labels.columns}
          />
        }
      >
        <Settings2 />
      </PopoverTrigger>
      <PopoverContent align="end" className={cn("w-64", menuPanel)}>
        <div className="flex items-center justify-between pe-1.5">
          <span className={menuLabel}>{table.labels.columns}</span>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={table.labels.columnsReset}
                  className="text-muted-foreground"
                  onClick={table.resetColumns}
                />
              }
            >
              <RotateCcw />
            </TooltipTrigger>
            <TooltipContent>{table.labels.columnsReset}</TooltipContent>
          </Tooltip>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          // Keeps the live region out of the popover's flex layout.
          accessibility={{
            container:
              typeof document === "undefined" ? undefined : document.body,
          }}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ul className="grid max-h-[min(30rem,60vh)] gap-1 overflow-y-auto">
              {columns.map((column) => (
                <ColumnItem key={column.id} column={column} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Column visibility, drag ordering and pinning in a toolbar popover, plus
 * drag handles on header edges for widths.
 */
export function columnSettings<TData>(): DataTablePlugin<TData> {
  return {
    name: "columnSettings",
    features: { resizable: true },
    slots: { toolbarEnd: () => <ColumnSettings /> },
  };
}
