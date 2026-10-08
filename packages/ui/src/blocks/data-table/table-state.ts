import { compareItems, rankItem } from "@tanstack/match-sorter-utils";
import type { RowData } from "@tanstack/react-table";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "cn";
import {
  createElement,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TablePinnedColumnOffsets } from "./body";
import { CONTROL_COLUMN_WIDTH, getSystemColumnPinning } from "./columns";
import type {
  ColumnDef,
  ColumnPinningState,
  FilterFn,
  OnChangeFn,
  Row,
  SortFn,
  Table,
} from "./types";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export interface TableFeatureOptions {
  stickyHeader?: boolean;
  /** Data is already filtered and paginated by an external query. */
  manual?: boolean;
  pinning?:
    | false
    | {
        value?: ColumnPinningState;
        onChange?: (value: ColumnPinningState) => void;
      };
}

export interface ColumnFilterMeta<TData extends RowData> {
  options: Array<{
    label: string;
    value: string;
  }>;
  placeholder?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFilter?: (value: string, record: TData) => boolean;
}

function getColumnDefId<TData extends RowData, TValue>(
  column: ColumnDef<TData, TValue>,
  index: number,
) {
  if (column.id) return column.id;
  if ("accessorKey" in column && typeof column.accessorKey === "string")
    return column.accessorKey;
  return String(index);
}

function getLeafColumnIds<TData extends RowData, TValue>(
  columns: ColumnDef<TData, TValue>[],
): string[] {
  return columns.flatMap((column, index) =>
    "columns" in column && Array.isArray(column.columns)
      ? getLeafColumnIds(column.columns)
      : getColumnDefId(column, index),
  );
}

function getPinnedColumnIds<TData extends RowData, TValue>(
  columns: ColumnDef<TData, TValue>[],
  side: "start" | "end",
): string[] {
  return columns.flatMap((column, index) => {
    if ("columns" in column && Array.isArray(column.columns)) {
      return getPinnedColumnIds(column.columns, side);
    }
    const id = getColumnDefId(column, index);
    const pinned = column.meta?.pinned ?? getSystemColumnPinning(id);
    return pinned === side ? [id] : [];
  });
}

export function useTableColumnState<TData extends RowData, TValue>(
  columns: ColumnDef<TData, TValue>[],
  tableOptions: TableFeatureOptions | undefined,
) {
  const pinningEnabled = tableOptions?.pinning !== false;
  const defaultColumnOrder = useMemo(
    () => getLeafColumnIds(columns),
    [columns],
  );
  const defaultColumnPinning = useMemo(
    () =>
      pinningEnabled
        ? {
            start: getPinnedColumnIds(columns, "start"),
            end: getPinnedColumnIds(columns, "end"),
          }
        : { start: [], end: [] },
    [columns, pinningEnabled],
  );
  const defaultColumnPinningKey = `${defaultColumnPinning.start?.join("\0") ?? ""}\x01${defaultColumnPinning.end?.join("\0") ?? ""}`;
  const defaultColumnPinningRef = useRef(defaultColumnPinning);
  defaultColumnPinningRef.current = defaultColumnPinning;
  const controlledColumnPinning =
    typeof tableOptions?.pinning === "object"
      ? tableOptions.pinning.value
      : undefined;
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnOrder);
  const [internalColumnPinning, setInternalColumnPinning] =
    useState<ColumnPinningState>(defaultColumnPinning);
  const columnPinning =
    typeof tableOptions?.pinning === "object" && tableOptions.pinning.value
      ? tableOptions.pinning.value
      : internalColumnPinning;

  useEffect(() => {
    setColumnOrder((current) => {
      const remainingIds = new Set(defaultColumnOrder);
      const next = [
        ...current.filter((id) => remainingIds.delete(id)),
        ...remainingIds,
      ];
      return next.length === current.length &&
        next.every((id, index) => id === current[index])
        ? current
        : next;
    });
  }, [defaultColumnOrder]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the key tracks changed defaults read through the latest ref.
  useEffect(() => {
    if (!pinningEnabled || controlledColumnPinning) return;
    setInternalColumnPinning(defaultColumnPinningRef.current);
  }, [controlledColumnPinning, defaultColumnPinningKey, pinningEnabled]);

  const handleColumnPinningChange = useCallback<OnChangeFn<ColumnPinningState>>(
    (updater) => {
      const next =
        typeof updater === "function" ? updater(columnPinning) : updater;
      if (typeof tableOptions?.pinning === "object")
        tableOptions.pinning.onChange?.(next);
      if (
        !(
          typeof tableOptions?.pinning === "object" &&
          tableOptions.pinning.value
        )
      ) {
        setInternalColumnPinning(next);
      }
    },
    [columnPinning, tableOptions?.pinning],
  );

  return {
    columnOrder,
    setColumnOrder,
    columnPinning,
    handleColumnPinningChange,
    defaultColumnOrder,
    defaultColumnPinning,
    pinningEnabled,
  };
}

