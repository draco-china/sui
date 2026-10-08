"use client";

import "./table.css";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { RowData } from "@tanstack/react-table";
import { Loader } from "@workspace/ui/components/loader";
import {
  TableBody as TableBodyPrimitive,
  TableHead,
  TableHeader,
  Table as TablePrimitive,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "cn";
import {
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getPinnedColumnClassName,
  getPinnedColumnStyle,
  TableBody,
} from "./body";
import { TableBulkActions } from "./bulk-actions";
import { DataTableColumnHeader } from "./column-header";
import { getSystemColumnPinning } from "./columns";
import type { DataTableDensityValue } from "./density";
import {
  resolveTableLabels,
  type TableLabelOverrides,
  type TableLabels,
} from "./labels";
import { DataTablePagination } from "./pagination";
import {
  sortRowsByRank,
  type TableFeatureOptions,
  useTableColumnState,
  useTablePinnedColumnOffsets,
  withTableColumnDefaults,
} from "./table-state";
import type { ButtonSize } from "./tooltip-button";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  createSortedRowModel,
  flexRender,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type TableFeatures,
  type Table as TableInstance,
  type TableOptions,
  uiTableFeatures,
  useTable,
  type VisibilityState,
} from "./types";
import type { TableStateValue, UrlColumnFilterConfig } from "./url-state";

/** Pagination, sorting, and filter state managed by Table. */
export interface DataTableState extends TableStateValue {}

/** Maps a table column filter to a URL search parameter. */
export type ColumnFilterConfig = UrlColumnFilterConfig;

/** Synchronizes Table state with a router's search parameters. */
export { useTableUrlStateValue as useDataTableUrlState } from "./url-state";

interface TableDragSortOptions<TData extends RowData> {
  rowKey: Extract<keyof TData, string | number>;
  onDragSortEnd?: (newData: TData[]) => void;
}

export type TableRowKey<TData extends RowData> =
  | Extract<keyof TData, string | number>
  | ((record: TData) => string | number);

export interface DataTableRenderContext<TData extends RowData> {
  table: TableInstance<TData>;
  rows: Row<TData>[];
  selectedRows: Row<TData>[];
  tableSize: DataTableDensityValue;
  onTableSizeChange: (size: DataTableDensityValue) => void;
  loading: boolean;
  refresh?: () => void;
  labels: TableLabels;
  defaultColumnOrder: string[];
  defaultColumnPinning: ColumnPinningState;
  size?: ButtonSize;
}

type DataTableSlot<TData extends RowData> =
  | ReactNode
  | ((context: DataTableRenderContext<TData>) => ReactNode);

function getLeafColumnDefs<TData extends RowData, TValue>(
  columns: ColumnDef<TData, TValue>[],
): ColumnDef<TData, TValue>[] {
  return columns.flatMap((column) =>
    "columns" in column && Array.isArray(column.columns)
      ? getLeafColumnDefs(column.columns)
      : [column],
  );
}

