import {
  DataTable,
  type DataTableColumnDef,
  DataTableRefresh,
  DataTableSearch,
  type DataTableState,
} from "@workspace/ui/blocks/data-table";
import { Button } from "@workspace/ui/components/button";
import { useCallback, useState } from "react";
import type { ExampleProps } from "../types";
import { chineseTableLabels } from "./block-table-labels";

type RecordRow = { id: string; name: string };
const records: RecordRow[] = Array.from({ length: 28 }, (_, index) => ({
  id: `R-${index + 1}`,
  name: `Project ${index + 1}`,
}));
// Replace this local adapter with your API; pagination and sorting run in the request.
async function request(state: DataTableState) {
  const query = String(
    state.columnFilters.find((filter) => filter.id === "name")?.value ?? "",
  ).toLowerCase();
  const rows = records.filter((row) => row.name.toLowerCase().includes(query));
  const sort = state.sorting[0];
  if (sort)
    rows.sort(
      (a, b) =>
        String(a[sort.id as keyof RecordRow]).localeCompare(
          String(b[sort.id as keyof RecordRow]),
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
export default function TableRequest({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const stateLabels = zh
    ? {
        includeTotal: "返回总数",
        omitTotal: "省略总数",
      }
    : {
        includeTotal: "Include total",
        omitTotal: "Omit total",
      };
  const [unknownTotal, setUnknownTotal] = useState(false);
  const load = useCallback(
    async (state: DataTableState) => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const result = await request(state);
      return unknownTotal ? { data: result.data } : result;
    },
    [unknownTotal],
  );
  const columns: DataTableColumnDef<RecordRow>[] = [
    { accessorKey: "id", header: "ID" },
    {
      accessorKey: "name",
      header: zh ? "项目" : "Project",
      meta: { search: { placeholder: zh ? "搜索项目" : "Search projects" } },
    },
  ];
  return (
    <div className="flex w-full flex-col gap-3">
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        aria-pressed={unknownTotal}
        onClick={() => setUnknownTotal((value) => !value)}
      >
        {unknownTotal ? stateLabels.includeTotal : stateLabels.omitTotal}
      </Button>
      <DataTable
        columns={columns}
        request={load}
        rowKey="id"
        layout="auto"
        className="w-full"
        labels={zh ? chineseTableLabels : undefined}
      >
        {({ content, table, refresh, loading, labels }) => (
          <>
            <div className="flex shrink-0 flex-col gap-3">
              <div className="flex justify-end">
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
              />
            </div>

            {content}
          </>
        )}
      </DataTable>
    </div>
  );
}