export function withTableColumnDefaults<TData extends RowData, TValue>(
  columns: ColumnDef<TData, TValue>[],
): ColumnDef<TData, TValue>[] {
  return columns.map((column, index) => {
    const children =
      "columns" in column && Array.isArray(column.columns)
        ? withTableColumnDefaults(column.columns)
        : undefined;
    const filter = column.meta?.filter;
    const columnId = getColumnDefId(column, index);
    const search = column.meta?.search;
    const shouldRenderFilterLabels = filter && column.cell === undefined;
    const shouldApplyFilter = filter && column.filterFn === undefined;
    const shouldApplySearchFilter =
      search && !filter && column.filterFn === undefined;
    const shouldApplyFuzzySort = search && column.sortFn === undefined;
    const systemPinned = getSystemColumnPinning(columnId);
    const compactSystemColumn = columnId === "select" || columnId === "drag";
    const fixedSize =
      column.size ?? (compactSystemColumn ? CONTROL_COLUMN_WIDTH : undefined);

    if (
      !children &&
      !shouldApplyFilter &&
      !shouldRenderFilterLabels &&
      !shouldApplySearchFilter &&
      !shouldApplyFuzzySort &&
      !systemPinned &&
      !column.meta?.filterOnly &&
      fixedSize === undefined
    ) {
      return column;
    }

    let systemOptions: Partial<
      Pick<ColumnDef<TData, TValue>, "enableHiding" | "meta">
    > = {};
    if (systemPinned) {
      systemOptions = {
        enableHiding: column.enableHiding ?? false,
        meta: {
          pinned: systemPinned,
          align: "center",
          ...column.meta,
          ...(fixedSize === undefined ? {} : { __uiTableFixedSize: fixedSize }),
          className: cn(
            compactSystemColumn && "w-10 px-2 [&:has([role=checkbox])]:pe-2",
            column.meta?.className,
          ),
        },
      };
    } else if (fixedSize !== undefined) {
      systemOptions = {
        meta: { ...column.meta, __uiTableFixedSize: fixedSize },
      };
    }

    return {
      ...column,
      ...(children ? { columns: children } : {}),
      ...(column.meta?.filterOnly ? { enableHiding: false } : {}),
      ...systemOptions,
      ...(shouldRenderFilterLabels
        ? {
            cell: ({ getValue }: { getValue: () => unknown }) => {
              const value = getValue();
              const values = Array.isArray(value) ? value : [value];
              return createElement(
                "div",
                { className: "flex flex-wrap gap-1" },
                values.map((item) => {
                  const text = String(item ?? "");
                  return createElement(
                    Badge,
                    { key: text, variant: "secondary" },
                    filter.options.find((option) => option.value === text)
                      ?.label ?? text,
                  );
                }),
              );
            },
          }
        : {}),
      ...(shouldApplyFilter
        ? {
            filterFn: getColumnFilterFn(filter),
          }
        : {}),
      ...(shouldApplySearchFilter
        ? {
            filterFn: ((row, columnId, filterValue, addMeta) => {
              const value = String(filterValue ?? "");
              if (!value) return true;

              const itemRank = rankItem(row.getValue(columnId), value);
              addMeta?.({ itemRank });
              return itemRank.passed;
            }) satisfies FilterFn<TData>,
          }
        : {}),
      ...(shouldApplyFuzzySort
        ? {
            sortFn: ((rowA, rowB, columnId) => {
              const rankA = rowA.columnFiltersMeta[columnId]?.itemRank;
              const rankB = rowB.columnFiltersMeta[columnId]?.itemRank;

              if (rankA && rankB) {
                const rankSort = compareItems(rankA, rankB);
                if (rankSort !== 0) return rankSort;
              }

              return collator.compare(
                String(rowA.getValue(columnId) ?? ""),
                String(rowB.getValue(columnId) ?? ""),
              );
            }) satisfies SortFn<TData>,
          }
        : {}),
    };
  });
}

