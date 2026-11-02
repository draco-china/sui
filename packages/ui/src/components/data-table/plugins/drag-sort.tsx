"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  type Modifier,
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
import { Button } from "@workspace/ui/components/button";
import { cn } from "cn";
import { GripVertical } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
} from "react";
import { utilityColumn } from "../columns";
import { useDataTableContext } from "../context";
import type { DataTablePlugin } from "../types";

export interface DragSortOptions<TData> {
  /**
   * Receives every row in its new order, including rows a filter hides;
   * `from` and `to` are positions in the table.
   */
  readonly onDragEnd?: (
    rows: readonly TData[],
    move: { readonly from: number; readonly to: number },
  ) => void;
}

const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

type HandleProps = Pick<
  ReturnType<typeof useSortable>,
  "attributes" | "listeners" | "setActivatorNodeRef"
>;
const HandleContext = createContext<HandleProps | null>(null);

function DragHandle() {
  const table = useDataTableContext();
  const handle = useContext(HandleContext);
  return (
    <Button
      ref={handle?.setActivatorNodeRef}
      variant="ghost"
      size="icon-xs"
      aria-label={table.labels.dragRow}
      className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
      {...handle?.attributes}
      {...handle?.listeners}
    >
      <GripVertical />
    </Button>
  );
}

function SortableRow({
  id,
  rowProps,
  children,
}: {
  id: string;
  rowProps: ComponentProps<"tr">;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <HandleContext.Provider
      value={{ attributes, listeners, setActivatorNodeRef }}
    >
      <tr
        {...rowProps}
        ref={setNodeRef}
        data-dragging={isDragging || undefined}
        style={{ transform: CSS.Translate.toString(transform), transition }}
        className={cn(
          rowProps.className,
          "data-dragging:relative data-dragging:z-30 data-dragging:shadow-lg",
        )}
      >
        {children}
      </tr>
    </HandleContext.Provider>
  );
}

function SortableBody<TData>({
  children,
  onDragEnd,
}: {
  children: ReactNode;
  onDragEnd?: DragSortOptions<TData>["onDragEnd"];
}) {
  const table = useDataTableContext<TData>();
  const ids = table.rows.map((row, index) => table.getRowId(row, index));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = arrayMove([...table.rows], from, to);
    onDragEnd?.(table.setRows(next), { from, to });
  }
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      onDragEnd={handleDragEnd}
      // The live region mounts after hydration; a div may not sit in a tbody.
      accessibility={{
        container: typeof document === "undefined" ? undefined : document.body,
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/**
 * Reorders rows with a handle, by pointer or keyboard (Space, arrows, Space).
 * Sorting and pagination are off while it is active.
 */
export function dragSort<TData>(
  options: DragSortOptions<TData> = {},
): DataTablePlugin<TData> {
  return {
    name: "dragSort",
    features: { dragSort: true },
    columns: (columns) => [
      utilityColumn("__drag", () => <DragHandle />),
      ...columns,
    ],
    wrapBody: (children) => (
      <SortableBody onDragEnd={options.onDragEnd}>{children}</SortableBody>
    ),
    renderRow: ({ id, rowProps, children }) => (
      <SortableRow key={id} id={id} rowProps={rowProps}>
        {children}
      </SortableRow>
    ),
  };
}
