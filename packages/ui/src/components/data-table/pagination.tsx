"use client";

import {
  Pagination,
  PaginationControls,
  PaginationInfo,
  PaginationPageSize,
} from "@workspace/ui/components/pagination";
import { cn } from "cn";
import { useDataTableContext } from "./context";

/** Row count, page size and page navigation, kept at the bottom edge. */
export function DataTablePagination({ className }: { className?: string }) {
  const table = useDataTableContext();
  const { labels, state, total } = table;
  return (
    <Pagination
      data-slot="data-table-pagination"
      disabled={table.loading && table.rows.length === 0}
      page={state.page}
      onPageChange={table.setPage}
      perPage={state.pageSize}
      totalCount={total}
      hasNextPage={table.hasNextPage}
      labels={{
        firstPage: labels.firstPage,
        previousPage: labels.previousPage,
        nextPage: labels.nextPage,
        lastPage: labels.lastPage,
        pageNumber: labels.pageNumber,
        pageSize: labels.pageSize,
      }}
      className={cn("flex-wrap gap-y-2", className)}
    >
      <PaginationInfo className="min-w-0 flex-1">
        {total === undefined
          ? labels.pageRows(table.rows.length)
          : labels.total(total)}
      </PaginationInfo>
      <PaginationPageSize
        value={state.pageSize}
        onValueChange={table.setPageSize}
        options={[...table.pageSizes]}
        label={labels.pageSize}
      />
      <PaginationControls controls={total === undefined ? "simple" : "full"} />
    </Pagination>
  );
}
