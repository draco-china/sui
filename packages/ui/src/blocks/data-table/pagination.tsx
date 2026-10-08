import type { RowData } from "@tanstack/react-table";
import {
  Pagination,
  PaginationControls,
  PaginationInfo,
  PaginationPageSize,
} from "@workspace/ui/components/pagination";
import { defaultTableLabels, type TableLabels } from "./labels";
import type { Table } from "./types";

export function DataTablePagination<TData extends RowData>({
  table,
  labels = defaultTableLabels,
  disabled = false,
  hasNextPage,
}: {
  table: Table<TData>;
  labels?: TableLabels;
  disabled?: boolean;
  hasNextPage?: boolean;
}) {
  return (
    <Pagination
      disabled={disabled}
      page={table.store.state.pagination.pageIndex + 1}
      onPageChange={(page) => table.setPageIndex(page - 1)}
      perPage={table.store.state.pagination.pageSize}
      totalCount={table.getPageCount() >= 0 ? table.getRowCount() : undefined}
      hasNextPage={hasNextPage ?? table.getCanNextPage()}
      labels={{
        firstPage: labels.paginationFirstPage,
        previousPage: labels.paginationPreviousPage,
        nextPage: labels.paginationNextPage,
        lastPage: labels.paginationLastPage,
        pageNumber: labels.paginationPage(
          table.store.state.pagination.pageIndex + 1,
        ),
        pageSize: labels.paginationRows,
      }}
      className="px-1"
    >
      <PaginationInfo className="min-w-0 flex-1">
        {table.getPageCount() < 0
          ? labels.paginationLoadedRows(table.getRowModel().rows.length)
          : labels.paginationTotalRows(table.getRowCount())}
      </PaginationInfo>
      <PaginationPageSize
        value={table.store.state.pagination.pageSize}
        onValueChange={(pageSize) => {
          table.setPageSize(pageSize);
          table.setPageIndex(0);
        }}
        options={[10, 20, 50, 100]}
        label={labels.paginationRows}
      />
      <PaginationControls
        controls={table.getPageCount() >= 0 ? "full" : "simple"}
      />
    </Pagination>
  );
}