function useTableController<TData extends RowData, TValue>({
  columns,
  data,
  setData,
  rowKey,
  paginationOptions,
  dragSort,
  tableOptions,
  manual = false,
  requestTotal,
  unknownTotal = false,
  pagination,
  setPagination,
  sorting,
  setSorting,
  columnFilters,
  setColumnFilters,
}: {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  setData: Dispatch<SetStateAction<TData[]>>;
  rowKey?: TableRowKey<TData>;
  pagination: PaginationState;
  setPagination: Dispatch<SetStateAction<PaginationState>>;
  sorting: SortingState;
  setSorting: Dispatch<SetStateAction<SortingState>>;
  columnFilters: ColumnFiltersState;
  setColumnFilters: Dispatch<SetStateAction<ColumnFiltersState>>;
  paginationOptions?: false;
  dragSort?: false | TableDragSortOptions<TData>;
  tableOptions?: TableFeatureOptions;
  manual?: boolean;
  requestTotal?: number;
  unknownTotal?: boolean;
}) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [tableSize, setTableSize] = useState<DataTableDensityValue>("default");
  const tableRef = useRef<HTMLTableElement>(null);
  const tableColumns = useMemo(
    () => withTableColumnDefaults(columns),
    [columns],
  );
  const resolvedColumnVisibility = useMemo<VisibilityState>(
    () => ({
      ...columnVisibility,
      ...Object.fromEntries(
        getLeafColumnDefs(tableColumns)
          .filter((column) => column.meta?.filterOnly)
          .map((column) => [
            column.id ??
              ("accessorKey" in column ? String(column.accessorKey) : ""),
            false,
          ]),
      ),
    }),
    [columnVisibility, tableColumns],
  );
  const rankedSortedRowModel = useMemo(() => {
    const sortedRowModel = createSortedRowModel<TableFeatures, TData>();

    return (table: TableInstance<TData>) => {
      const getSorted = sortedRowModel(table);

      return () => {
        const rowModel = getSorted();
        if (table.options.manualSorting || table.store.state.sorting.length > 0)
          return rowModel;

        const rankedColumnId = rowModel.rows
          .flatMap((row) =>
            Object.keys(row.columnFiltersMeta).filter(
              (columnId) => !!row.columnFiltersMeta[columnId]?.itemRank,
            ),
          )
          .at(0);
        if (!rankedColumnId) return rowModel;

        return {
          ...rowModel,
          rows: sortRowsByRank(rowModel.rows, rankedColumnId),
          flatRows: sortRowsByRank(rowModel.flatRows, rankedColumnId),
        };
      };
    };
  }, []);
  const columnState = useTableColumnState(tableColumns, tableOptions);
  const resetToFirstPage = useCallback(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [setPagination]);
  const handleSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      setSorting(updater);
      resetToFirstPage();
    },
    [resetToFirstPage, setSorting],
  );
  const handleColumnFiltersChange = useCallback<OnChangeFn<ColumnFiltersState>>(
    (updater) => {
      setColumnFilters(updater);
      resetToFirstPage();
    },
    [resetToFirstPage, setColumnFilters],
  );
  const reactTableOptions: TableOptions<TData> = {
    features: {
      ...uiTableFeatures,
      sortedRowModel:
        rankedSortedRowModel as typeof uiTableFeatures.sortedRowModel,
    },
    data,
    // Table v9 erases individual accessor value types at the table boundary.
    columns: tableColumns as ColumnDef<TData>[],
    state: {
      sorting,
      columnVisibility: resolvedColumnVisibility,
      rowSelection,
      columnFilters,
      columnOrder: columnState.columnOrder,
      columnPinning: columnState.columnPinning,
      pagination,
    },
    autoResetPageIndex: false,
    enableRowSelection: true,
    enableColumnPinning: columnState.pinningEnabled,
    onRowSelectionChange: setRowSelection,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: columnState.setColumnOrder,
    onColumnPinningChange: columnState.handleColumnPinningChange,
    onPaginationChange: setPagination,
  };
  if (manual) {
    reactTableOptions.manualPagination = true;
    reactTableOptions.manualSorting = tableOptions?.manual !== true;
    reactTableOptions.manualFiltering = true;
    reactTableOptions.rowCount = requestTotal;
    if (unknownTotal) reactTableOptions.pageCount = -1;
  }
  if (paginationOptions === false || dragSort)
    reactTableOptions.manualPagination = true;
  if (dragSort) {
    reactTableOptions.manualSorting = true;
    reactTableOptions.enableSorting = false;
  }
  const resolvedRowKey = rowKey ?? (dragSort ? dragSort.rowKey : undefined);
  if (resolvedRowKey !== undefined) {
    reactTableOptions.getRowId = (row) =>
      String(
        typeof resolvedRowKey === "function"
          ? resolvedRowKey(row)
          : row[resolvedRowKey],
      );
  }
  const table = useTable(reactTableOptions);
  const pageCount = table.getPageCount();

  useEffect(() => {
    if (
      paginationOptions === false ||
      pageCount <= 0 ||
      pagination.pageIndex < pageCount
    )
      return;
    setPagination((current) => ({ ...current, pageIndex: pageCount - 1 }));
  }, [pageCount, pagination.pageIndex, paginationOptions, setPagination]);

  const dragSortEnabled = !!dragSort;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const rows = table.getRowModel().rows;
      const oldIndex = rows.findIndex((row) => row.id === String(active.id));
      const newIndex = rows.findIndex((row) => row.id === String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      const oldDataIndex = data.indexOf(rows[oldIndex].original);
      const newDataIndex = data.indexOf(rows[newIndex].original);
      if (oldDataIndex === -1 || newDataIndex === -1) return;

      const nextData = arrayMove(data, oldDataIndex, newDataIndex);
      if (nextData === data) return;

      setData(nextData);
      if (dragSort) dragSort.onDragSortEnd?.(nextData);
    },
    [data, dragSort, setData, table],
  );
  const pinnedOffsets = useTablePinnedColumnOffsets(
    table,
    tableRef,
    dragSortEnabled,
  );
  const rows = table.getRowModel().rows;
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const visibleColumnCount = visibleColumns.length + (dragSortEnabled ? 1 : 0);

  return {
    table,
    tableRef,
    tableSize,
    setTableSize,
    rows,
    selectedRows,
    visibleColumns,
    visibleColumnCount,
    pinnedOffsets,
    sensors,
    handleDragEnd,
    dragSortEnabled,
    defaultColumnOrder: columnState.defaultColumnOrder,
    defaultColumnPinning: columnState.defaultColumnPinning,
  };
}

