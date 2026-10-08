import {
  DataTable,
  type DataTableColumnDef,
  DataTableColumnSettings,
  DataTableDensity,
  DataTableSearch,
} from "@workspace/ui/blocks/data-table";
import type { ExampleProps } from "../types";
import { chineseTableLabels } from "./block-table-labels";

type RecordRow = { id: string; name: string; status: string; amount: number };
const rows: RecordRow[] = Array.from({ length: 24 }, (_, index) => ({
  id: `R-${String(index + 1).padStart(3, "0")}`,
  name: ["Orion", "Northwind", "Atlas", "Nimbus"][index % 4],
  status: index % 3 === 0 ? "Draft" : "Active",
  amount: (index + 1) * 125,
}));

export default function TableBlockDemo({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const columns: DataTableColumnDef<RecordRow>[] = [
    { accessorKey: "id", header: "ID", meta: { pinned: "start" } },
    {
      accessorKey: "name",
      header: zh ? "名称" : "Name",
      meta: { search: { placeholder: zh ? "搜索名称" : "Search names" } },
    },
    {
      accessorKey: "status",
      header: zh ? "状态" : "Status",
      meta: {
        filter: {
          multiple: true,
          placeholder: zh ? "筛选状态" : "Filter status",
          options: [
            { label: zh ? "草稿" : "Draft", value: "Draft" },
            { label: zh ? "启用" : "Active", value: "Active" },
          ],
        },
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
    <DataTable
      columns={columns}
      data={rows}
      rowKey="id"
      layout="auto"
      label={zh ? "项目列表" : "Projects"}
      className="w-full"
      labels={zh ? chineseTableLabels : undefined}
    >
      {({
        content,
        table,
        tableSize,
        onTableSizeChange,
        labels,
        loading,
        defaultColumnOrder,
        defaultColumnPinning,
      }) => (
        <>
          <div className="flex shrink-0 flex-col gap-3">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <DataTableDensity
                value={tableSize}
                onValueChange={onTableSizeChange}
                disabled={loading}
                labels={labels}
              />
              <DataTableColumnSettings
                table={table}
                defaultColumnOrder={defaultColumnOrder}
                defaultColumnPinning={defaultColumnPinning}
                disabled={loading}
                labels={labels}
              />
            </div>
            <DataTableSearch table={table} disabled={loading} labels={labels} />
          </div>

          {content}
        </>
      )}
    </DataTable>
  );
}