function getColumnFilterFn<TData extends RowData>(
  filter: ColumnFilterMeta<TData>,
) {
  if (filter.onFilter) {
    return ((row, _columnId, filterValue) => {
      if (
        filterValue === undefined ||
        filterValue === null ||
        filterValue === ""
      )
        return true;
      if (Array.isArray(filterValue)) {
        if (filterValue.length === 0) return true;
        return filterValue.some((value) =>
          filter.onFilter?.(String(value), row.original),
        );
      }
      return !!filter.onFilter?.(String(filterValue), row.original);
    }) satisfies FilterFn<TData>;
  }

  if (filter.multiple) {
    return ((row, columnId, filterValue) => {
      if (
        filterValue === undefined ||
        filterValue === null ||
        filterValue === ""
      )
        return true;
      const rowValue = row.getValue(columnId);
      if (Array.isArray(filterValue)) {
        if (filterValue.length === 0) return true;
        return filterValue.includes(rowValue);
      }
      return filterValue === rowValue;
    }) satisfies FilterFn<TData>;
  }

  return "equals";
}

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export function sortRowsByRank<TData extends RowData>(
  rows: Row<TData>[],
  columnId: string,
) {
  return [...rows].sort((rowA, rowB) => {
    const rankA = rowA.columnFiltersMeta[columnId]?.itemRank;
    const rankB = rowB.columnFiltersMeta[columnId]?.itemRank;

    if (rankA && rankB) {
      const rankSort = compareItems(rankA, rankB);
      if (rankSort !== 0) return rankSort;
    }

    if (rankA) return -1;
    if (rankB) return 1;
    return rowA.index - rowB.index;
  });
}