function renderTableSlot<TData extends RowData>(
  slot: DataTableSlot<TData> | undefined,
  context: DataTableRenderContext<TData>,
) {
  if (slot === false) return undefined;
  if (typeof slot === "function") return slot(context);
  return slot;
}

function getTablePaddingClass(size: DataTableDensityValue) {
  if (size === "compact") return "py-1";
  if (size === "middle") return "py-2";
  return "py-3";
}

function getAriaSort(canSort: boolean, sorted: false | "asc" | "desc") {
  if (!canSort) return undefined;
  if (sorted === "asc") return "ascending";
  if (sorted === "desc") return "descending";
  return "none";
}

export interface DataTableProps<TData extends RowData, TValue = unknown> {
  readonly columns: ColumnDef<TData, TValue>[];
  readonly data?: TData[];
  readonly rowKey?: TableRowKey<TData>;
  readonly request?: (
    params: DataTableState,
  ) =>
    | Promise<{ readonly data: TData[]; readonly total?: number }>
    | { readonly data: TData[]; readonly total?: number };
  readonly initialState?: Partial<DataTableState>;
  readonly onChange?: (state: DataTableState) => void;
  readonly children?: (
    context: DataTableRenderContext<TData> & { content: ReactNode },
  ) => ReactNode;
  readonly size?: ButtonSize;
  readonly bulkToolbar?: false | DataTableSlot<TData>;
  readonly pagination?: false;
  readonly dragSort?: false | TableDragSortOptions<TData>;
  readonly loading?: boolean | { readonly rows?: number };
  readonly layout?: "full" | "auto";
  readonly table?: TableFeatureOptions;
  readonly className?: string;
  readonly label?: string;
  readonly labels?: TableLabelOverrides;
}

