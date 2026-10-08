import {
  DataTable,
  type DataTableColumnDef,
  DataTableColumnSettings,
  DataTableDensity,
  DataTableRefresh,
  DataTableSearch,
  type DataTableState,
} from "@workspace/ui/blocks/data-table";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { useState } from "react";
import type { ExampleProps } from "../types";
import { chineseTableLabels } from "./block-table-labels";

type Project = { id: string; name: string; amount: number };
const records: Project[] = Array.from({ length: 18 }, (_, index) => ({
  id: `P-${index + 1}`,
  name: `Project ${index + 1}`,
  amount: (index + 1) * 125,
}));
async function request(state: DataTableState) {
  await new Promise((resolve) => setTimeout(resolve, 350));
  const query = String(
    state.columnFilters.find((filter) => filter.id === "name")?.value ?? "",
  ).toLowerCase();
  const rows = records.filter((row) => row.name.toLowerCase().includes(query));
  const sort = state.sorting[0];
  if (sort)
    rows.sort(
      (a, b) =>
        String(a[sort.id as keyof Project]).localeCompare(
          String(b[sort.id as keyof Project]),
          undefined,
          { numeric: true },
        ) * (sort.desc ? -1 : 1),
    );
  const start = state.pagination.pageIndex * state.pagination.pageSize;
  return {
    data: rows.slice(start, start + state.pagination.pageSize),
    total: rows.length,
  };
}

export default function TableHeader({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [message, setMessage] = useState("");
  const columns: DataTableColumnDef<Project>[] = [
    { accessorKey: "id", header: "ID", meta: { pinned: "start" } },
    {
      accessorKey: "name",
      header: zh ? "项目名称" : "Project name",
      meta: {
        search: { placeholder: zh ? "搜索项目名称" : "Search Project name" },
      },
    },
    {
      accessorKey: "amount",
      header: zh ? "金额" : "Amount",
      cell: ({ getValue }) => `$${Number(getValue()).toFixed(2)}`,
      meta: { align: "end" },
    },
  ];
  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <DataTable
        columns={columns}
        request={request}
        rowKey="id"
        labels={zh ? chineseTableLabels : undefined}
      >
        {({
          content,
          table,
          tableSize,
          onTableSizeChange,
          refresh,
          loading,
          labels,
          defaultColumnOrder,
          defaultColumnPinning,
        }) => (
          <>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="font-medium text-base">
                  {zh ? "项目列表" : "Projects"}
                </h3>
                <Badge variant="secondary">{table.getRowCount()}</Badge>
                {refresh && (
                  <DataTableRefresh
                    onRefresh={refresh}
                    loading={loading}
                    labels={labels}
                  />
                )}
              </div>
              <DataTableSearch
                table={table}
                disabled={loading}
                labels={labels}
                layout="inline"
                className="ms-auto"
              />
              <div className="ms-auto flex items-center gap-2">
                <DataTableColumnSettings
                  table={table}
                  defaultColumnOrder={defaultColumnOrder}
                  defaultColumnPinning={defaultColumnPinning}
                  disabled={loading}
                  labels={labels}
                />
                <DataTableDensity
                  value={tableSize}
                  onValueChange={onTableSizeChange}
                  disabled={loading}
                  labels={labels}
                />
                <Button
                  size="sm"
                  onClick={() =>
                    setMessage(
                      zh
                        ? "新建操作由应用处理"
                        : "The app handles the create action",
                    )
                  }
                >
                  {zh ? "新建项目" : "New project"}
                </Button>
              </div>
            </div>
            {content}
          </>
        )}
      </DataTable>
      <p role="status" className="text-muted-foreground text-sm">
        {message ||
          (zh
            ? "刷新放在标题旁，搜索与操作按钮同一行，窄屏自动换行。"
            : "Refresh sits next to the title; search and app actions share the row and wrap on narrow screens.")}
      </p>
    </div>
  );
}
