"use client";

import { Badge } from "@workspace/ui/components/badge";
import {
  columnSettings,
  DataTable,
  DataTableContent,
  DataTableFacetedFilter,
  DataTableFilterChips,
  DataTablePagination,
  DataTableSearch,
  DataTableSlotContent,
  dataTableLabelsZhCN,
  useDataTable,
} from "@workspace/ui/components/data-table";
import { useMemo } from "react";
import { userColumns } from "../support/data-table-columns";
import { type User, users } from "../support/data-table-users";
import type { ExampleProps } from "../types";

export default function DataTableComposition({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const columns = useMemo(() => userColumns(zh), [zh]);
  const plugins = useMemo(() => [columnSettings<User>()], []);
  const table = useDataTable({
    rowKey: "id",
    columns,
    data: users,
    plugins,
    initialState: { pageSize: 5 },
    labels: zh ? dataTableLabelsZhCN : undefined,
  });
  return (
    <DataTable table={table} layout="auto" className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <DataTableSearch className="sm:w-56" />
        <DataTableFacetedFilter column="status" />
        <Badge variant="outline" className="ms-auto">
          {zh ? `匹配 ${table.total} 条` : `${table.total} matches`}
        </Badge>
        <DataTableSlotContent slot="toolbarEnd" />
      </div>
      <DataTableFilterChips />
      <DataTableContent className="rounded-xl border" />
      <DataTablePagination />
    </DataTable>
  );
}