/** Feature-rich local or remote TanStack data table. */
export function DataTable<TData extends RowData, TValue>({
  columns,
  data,
  rowKey,
  request,
  initialState,
  onChange,
  children,
  size,
  bulkToolbar,
  pagination,
  dragSort,
  loading,
  layout,
  table,
  className,
  label = "Data table",
  labels: labelOverrides,
}: Readonly<DataTableProps<TData, TValue>>) {
  const labels = resolveTableLabels(labelOverrides);
  const dragContextId = useId();
  const [tableData, setTableData] = useState<TData[]>(data ?? []);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<unknown>();
  const [requestTotal, setRequestTotal] = useState<number>();
  const [requestVersion, setRequestVersion] = useState(0);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    initialState?.columnFilters ?? [],
  );
  const [sorting, setSorting] = useState<SortingState>(
    initialState?.sorting ?? [],
  );
  const [paginationState, setPagination] = useState<PaginationState>(
    initialState?.pagination ?? {
      pageIndex: 0,
      pageSize: 10,
    },
  );

  const initialStateKey = JSON.stringify(initialState);
  const previousInitialStateKey = useRef(initialStateKey);
  const syncingInitialState = useRef(false);
  useEffect(() => {
    if (previousInitialStateKey.current === initialStateKey) return;
    previousInitialStateKey.current = initialStateKey;
    syncingInitialState.current = true;
    const nextPagination = initialState?.pagination;
    const nextSorting = initialState?.sorting;
    const nextColumnFilters = initialState?.columnFilters;

    if (nextPagination) {
      setPagination((current) =>
        current.pageIndex === nextPagination.pageIndex &&
        current.pageSize === nextPagination.pageSize
          ? current
          : nextPagination,
      );
    }
    if (nextSorting) {
      setSorting((current) =>
        JSON.stringify(current) === JSON.stringify(nextSorting)
          ? current
          : nextSorting,
      );
    }
    if (nextColumnFilters) {
      setColumnFilters((current) =>
        JSON.stringify(current) === JSON.stringify(nextColumnFilters)
          ? current
          : nextColumnFilters,
      );
    }
  }, [
    initialStateKey,
    initialState?.columnFilters,
    initialState?.pagination,
    initialState?.sorting,
  ]);
  const state = useMemo<DataTableState>(
    () => ({ pagination: paginationState, sorting, columnFilters }),
    [paginationState, sorting, columnFilters],
  );
  const previousState = useRef(state);

  useEffect(() => {
    if (request) return;
    setTableData(data ?? []);
    setRequestLoading(false);
    setRequestError(undefined);
    setRequestTotal(undefined);
  }, [data, request]);

  useEffect(() => {
    if (syncingInitialState.current) {
      const matches =
        (!initialState?.pagination ||
          JSON.stringify(state.pagination) ===
            JSON.stringify(initialState.pagination)) &&
        (!initialState?.sorting ||
          JSON.stringify(state.sorting) ===
            JSON.stringify(initialState.sorting)) &&
        (!initialState?.columnFilters ||
          JSON.stringify(state.columnFilters) ===
            JSON.stringify(initialState.columnFilters));
      if (matches) syncingInitialState.current = false;
      previousState.current = state;
      return;
    }
    if (previousState.current === state) return;
    previousState.current = state;
    onChange?.(state);
  }, [onChange, state, initialState]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: requestVersion explicitly invalidates the stable request for refresh and retry.
  useEffect(() => {
    if (!request) return;

    let canceled = false;
    setRequestLoading(true);
    setRequestError(undefined);

    Promise.resolve()
      .then(() => request(state))
      .then((result) => {
        if (canceled) return;
        setTableData(result.data);
        setRequestTotal(result.total);
      })
      .catch((error) => {
        if (canceled) return;
        setRequestError(error);
        setTableData([]);
        setRequestTotal(undefined);
      })
      .finally(() => {
        if (!canceled) setRequestLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [request, state, requestVersion]);

  const refresh = request
    ? () => setRequestVersion((version) => version + 1)
    : undefined;
  const loadingRows = typeof loading === "object" ? (loading.rows ?? 5) : 5;
  const tableLoading =
    (loading !== undefined && loading !== false) || requestLoading;
  const loadingEnabled = tableLoading && tableData.length === 0;
  const overlayLoading = tableLoading && tableData.length > 0;
  const tableController = useTableController({
    columns,
    data: tableData,
    setData: setTableData,
    rowKey,
    paginationOptions: pagination,
    dragSort,
    tableOptions: table,
    manual: !!request || table?.manual === true,
    requestTotal,
    unknownTotal: !!request && requestTotal === undefined,
    pagination: paginationState,
    setPagination,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
  });
  const renderContext: DataTableRenderContext<TData> = {
    table: tableController.table,
    rows: tableController.rows,
    selectedRows: tableController.selectedRows,
    tableSize: tableController.tableSize,
    onTableSizeChange: tableController.setTableSize,
    loading: tableLoading,
    refresh,
    labels,
    defaultColumnOrder: tableController.defaultColumnOrder,
    defaultColumnPinning: tableController.defaultColumnPinning,
    size,
  };
  const isFullLayout = (layout ?? "auto") === "full";
  const bulkActions = renderTableSlot(bulkToolbar, renderContext);
  const stickyHeader = table?.stickyHeader ?? true;
  const paddingClass = getTablePaddingClass(tableController.tableSize);
  const visibleDataColumnCount = tableController.visibleColumns.filter(
    (column) => getSystemColumnPinning(column.id) === undefined,
  ).length;
  const fixedColumnsWidth = tableController.visibleColumns.reduce(
    (total, column) => total + (column.columnDef.meta?.__uiTableFixedSize ?? 0),
    tableController.dragSortEnabled
      ? tableController.pinnedOffsets.dragWidth
      : 0,
  );
  const hasFlexibleColumns = tableController.visibleColumns.some(
    (column) => column.columnDef.meta?.__uiTableFixedSize === undefined,
  );
  const tableStyle: CSSProperties = {
    width: hasFlexibleColumns ? "100%" : fixedColumnsWidth,
  };
  const content = (
    <>
      <div
        data-slot="data-table-viewport"
        className={cn("relative min-w-0", isFullLayout && "min-h-0 flex-1")}
      >
        <div
          data-slot="ui-table-scroll-area"
          inert={overlayLoading}
          className={cn(
            "w-full max-w-full overflow-auto rounded-2xl border [&>[data-slot=table-container]]:overflow-visible",
            isFullLayout && "h-full min-h-0",
          )}
        >
          <TablePrimitive
            aria-label={label}
            aria-busy={tableLoading}
            ref={tableController.tableRef}
            className="table-auto border-separate border-spacing-0"
            style={tableStyle}
          >
            <colgroup>
              {tableController.dragSortEnabled && (
                <col
                  style={{ width: tableController.pinnedOffsets.dragWidth }}
                />
              )}
              {tableController.visibleColumns.map((column) => (
                <col
                  key={column.id}
                  style={{ width: column.columnDef.meta?.__uiTableFixedSize }}
                />
              ))}
            </colgroup>
            <TableHeader data-slot="ui-table-header">
              {tableController.table
                .getHeaderGroups()
                .map((headerGroup, headerIndex) => (
                  <TableRow key={headerGroup.id} className="bg-background">
                    {tableController.dragSortEnabled && (
                      <TableHead
                        data-ui-table-drag-column=""
                        scope="col"
                        style={{
                          top: stickyHeader
                            ? tableController.pinnedOffsets.headerTop[
                                headerIndex
                              ]
                            : undefined,
                        }}
                        className={cn(
                          "border-b",
                          "sticky inset-s-0 z-20 w-10 bg-background px-2 text-center",
                          stickyHeader && "top-0 z-30",
                        )}
                      >
                        <span className="sr-only">{labels.reorderRows}</span>
                      </TableHead>
                    )}
                    {headerGroup.headers.map((header) => {
                      const canSort =
                        !tableController.dragSortEnabled &&
                        header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      const pinned = header.column.getIsPinned();
                      const align =
                        header.column.columnDef.meta?.align ??
                        (pinned === "end" ? "end" : pinned || undefined);
                      return (
                        <TableHead
                          key={header.id}
                          scope={
                            header.subHeaders.length > 0 ? "colgroup" : "col"
                          }
                          colSpan={header.colSpan}
                          className={cn(
                            "border-b",
                            stickyHeader && "sticky top-0 z-10 bg-inherit",
                            pinned && "bg-background",
                            getPinnedColumnClassName(
                              header.column,
                              header.column.getIsPinned() && stickyHeader
                                ? "z-30"
                                : undefined,
                            ),
                            align === "center" &&
                              "text-center [&>div]:justify-center",
                            align === "end" && "text-end [&>div]:justify-end",
                            align === "start" &&
                              "text-start [&>div]:justify-start",
                            header.column.columnDef.meta?.className,
                          )}
                          style={{
                            ...getPinnedColumnStyle(
                              header.column,
                              tableController.pinnedOffsets,
                            ),
                            top: stickyHeader
                              ? tableController.pinnedOffsets.headerTop[
                                  headerIndex
                                ]
                              : undefined,
                          }}
                          data-ui-table-column-id={header.column.id}
                          aria-sort={getAriaSort(canSort, sorted)}
                        >
                          {!header.isPlaceholder && (
                            <DataTableColumnHeader
                              column={header.column}
                              title={flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                              sortable={canSort}
                              align={align ?? "start"}
                              disableHiding={
                                getSystemColumnPinning(header.column.id) ===
                                  undefined && visibleDataColumnCount <= 1
                              }
                              labels={labels}
                            />
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
            </TableHeader>
            <TableBodyPrimitive className="[&_tr:last-child>td]:border-b-0">
              <TableBody
                rows={tableController.rows}
                visibleColumns={tableController.visibleColumns}
                visibleColumnCount={tableController.visibleColumnCount}
                dragSort={tableController.dragSortEnabled}
                loading={loadingEnabled}
                loadingRows={loadingRows}
                paddingClass={paddingClass}
                emptyFallbackText={requestError ? labels.loadFailed : undefined}
                onRetry={requestError ? refresh : undefined}
                labels={labels}
                pinnedOffsets={tableController.pinnedOffsets}
              />
            </TableBodyPrimitive>
          </TablePrimitive>
        </div>
        {overlayLoading && (
          <div
            data-slot="data-table-loading"
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-40 grid place-items-center rounded-2xl bg-background/60"
          >
            <div className="flex items-center gap-2 rounded-3xl border bg-popover px-4 py-2 text-popover-foreground text-sm shadow-sm">
              <Loader label={labels.loading} />
              {labels.loading}
            </div>
          </div>
        )}
      </div>
      {pagination !== false && !dragSort && (
        <div className={isFullLayout ? "shrink-0" : undefined}>
          <DataTablePagination
            table={tableController.table}
            hasNextPage={
              requestTotal === undefined && request
                ? tableData.length >= paginationState.pageSize
                : undefined
            }
            labels={labels}
            disabled={tableLoading}
          />
        </div>
      )}
    </>
  );
  const tableContent = (
    <>
      {tableController.dragSortEnabled && !loadingEnabled ? (
        <DndContext
          id={dragContextId}
          sensors={tableController.sensors}
          collisionDetection={closestCenter}
          onDragEnd={tableController.handleDragEnd}
        >
          {content}
        </DndContext>
      ) : (
        content
      )}
      {bulkActions != null && (
        <TableBulkActions
          table={tableController.table}
          labels={labels}
          disabled={tableLoading}
        >
          <div className="flex shrink-0 items-center justify-end gap-2">
            {bulkActions}
          </div>
        </TableBulkActions>
      )}
    </>
  );
  return (
    <div
      data-slot="data-table"
      className={cn(
        "min-w-0 max-w-full",
        "flex flex-col gap-3",
        isFullLayout && "h-full min-h-0",
        className,
      )}
    >
      {children
        ? children({ ...renderContext, content: tableContent })
        : tableContent}
    </div>
  );
}

export type { TableLabelOverrides, TableLabels } from "./labels";
export type { ColumnDef as DataTableColumnDef, TableFeatures } from "./types";
