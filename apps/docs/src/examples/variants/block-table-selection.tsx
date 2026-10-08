import {
  DataTable,
  type DataTableColumnDef,
} from "@workspace/ui/blocks/data-table";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { useState } from "react";
import type { ExampleProps } from "../types";
import { chineseTableLabels } from "./block-table-labels";

type Member = { id: string; name: string; email: string };
const members: Member[] = [
  { id: "1", name: "Alex Chen", email: "alex@example.com" },
  { id: "2", name: "Sam Rivera", email: "sam@example.com" },
  { id: "3", name: "Jordan Lee", email: "jordan@example.com" },
];

export default function TableSelection({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [message, setMessage] = useState("");
  const columns: DataTableColumnDef<Member>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label={zh ? "选择当前页" : "Select page"}
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`${zh ? "选择" : "Select"} ${row.original.name}`}
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(value)}
        />
      ),
      enableSorting: false,
    },
    { accessorKey: "name", header: zh ? "姓名" : "Name" },
    { accessorKey: "email", header: zh ? "邮箱" : "Email" },
    {
      id: "actions",
      header: zh ? "操作" : "Actions",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            setMessage(`${zh ? "已查看" : "Viewed"} ${row.original.name}`)
          }
        >
          {zh ? "查看" : "View"}
        </Button>
      ),
    },
  ];
  return (
    <div className="flex w-full flex-col gap-3">
      <DataTable
        columns={columns}
        data={members}
        rowKey="id"
        layout="auto"
        pagination={false}
        bulkToolbar={({ selectedRows, table }) => (
          <Button
            size="sm"
            onClick={() => {
              setMessage(
                `${zh ? "已导出" : "Exported"} ${selectedRows.length}`,
              );
              table.resetRowSelection();
            }}
          >
            {zh ? "导出所选" : "Export selected"}
          </Button>
        )}
        labels={
          zh
            ? {
                ...chineseTableLabels,
                bulkClearSelection: "清除选择",
                bulkAnnouncement: (count) => `已选择 ${count} 行`,
              }
            : undefined
        }
      />
      <p role="status" className="text-muted-foreground text-sm">
        {message}
      </p>
    </div>
  );
}
