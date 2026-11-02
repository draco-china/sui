"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { normalizeColumns, utilityColumn } from "@/components/ui/data-table/columns";
import { useDataTableContext } from "@/components/ui/data-table/context";
import { countFacets, filterRows, requestSearch, sortRows } from "@/components/ui/data-table/engine";
import {
  type DataTableLabelOverrides,
  type DataTableLabels,
  resolveDataTableLabels,
} from "@/components/ui/data-table/labels";
import type {
  DataTableColumn,
  DataTableColumnState,
  DataTableDensity,
  DataTableFeatures,
  DataTableInstance,
  DataTablePlugin,
  DataTableQuery,
  DataTableRequest,
  DataTableRowKey,
  DataTableRowSelection,
  DataTableSelection,
  DataTableState,
  NormalizedColumn,
} from "@/components/ui/data-table/types";

export interface DataTablePaginationOptions {
  readonly pageSize?: number;
  readonly pageSizes?: readonly number[];
}

export interface UseDataTableOptions<TData> {
  readonly columns: readonly DataTableColumn<TData>[];
  /** Local rows; the table sorts, filters and pages them. */
  readonly data?: readonly TData[];
  /** Remote rows; the server sorts, filters and pages them. */
  readonly request?: DataTableRequest<TData>;
  readonly rowKey?: DataTableRowKey<TData>;
  readonly plugins?: readonly DataTablePlugin<TData>[];
  readonly rowSelection?: boolean | DataTableRowSelection<TData>;
  readonly pagination?: false | DataTablePaginationOptions;
  readonly initialState?: Partial<Omit<DataTableState, "query">> & {
    readonly query?: Partial<DataTableQuery>;
  };
  readonly onStateChange?: (state: DataTableState) => void;
  readonly defaultDensity?: DataTableDensity;
  readonly labels?: DataTableLabelOverrides;
  /** Shows the loading state for local data, such as while a query runs. */
  readonly loading?: boolean;
}

type TableActions<TData> = Pick<
  DataTableInstance<TData>,
  | "setKeyword"
  | "setSearch"
  | "setFilter"
  | "setAdvanced"
  | "resetQuery"
  | "toggleSort"
  | "setSort"
  | "setPage"
  | "setPageSize"
  | "resetColumns"
  | "toggleExpanded"
  | "setRows"
  | "reload"
  | "reset"
>;

const defaultPageSizes = [10, 20, 50, 100];
const emptyRows: readonly never[] = [];
const noSubscription = () => () => {};

function initialSearch<TData>(columns: readonly NormalizedColumn<TData>[]) {
  const search: Record<string, unknown> = {};
  for (const column of columns) {
    if (column.search?.initialValue !== undefined)
      search[column.id] = column.search.initialValue;
  }
  return search;
}

function initialColumnState<TData>(
  columns: readonly NormalizedColumn<TData>[],
): DataTableColumnState {
  const visibility: Record<string, boolean> = {};
  const pinning: Record<string, "start" | "end" | undefined> = {};
  for (const column of columns) {
    if (column.config.hidden) visibility[column.id] = false;
    if (column.config.fixed) pinning[column.id] = column.config.fixed;
  }
  return { visibility, order: [], pinning, widths: {} };
}

/** Utility columns stay at the start; pinned columns move to the edges. */
export function orderColumns<TData>(
  columns: readonly NormalizedColumn<TData>[],
  state: DataTableColumnState,
) {
  const rank = new Map(state.order.map((id, index) => [id, index]));
  const data = columns
    .filter(
      (column) =>
        !column.utility &&
        !column.searchOnly &&
        state.visibility[column.id] !== false,
    )
    .map((column, index) => ({ column, index }))
    .sort(
      (a, b) =>
        (rank.get(a.column.id) ?? state.order.length + a.index) -
        (rank.get(b.column.id) ?? state.order.length + b.index),
    )
    .map((entry) => entry.column);
  const pinned = (side: "start" | "end") =>
    data.filter((column) => state.pinning[column.id] === side);
  const free = data.filter((column) => !state.pinning[column.id]);
  return [
    ...columns.filter((column) => column.utility),
    ...pinned("start"),
    ...free,
    ...pinned("end"),
  ];
}

