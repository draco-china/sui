import {
  DataTable,
  type DataTableColumnDef,
  DataTableSearch,
} from "@workspace/ui/blocks/data-table";
import { Badge } from "@workspace/ui/components/badge";
import type { ExampleProps } from "../types";
import { chineseTableLabels } from "./block-table-labels";

type Project = { id: string; name: string; status: string };
const records: Project[] = Array.from({ length: 8 }, (_, index) => ({
  id: `R-${index + 1}`,
  name: ["Orion", "Northwind", "Atlas", "Nimbus"][index % 4],
  status: index < 4 ? "Active" : "Draft",
}));

export default function TableSearch({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const stateLabels = {
    active: zh ? "启用" : "Active",
    draft: zh ? "草稿" : "Draft",
  };
  const columns: DataTableColumnDef<Project>[] = [
    { accessorKey: "id", header: "ID" },
    {
      accessorKey: "name",
      header: zh ? "名称" : "Name",
      meta: { search: { placeholder: zh ? "搜索名称" : "Search names" } },
    },
    {
      accessorKey: "status",
      header: zh ? "状态" : "Status",
      cell: ({ getValue }) => (
        <Badge variant="secondary">
          {getValue() === "Active" ? stateLabels.active : stateLabels.draft}
        </Badge>
      ),
      meta: {
        filter: {
          multiple: true,
          placeholder: zh ? "筛选状态" : "Filter status",
          options: [
            { value: "Active", label: zh ? "启用" : "Active" },
            { value: "Draft", label: zh ? "草稿" : "Draft" },
          ],
        },
      },
    },
  ];
  return (
    <DataTable
      columns={columns}
      data={records}
      rowKey="id"
      className="w-full"
      labels={zh ? chineseTableLabels : undefined}
    >
      {({ content, table, loading, labels }) => (
        <>
          {content}
          <DataTableSearch
            table={table}
            disabled={loading}
            labels={labels}
            layout="inline"
            className="justify-end"
          />
        </>
      )}
    </DataTable>
  );
}
