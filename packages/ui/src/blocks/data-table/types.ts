import type { RankingInfo } from "@tanstack/match-sorter-utils";
import type * as TanStack from "@tanstack/react-table";
import {
  columnFacetingFeature,
  columnFilteringFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFns,
  metaHelper,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
} from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { ColumnFilterMeta } from "./table-state";

export const uiTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnFacetingFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  filterFns,
  sortFns,
  filterMeta: metaHelper<{ itemRank?: RankingInfo }>(),
});

export type TableFeatures = typeof uiTableFeatures;
export type ColumnDef<
  TData extends TanStack.RowData,
  TValue = unknown,
> = TanStack.ColumnDef<TableFeatures, TData, TValue>;
export type Column<
  TData extends TanStack.RowData,
  TValue = unknown,
> = TanStack.Column<TableFeatures, TData, TValue>;
export type Cell<
  TData extends TanStack.RowData,
  TValue = unknown,
> = TanStack.Cell<TableFeatures, TData, TValue>;
export type Row<TData extends TanStack.RowData> = TanStack.Row<
  TableFeatures,
  TData
>;
export type Table<TData extends TanStack.RowData> = TanStack.Table<
  TableFeatures,
  TData
>;
export type TableOptions<TData extends TanStack.RowData> =
  TanStack.TableOptions<TableFeatures, TData>;
export type FilterFn<TData extends TanStack.RowData> = TanStack.FilterFn<
  TableFeatures,
  TData
>;
export type SortFn<TData extends TanStack.RowData> = TanStack.SortFn<
  TableFeatures,
  TData
>;
export type {
  ColumnFiltersState,
  ColumnPinningState,
  ColumnVisibilityState as VisibilityState,
  OnChangeFn,
  PaginationState,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";
export {
  createSortedRowModel,
  flexRender,
  useTable,
} from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface ColumnMeta<
    TFeatures extends TanStack.TableFeatures,
    TData extends TanStack.RowData,
    TValue extends TanStack.CellData = TanStack.CellData,
  > {
    pinned?: "start" | "end";
    align?: "start" | "center" | "end";
    className?: string;
    filterOnly?: boolean;
    search?:
      | boolean
      | {
          placeholder?: string;
          type?: "text" | "date" | "datetime-local";
          disabled?: boolean;
          render?: (props: {
            value: string;
            onChange: (value: string | undefined) => void;
            disabled: boolean;
          }) => ReactNode;
        };
    filter?: ColumnFilterMeta<TData>;
    __uiTableFixedSize?: number;
  }
}