/** State plugins restore, such as the address bar or saved columns. */
function restoredState<TData>(plugins: readonly DataTablePlugin<TData>[]) {
  return {
    state: Object.assign(
      {},
      ...plugins.map((plugin) => plugin.initialState?.()),
    ) as Partial<DataTableState>,
    columns: Object.assign(
      {},
      ...plugins.map((plugin) => plugin.initialColumnState?.()),
    ) as Partial<DataTableColumnState>,
    density: plugins.map((plugin) => plugin.initialDensity?.()).find(Boolean),
  };
}

function createState<TData>(
  initial: UseDataTableOptions<TData>["initialState"],
  columns: readonly NormalizedColumn<TData>[],
  defaultPageSize: number,
  restored: Partial<DataTableState> = {},
): DataTableState {
  return {
    sort: restored.sort ?? initial?.sort ?? [],
    page: restored.page ?? initial?.page ?? 1,
    pageSize: restored.pageSize ?? defaultPageSize,
    query: {
      keyword: "",
      filters: {},
      ...initial?.query,
      search: { ...initialSearch(columns), ...initial?.query?.search },
      ...restored.query,
    },
  };
}

/**
 * Puts reordered rows back into the slots they held, so rows a filter hides
 * keep their place. Rows that are not all from `all` replace them instead.
 */
function mergeRows<TData>(all: readonly TData[], next: readonly TData[]) {
  const moved = new Set(next);
  const slots = all.filter((row) => moved.has(row)).length;
  if (slots !== next.length) return next;
  let cursor = 0;
  return all.map((row) => (moved.has(row) ? next[cursor++] : row));
}

function selectionColumn<TData>(
  labels: DataTableLabels,
  getSelection: () => DataTableSelection<TData> | undefined,
  getRowId: (row: TData, index: number) => string,
  isDisabled?: (row: TData) => boolean,
): NormalizedColumn<TData> {
  return utilityColumn(
    "__select",
    (row, index) => {
      const selection = getSelection();
      const id = getRowId(row, index);
      return (
        <Checkbox
          aria-label={labels.selectRow}
          checked={selection?.isSelected(id) ?? false}
          disabled={isDisabled?.(row)}
          onCheckedChange={() => selection?.toggle(id, row)}
          onClick={(event) => event.stopPropagation()}
        />
      );
    },
    <SelectAllCheckbox />,
  );
}

/** Reads the live table from context: the header element itself is memoized. */
function SelectAllCheckbox() {
  const { selection, labels } = useDataTableContext();
  return (
    <Checkbox
      aria-label={labels.selectAll}
      checked={selection?.pageState === "all"}
      indeterminate={selection?.pageState === "some"}
      onCheckedChange={() => selection?.togglePage()}
    />
  );
}

