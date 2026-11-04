import type { DatePickerPreset } from "@workspace/ui/components/date-picker";
import type { ComponentProps, ReactNode } from "react";
import type { DataTableLabels } from "./labels";

type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type Depth = [never, 0, 1, 2];

/** Dot paths into a row, three levels deep: `"name" | "profile.city"`. */
export type Path<T, D extends number = 3> = [D] extends [never]
  ? never
  : T extends Primitive | Date | readonly unknown[]
    ? never
    : {
        [K in keyof T & string]: T[K] extends
          | Primitive
          | Date
          | readonly unknown[]
          ? K
          : K | `${K}.${Path<NonNullable<T[K]>, Depth[D]>}`;
      }[keyof T & string];

/** The value type at a dot path. */
export type PathValue<
  T,
  P extends string,
> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<NonNullable<T[K]>, Rest>
    : unknown
  : P extends keyof T
    ? T[P]
    : unknown;

export type DataTableValueType =
  | "text"
  | "number"
  | "money"
  | "percent"
  | "date"
  | "datetime"
  | "enum"
  | "boolean";

export type DataTableSearchType =
  | "text"
  | "number"
  | "numberRange"
  | "select"
  | "multiSelect"
  | "date"
  | "dateRange"
  | "datetimeRange"
  | "boolean"
  | "custom";

export interface DataTableOption {
  readonly value: string;
  readonly label: ReactNode;
  /** Badge tone used when the value renders in a cell. */
  readonly color?: "default" | "secondary" | "destructive" | "outline";
}

export interface DataTableSearchConfig {
  readonly type?: DataTableSearchType;
  readonly label?: ReactNode;
  readonly placeholder?: string;
  readonly initialValue?: unknown;
  /** Lower values come first in the query form. */
  readonly order?: number;
  /** Grid columns the field spans in the query form. */
  readonly colSpan?: number;
  /** Options for select fields; a function receives the other form values. */
  readonly options?:
    | readonly DataTableOption[]
    | ((values: Record<string, unknown>) => readonly DataTableOption[]);
  /** Fields whose change clears this one, such as a province for a city. */
  readonly dependencies?: readonly string[];
  /** Quick ranges for a date range field, such as the last seven days. */
  readonly presets?: readonly DatePickerPreset[];
  /** Maps the form value to request parameters, such as `{ startAt, endAt }`. */
  readonly transform?: (value: unknown) => Record<string, unknown>;
  /** Local matcher; overrides the matcher of the field type. */
  readonly match?: (cellValue: unknown, value: unknown) => boolean;
  readonly render?: (props: {
    readonly value: unknown;
    readonly onChange: (value: unknown) => void;
    readonly values: Record<string, unknown>;
  }) => ReactNode;
}

interface ColumnBase {
  readonly title?: ReactNode;
  readonly width?: number;
  readonly minWidth?: number;
  readonly align?: "start" | "center" | "end";
  readonly fixed?: "start" | "end";
  readonly hidden?: boolean;
  readonly className?: string;
  readonly tooltip?: ReactNode;
  /** Card mode uses the first `primary` column as the card heading. */
  readonly primary?: boolean;
}

export interface DataTableDataColumn<
  TData,
  TKey extends Path<TData> = Path<TData>,
> extends ColumnBase {
  readonly key: TKey;
  readonly id?: string;
  readonly valueType?: DataTableValueType;
  readonly valueEnum?: readonly DataTableOption[];
  readonly format?: Intl.NumberFormatOptions & Intl.DateTimeFormatOptions;
  readonly render?: (
    value: PathValue<TData, TKey>,
    row: TData,
    index: number,
  ) => ReactNode;
  readonly sortable?: boolean;
  readonly sorter?: (a: TData, b: TData) => number;
  /** Includes the column in the toolbar keyword search. */
  readonly keyword?: boolean;
  /** Adds a quick multi-select filter to the toolbar. */
  readonly filter?: boolean;
  /** Adds the column to the query form. */
  readonly search?: boolean | DataTableSearchConfig;
  /** Hides the column in the table while keeping it searchable. */
  readonly searchOnly?: boolean;
  readonly ellipsis?: boolean;
  readonly copyable?: boolean;
  /** Text written to CSV exports. */
  readonly exportValue?: (value: PathValue<TData, TKey>, row: TData) => string;
}

export interface DataTableDisplayColumn<TData> extends ColumnBase {
  readonly id: string;
  readonly key?: never;
  readonly render: (row: TData, index: number) => ReactNode;
}

