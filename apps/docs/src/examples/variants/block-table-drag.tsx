import {
  DataTable,
  type DataTableColumnDef,
} from "@workspace/ui/blocks/data-table";
import { Button } from "@workspace/ui/components/button";
import { useState } from "react";
import type { ExampleProps } from "../types";
import { chineseTableLabels } from "./block-table-labels";

type Task = { id: string; name: string };
const initialRows: Task[] = [
  { id: "1", name: "Design tokens" },
  { id: "2", name: "Component library" },
  { id: "3", name: "Documentation" },
  { id: "4", name: "Release checklist" },
];
export default function TableDrag({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const stateLabels = zh
    ? {
        empty: "显示空状态",
        restore: "恢复数据",
      }
    : {
        empty: "Show empty state",
        restore: "Restore rows",
      };
  const [rows, setRows] = useState(initialRows);
  const columns: DataTableColumnDef<Task>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: zh ? "任务" : "Task" },
  ];
  return (
    <div className="flex w-full flex-col gap-3">
      <Button
        size="sm"
        variant="outline"
        className="w-fit"
        onClick={() =>
          setRows((current) => (current.length ? [] : initialRows))
        }
      >
        {rows.length ? stateLabels.empty : stateLabels.restore}
      </Button>
      <DataTable
        columns={columns}
        data={rows}
        rowKey="id"
        dragSort={{ rowKey: "id", onDragSortEnd: setRows }}
        pagination={false}
        layout="auto"
        labels={
          zh
            ? {
                ...chineseTableLabels,
                noData: "暂无任务",
              }
            : undefined
        }
      />
      <p role="status" className="text-muted-foreground text-sm">
        {rows.map((row) => row.name).join(" → ")}
      </p>
    </div>
  );
}