/** State, data pipeline and plugin host for a data table. */
export function useDataTable<TData>(
  options: UseDataTableOptions<TData>,
): DataTableInstance<TData> {
  const {
    columns: columnConfigs,
    data,
    request,
    rowKey,
    plugins = emptyRows as readonly DataTablePlugin<TData>[],
    rowSelection,
    pagination,
    onStateChange,
    defaultDensity = "default",
  } = options;
  const labels = useMemo(
    () => resolveDataTableLabels(options.labels),
    [options.labels],
  );
  const remote = !!request;
  const paginated = pagination !== false;
  const pageSizes = (pagination || undefined)?.pageSizes ?? defaultPageSizes;
  const defaultPageSize =
    options.initialState?.pageSize ??
    (pagination ? pagination.pageSize : undefined) ??
    pageSizes[0];
  const features = useMemo<DataTableFeatures>(
    () => Object.assign({}, ...plugins.map((plugin) => plugin.features)),
    [plugins],
  );

  // Without a rowKey, each row object keeps one id across pages, sorting and
  // filtering, so selection and expansion never move to another row.
  const autoIds = useRef({ ids: new WeakMap<object, string>(), next: 0 });
  const getRowId = useCallback(
    (row: TData, index: number) => {
      if (typeof rowKey === "function") return rowKey(row, index);
      if (rowKey !== undefined) return String(row[rowKey]);
      if (typeof row !== "object" || row === null) return String(index);
      const { ids } = autoIds.current;
      let id = ids.get(row);
      if (id === undefined) {
        id = String(autoIds.current.next++);
        ids.set(row, id);
      }
      return id;
    },
    [rowKey],
  );

  const baseColumns = useMemo(
    () => normalizeColumns(columnConfigs, labels),
    [columnConfigs, labels],
  );

  // Plugins restore from the address bar and storage, which the server cannot
  // read. Server and hydration renders use the defaults, and the restored
  // state lands in a layout effect before the first paint.
  const hydrating = useSyncExternalStore(
    noSubscription,
    () => false,
    () => true,
  );
  const restoreAfterHydration = useRef(hydrating);
  const [restored] = useState(() =>
    hydrating ? undefined : restoredState(plugins),
  );
  const [state, setStateValue] = useState<DataTableState>(() =>
    createState(
      options.initialState,
      baseColumns,
      defaultPageSize,
      restored?.state,
    ),
  );
  const initialStateRef = useRef(state);
  const setState = useCallback(
    (updater: (current: DataTableState) => DataTableState) =>
      setStateValue(updater),
    [],
  );

  const defaultColumnState = useMemo(
    () => initialColumnState(baseColumns),
    [baseColumns],
  );
  const [columnState, setColumnStateValue] = useState<DataTableColumnState>(
    () => ({ ...defaultColumnState, ...restored?.columns }),
  );
  const [density, setDensity] = useState<DataTableDensity>(
    () => restored?.density ?? defaultDensity,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: restores once, from the options of the hydrating render.
  useLayoutEffect(() => {
    if (!restoreAfterHydration.current) return;
    restoreAfterHydration.current = false;
    const late = restoredState(plugins);
    if (Object.keys(late.state).length > 0) {
      const next = createState(
        options.initialState,
        baseColumns,
        defaultPageSize,
        late.state,
      );
      initialStateRef.current = next;
      setStateValue(next);
    }
    if (Object.keys(late.columns).length > 0)
      setColumnStateValue((current) => ({ ...current, ...late.columns }));
    if (late.density) setDensity(late.density);
  }, []);

  // Drag sorting replaces local rows until the data prop changes.
  const [localOverride, setLocalOverride] = useState<{
    source: readonly TData[] | undefined;
    rows: readonly TData[];
  }>();
  const localData =
    localOverride && localOverride.source === data
      ? localOverride.rows
      : (data ?? emptyRows);

  const [remoteResult, setRemoteResult] = useState<{
    rows: readonly TData[];
    total: number | undefined;
  }>({ rows: emptyRows, total: undefined });
  const [loadingRequest, setLoadingRequest] = useState(remote);
  const [error, setError] = useState<unknown>();
  const [reloadToken, setReloadToken] = useState(0);
  const [selected, setSelected] = useState<ReadonlyMap<string, TData>>(
    () => new Map(),
  );
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const selectionOptions =
    typeof rowSelection === "object" ? rowSelection : undefined;
  const selectionRef = useRef<DataTableSelection<TData> | undefined>(undefined);
  const columns = useMemo(() => {
    let result: NormalizedColumn<TData>[] = [...baseColumns];
    if (rowSelection)
      result = [
        selectionColumn(
          labels,
          () => selectionRef.current,
          getRowId,
          selectionOptions?.isDisabled,
        ),
        ...result,
      ];
    for (const plugin of plugins)
      if (plugin.columns) result = plugin.columns(result);
    return result;
  }, [
    baseColumns,
    rowSelection,
    labels,
    getRowId,
    selectionOptions?.isDisabled,
    plugins,
  ]);

  const filtered = useMemo(
    () => (remote ? emptyRows : filterRows(localData, columns, state.query)),
    [remote, localData, columns, state.query],
  );
  const sorted = useMemo(
    () => (remote ? emptyRows : sortRows(filtered, columns, state.sort)),
    [remote, filtered, columns, state.sort],
  );

  const requestRef = useRef(request);
  requestRef.current = request;
  const requestParams = useMemo(
    () => ({
      page: state.page,
      pageSize: state.pageSize,
      sort: state.sort,
      keyword: state.query.keyword,
      filters: state.query.filters,
      advanced: state.query.advanced,
      search: requestSearch(columns, state.query.search),
    }),
    [state, columns],
  );
  const requestKey = JSON.stringify(requestParams);
  // biome-ignore lint/correctness/useExhaustiveDependencies: requestKey captures every parameter; reloadToken forces a refetch.
  useEffect(() => {
    if (!remote) return;
    const controller = new AbortController();
    setLoadingRequest(true);
    setError(undefined);
    Promise.resolve()
      // A request superseded in the same task, such as by restored URL
      // state after hydration, is never sent.
      .then(() =>
        controller.signal.aborted
          ? undefined
          : requestRef.current?.({
              ...requestParams,
              signal: controller.signal,
            }),
      )
      .then(
        (response) => {
          if (controller.signal.aborted || !response) return;
          setRemoteResult({ rows: response.data, total: response.total });
          setLoadingRequest(false);
        },
        (reason: unknown) => {
          if (controller.signal.aborted) return;
          setError(reason);
          setLoadingRequest(false);
        },
      );
    return () => controller.abort();
  }, [remote, requestKey, reloadToken]);

  const total = remote ? remoteResult.total : sorted.length;
  const rows = useMemo(() => {
    if (remote) return remoteResult.rows;
    if (!paginated || features.dragSort) return sorted;
    const start = (state.page - 1) * state.pageSize;
    return sorted.slice(start, start + state.pageSize);
  }, [
    remote,
    remoteResult.rows,
    paginated,
    features.dragSort,
    sorted,
    state.page,
    state.pageSize,
  ]);
  const pageCount =
    total === undefined
      ? undefined
      : Math.max(1, Math.ceil(total / state.pageSize));
  const hasNextPage =
    pageCount === undefined
      ? rows.length >= state.pageSize
      : state.page < pageCount;

  // Keep the page in range after filtering or deleting rows.
  useEffect(() => {
    if (pageCount !== undefined && state.page > pageCount)
      setStateValue((current) => ({ ...current, page: pageCount }));
  }, [pageCount, state.page]);

  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const reportedState = useRef(state);
  useEffect(() => {
    if (reportedState.current === state) return;
    reportedState.current = state;
    onStateChangeRef.current?.(state);
  }, [state]);

  // Reported after commit: the updater stays pure, and a parent may set its
  // own state in onChange.
  const onSelectionChangeRef = useRef(selectionOptions?.onChange);
  onSelectionChangeRef.current = selectionOptions?.onChange;
  const reportedSelection = useRef(selected);
  useEffect(() => {
    if (reportedSelection.current === selected) return;
    reportedSelection.current = selected;
    onSelectionChangeRef.current?.([...selected.values()]);
  }, [selected]);
  const updateSelected = useCallback(
    (update: (current: Map<string, TData>) => void) =>
      setSelected((current) => {
        const next = new Map(current);
        update(next);
        return next;
      }),
    [],
  );

  const selection = useMemo<DataTableSelection<TData> | undefined>(() => {
    if (!rowSelection) return undefined;
    const isDisabled = (row: TData) => !!selectionOptions?.isDisabled?.(row);
    const pageIds = rows.flatMap((row, index) =>
      isDisabled(row) ? [] : [[getRowId(row, index), row] as const],
    );
    const selectedOnPage = pageIds.filter(([id]) => selected.has(id)).length;
    let pageState: DataTableSelection<TData>["pageState"] = "none";
    if (selectedOnPage > 0)
      pageState = selectedOnPage === pageIds.length ? "all" : "some";
    return {
      ids: new Set(selected.keys()),
      rows: [...selected.values()],
      pageState,
      isSelected: (id) => selected.has(id),
      isDisabled,
      toggle: (id, row) => {
        if (isDisabled(row)) return;
        updateSelected((next) => {
          if (next.has(id)) next.delete(id);
          else next.set(id, row);
        });
      },
      togglePage: () =>
        updateSelected((next) => {
          for (const [id, row] of pageIds) {
            if (pageState === "all") next.delete(id);
            else next.set(id, row);
          }
        }),
      clear: () => updateSelected((next) => next.clear()),
    };
  }, [
    rowSelection,
    selectionOptions?.isDisabled,
    rows,
    getRowId,
    selected,
    updateSelected,
  ]);
  selectionRef.current = selection;

  const toFirstPage = useCallback(
    (update: (current: DataTableState) => Partial<DataTableState>) =>
      setStateValue((current) => ({ ...current, ...update(current), page: 1 })),
    [],
  );
  const setQuery = useCallback(
    (update: (query: DataTableQuery) => Partial<DataTableQuery>) =>
      toFirstPage((current) => ({
        query: { ...current.query, ...update(current.query) },
      })),
    [toFirstPage],
  );

  const facetSource = remote ? undefined : localData;
  const getFacets = useCallback(
    (key: string) => {
      const column = columns.find((entry) => entry.id === key);
      if (!facetSource || !column) return undefined;
      return countFacets(facetSource, column);
    },
    [columns, facetSource],
  );

  const getAllRows = useCallback(async () => {
    if (!remote) return sorted;
    const response = await requestRef.current?.({
      ...requestParams,
      page: 1,
      pageSize: total ?? 10_000,
      signal: new AbortController().signal,
    });
    return response?.data ?? emptyRows;
  }, [remote, sorted, requestParams, total]);

  const pluginNames = useMemo(
    () => new Set(plugins.map((plugin) => plugin.name)),
    [plugins],
  );
  const hasPlugin = useCallback(
    (name: string) => pluginNames.has(name),
    [pluginNames],
  );

  const localDataRef = useRef(localData);
  localDataRef.current = localData;
  // Stable across renders, so parts can list them as hook dependencies.
  const actions = useMemo<TableActions<TData>>(
    () => ({
      setKeyword: (keyword) => setQuery(() => ({ keyword })),
      setSearch: (search) => setQuery(() => ({ search })),
      setFilter: (key, values) =>
        setQuery((query) => ({
          filters: { ...query.filters, [key]: values },
        })),
      setAdvanced: (advanced) => setQuery(() => ({ advanced })),
      resetQuery: () =>
        setQuery(() => ({
          keyword: "",
          filters: {},
          advanced: undefined,
          search: initialSearch(baseColumns),
        })),
      toggleSort: (key, multi = false) =>
        toFirstPage((current) => {
          const existing = current.sort.find((item) => item.key === key);
          const others = multi
            ? current.sort.filter((item) => item.key !== key)
            : [];
          if (!existing) return { sort: [...others, { key, order: "asc" }] };
          if (existing.order === "asc")
            return { sort: [...others, { key, order: "desc" }] };
          return { sort: others };
        }),
      setSort: (sort) => toFirstPage(() => ({ sort })),
      setPage: (page) => setStateValue((current) => ({ ...current, page })),
      setPageSize: (pageSize) => toFirstPage(() => ({ pageSize })),
      resetColumns: () => setColumnStateValue(defaultColumnState),
      toggleExpanded: (id) =>
        setExpanded((current) => {
          const next = new Set(current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      setRows: (next) => {
        if (remote) {
          setRemoteResult((current) => ({ ...current, rows: next }));
          return next;
        }
        const merged = mergeRows(localDataRef.current, next);
        setLocalOverride({ source: data, rows: merged });
        return merged;
      },
      reload: () => setReloadToken((token) => token + 1),
      reset: () => {
        setStateValue(initialStateRef.current);
        setSelected(new Map());
      },
    }),
    [setQuery, toFirstPage, baseColumns, defaultColumnState, remote, data],
  );

  const instance: DataTableInstance<TData> = {
    columns,
    visibleColumns: orderColumns(columns, columnState),
    rows,
    total,
    pageCount,
    hasNextPage,
    loading: remote ? loadingRequest : !!options.loading,
    error,
    remote,
    state,
    columnState,
    density,
    selection,
    labels,
    locale: labels.locale,
    plugins,
    features,
    paginated: paginated && !features.dragSort,
    pageSizes,
    defaultPageSize,
    hasPlugin,
    getRowId,
    setState,
    setColumnState: setColumnStateValue,
    setDensity,
    isExpanded: (id) => expanded.has(id),
    getFacets,
    getAllRows,
    ...actions,
  };

  return instance;
}