/** A field configuration; the union keeps `render` typed per key. */
export type DataTableColumn<TData> =
  | { [K in Path<TData>]: DataTableDataColumn<TData, K> }[Path<TData>]
  | DataTableDisplayColumn<TData>;

/** Column shape after defaults, used by the engine and the view. */
export interface NormalizedColumn<TData> {
  readonly id: string;
  readonly key?: string;
  readonly title: ReactNode;
  readonly titleText: string;
  readonly valueType: DataTableValueType;
  readonly valueEnum?: readonly DataTableOption[];
  readonly display: boolean;
  readonly config: DataTableColumn<TData>;
  readonly search?: DataTableSearchConfig & {
    readonly type: DataTableSearchType;
  };
  readonly sortable: boolean;
  readonly keyword: boolean;
  readonly filter: boolean;
  readonly searchOnly: boolean;
  /** Plugin columns: selection, drag handles and expand toggles. */
  readonly utility?: boolean;
  readonly renderCell: (row: TData, index: number) => ReactNode;
  readonly getValue: (row: TData) => unknown;
  readonly exportText: (row: TData) => string;
}

export type SortOrder = "asc" | "desc";
export interface SortItem {
  readonly key: string;
  readonly order: SortOrder;
}

export type FilterOperator =
  | "eq"
  | "neq"
  | "contains"
  | "startsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "in"
  | "notIn"
  | "isEmpty";

export interface FilterRule {
  readonly id: string;
  readonly field: string;
  readonly operator: FilterOperator;
  readonly value?: unknown;
}

export interface FilterGroup {
  readonly logic: "and" | "or";
  readonly rules: readonly FilterRule[];
}

export interface DataTableQuery {
  readonly keyword: string;
  readonly search: Readonly<Record<string, unknown>>;
  readonly filters: Readonly<Record<string, readonly string[]>>;
  readonly advanced?: FilterGroup;
}

export interface DataTableState {
  readonly query: DataTableQuery;
  readonly sort: readonly SortItem[];
  readonly page: number;
  readonly pageSize: number;
}

export interface DataTableColumnState {
  readonly visibility: Readonly<Record<string, boolean>>;
  readonly order: readonly string[];
  readonly pinning: Readonly<Record<string, "start" | "end" | undefined>>;
  readonly widths: Readonly<Record<string, number>>;
}

export type DataTableDensity = "compact" | "default" | "comfortable";

/** How the rows are shown: the table, a list, or a grid of cards (the `views` plugin). */
export type DataTableView = "table" | "list" | "grid";

export interface DataTableRequestParams extends Omit<DataTableQuery, "search"> {
  readonly page: number;
  readonly pageSize: number;
  readonly sort: readonly SortItem[];
  /** Query form values after each field's `transform`. */
  readonly search: Readonly<Record<string, unknown>>;
  readonly signal: AbortSignal;
}

export interface DataTableResponse<TData> {
  readonly data: readonly TData[];
  readonly total?: number;
}

export type DataTableRequest<TData> = (
  params: DataTableRequestParams,
) => Promise<DataTableResponse<TData>> | DataTableResponse<TData>;

export type DataTableRowKey<TData> =
  | Extract<keyof TData, string | number>
  | ((row: TData, index: number) => string);

export interface DataTableRowSelection<TData> {
  readonly onChange?: (rows: readonly TData[]) => void;
  readonly isDisabled?: (row: TData) => boolean;
}

export interface DataTableSelection<TData> {
  readonly ids: ReadonlySet<string>;
  readonly rows: readonly TData[];
  readonly pageState: "all" | "some" | "none";
  isSelected(id: string): boolean;
  /** Rows that `rowSelection.isDisabled` locks; toggling them does nothing. */
  isDisabled(row: TData): boolean;
  toggle(id: string, row: TData): void;
  togglePage(): void;
  clear(): void;
}

export interface DataTableFeatures {
  readonly virtual?: { readonly rowHeight: number; readonly overscan: number };
  readonly expandable?: boolean;
  readonly dragSort?: boolean;
  readonly resizable?: boolean;
}

export type DataTableSlot =
  | "header"
  /** More inputs right after the keyword search, before the filters. */
  | "toolbarSearch"
  | "toolbarStart"
  | "toolbarEnd"
  | "floating";