export function useTablePinnedColumnOffsets<TData extends RowData>(
  table: Table<TData>,
  tableRef: RefObject<HTMLTableElement | null>,
  dragSort: boolean,
): TablePinnedColumnOffsets {
  const [offsets, setOffsets] = useState<TablePinnedColumnOffsets>(() =>
    getInitialPinnedColumnOffsets(table, dragSort),
  );
  const visibleColumnKey = table
    .getVisibleLeafColumns()
    .map((column) => column.id)
    .join("\0");
  const leftPinnedKey = (table.store.state.columnPinning.start ?? []).join(
    "\0",
  );
  const rightPinnedKey = (table.store.state.columnPinning.end ?? []).join("\0");
  const pinnedSizeKey = [
    ...table.getStartVisibleLeafColumns(),
    ...table.getEndVisibleLeafColumns(),
  ]
    .map(
      (column) =>
        `${column.id}:${column.columnDef.meta?.__uiTableFixedSize ?? "auto"}`,
    )
    .join("\0");

  useIsomorphicLayoutEffect(() => {
    const tableElement = tableRef.current;
    if (!tableElement) return;
    const measuredColumnIds = new Set(
      [
        ...table.getStartVisibleLeafColumns(),
        ...table.getEndVisibleLeafColumns(),
      ].map((column) => column.id),
    );

    const updateOffsets = () => {
      const widths = new Map<string, number>();

      for (const element of tableElement.querySelectorAll<HTMLElement>(
        "thead tr:last-child [data-ui-table-column-id]",
      )) {
        const columnId = element.dataset.uiTableColumnId;
        if (
          !columnId ||
          !measuredColumnIds.has(columnId) ||
          widths.has(columnId)
        )
          continue;
        widths.set(columnId, element.getBoundingClientRect().width);
      }

      const dragWidth = dragSort ? CONTROL_COLUMN_WIDTH : 0;
      const next: TablePinnedColumnOffsets = {
        start: {},
        end: {},
        dragWidth,
        headerTop: Array.from(
          tableElement.tHead?.rows ?? [],
          (row) => row.offsetTop,
        ),
      };
      let left = dragWidth;

      for (const column of table.getStartVisibleLeafColumns()) {
        next.start[column.id] = left;
        left +=
          widths.get(column.id) ??
          column.columnDef.meta?.__uiTableFixedSize ??
          column.getSize();
      }

      let right = 0;
      const rightColumns = table.getEndVisibleLeafColumns();
      for (let index = rightColumns.length - 1; index >= 0; index -= 1) {
        const column = rightColumns[index];
        next.end[column.id] = right;
        right +=
          widths.get(column.id) ??
          column.columnDef.meta?.__uiTableFixedSize ??
          column.getSize();
      }

      setOffsets((current) =>
        arePinnedColumnOffsetsEqual(current, next) ? current : next,
      );
    };

    updateOffsets();
    if (typeof ResizeObserver === "undefined") return undefined;

    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateOffsets);
    });
    for (const row of tableElement.tHead?.rows ?? []) observer.observe(row);
    for (const element of tableElement.querySelectorAll<HTMLElement>(
      "thead tr:last-child [data-ui-table-column-id]",
    )) {
      const columnId = element.dataset.uiTableColumnId;
      if (columnId && measuredColumnIds.has(columnId))
        observer.observe(element);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [
    dragSort,
    leftPinnedKey,
    pinnedSizeKey,
    rightPinnedKey,
    table,
    tableRef,
    visibleColumnKey,
  ]);

  return offsets;
}

function getInitialPinnedColumnOffsets<TData extends RowData>(
  table: Table<TData>,
  dragSort: boolean,
) {
  const offsets: TablePinnedColumnOffsets = {
    start: {},
    end: {},
    dragWidth: dragSort ? CONTROL_COLUMN_WIDTH : 0,
    headerTop: table.getHeaderGroups().map((_, index) => index * 48),
  };
  let left = offsets.dragWidth;
  for (const column of table.getStartVisibleLeafColumns()) {
    offsets.start[column.id] = left;
    left += column.columnDef.meta?.__uiTableFixedSize ?? column.getSize();
  }

  let right = 0;
  const rightColumns = table.getEndVisibleLeafColumns();
  for (let index = rightColumns.length - 1; index >= 0; index -= 1) {
    const column = rightColumns[index];
    offsets.end[column.id] = right;
    right += column.columnDef.meta?.__uiTableFixedSize ?? column.getSize();
  }
  return offsets;
}

function arePinnedColumnOffsetsEqual(
  current: TablePinnedColumnOffsets,
  next: TablePinnedColumnOffsets,
) {
  for (const side of ["start", "end"] as const) {
    let currentCount = 0;
    let nextCount = 0;

    for (const [columnId, offset] of Object.entries(current[side])) {
      currentCount += 1;
      if (next[side][columnId] !== offset) return false;
    }

    for (const [columnId, offset] of Object.entries(next[side])) {
      nextCount += 1;
      if (current[side][columnId] !== offset) return false;
    }

    if (currentCount !== nextCount) return false;
  }

  return (
    current.dragWidth === next.dragWidth &&
    current.headerTop.length === next.headerTop.length &&
    current.headerTop.every((top, index) => top === next.headerTop[index])
  );
}

/** Props accepted by Table. */