export interface DataTableRowRenderProps<TData> {
  readonly row: TData;
  readonly id: string;
  readonly index: number;
  /** Row attributes the core applies; spread them on the row element. */
  readonly rowProps: ComponentProps<"tr">;
  readonly children: ReactNode;
}

/**
 * Features beyond the core are plugins. `setup` runs as a hook in its own
 * component under the table's provider. Memoize the plugin list so columns
 * and features are not rebuilt on every render.
 */
export interface DataTablePlugin<TData = unknown> {
  readonly name: string;
  readonly features?: DataTableFeatures;
  readonly initialState?: () => Partial<DataTableState> | undefined;
  readonly initialColumnState?: () => Partial<DataTableColumnState> | undefined;
  readonly initialDensity?: () => DataTableDensity | undefined;
  /** The view a reader starts in, known on the server too. */
  readonly defaultView?: DataTableView;
  /** A view restored for this reader (persist); wins over `defaultView`. */
  readonly initialView?: () => DataTableView | undefined;
  readonly columns?: (
    columns: readonly NormalizedColumn<TData>[],
  ) => NormalizedColumn<TData>[];
  readonly setup?: (table: DataTableInstance<TData>) => void;
  readonly slots?: Partial<
    Record<DataTableSlot, (table: DataTableInstance<TData>) => ReactNode>
  >;
  readonly wrapBody?: (
    children: ReactNode,
    table: DataTableInstance<TData>,
  ) => ReactNode;
  readonly renderRow?: (
    props: DataTableRowRenderProps<TData>,
    table: DataTableInstance<TData>,
  ) => ReactNode;
  /**
   * The rows in a view other than the table; `undefined` leaves the view to
   * the next plugin, and to the table when none renders it.
   */
  readonly renderView?: (
    view: DataTableView,
    table: DataTableInstance<TData>,
  ) => ReactNode | undefined;
  readonly renderAfterRow?: (
    row: TData,
    id: string,
    table: DataTableInstance<TData>,
  ) => ReactNode;
}

export interface DataTableActions {
  reload(): void;
  reset(): void;
}

export interface DataTableInstance<TData> extends DataTableActions {
  readonly columns: readonly NormalizedColumn<TData>[];
  /** Visible table columns in display order, pinned columns at the edges. */
  readonly visibleColumns: readonly NormalizedColumn<TData>[];
  readonly rows: readonly TData[];
  readonly total: number | undefined;
  readonly pageCount: number | undefined;
  readonly hasNextPage: boolean;
  readonly paginated: boolean;
  readonly pageSizes: readonly number[];
  /** The page size before plugins or the reader change it. */
  readonly defaultPageSize: number;
  readonly loading: boolean;
  readonly error: unknown;
  readonly remote: boolean;
  readonly state: DataTableState;
  readonly columnState: DataTableColumnState;
  readonly density: DataTableDensity;
  readonly view: DataTableView;
  readonly selection: DataTableSelection<TData> | undefined;
  readonly labels: DataTableLabels;
  readonly locale: string | undefined;
  readonly plugins: readonly DataTablePlugin<TData>[];
  readonly features: DataTableFeatures;
  hasPlugin(name: string): boolean;
  getRowId(row: TData, index: number): string;
  setState(updater: (state: DataTableState) => DataTableState): void;
  setKeyword(keyword: string): void;
  setSearch(values: Record<string, unknown>): void;
  setFilter(key: string, values: readonly string[]): void;
  setAdvanced(group: FilterGroup | undefined): void;
  resetQuery(): void;
  toggleSort(key: string, multi?: boolean): void;
  setSort(sort: readonly SortItem[]): void;
  setPage(page: number): void;
  setPageSize(pageSize: number): void;
  setColumnState(
    updater: (state: DataTableColumnState) => DataTableColumnState,
  ): void;
  resetColumns(): void;
  setDensity(density: DataTableDensity): void;
  setView(view: DataTableView): void;
  isExpanded(id: string): boolean;
  toggleExpanded(id: string): void;
  /** Option counts for a column, when rows are local. */
  getFacets(key: string): ReadonlyMap<string, number> | undefined;
  /** Every row that matches the query, sorted; remote tables request them. */
  getAllRows(): Promise<readonly TData[]>;
  /**
   * Replaces rows, used by drag sorting. Reordered local rows go back into
   * the slots they held, so rows a filter hides keep their place. Returns
   * every local row in the new order.
   */
  setRows(rows: readonly TData[]): readonly TData[];
}
