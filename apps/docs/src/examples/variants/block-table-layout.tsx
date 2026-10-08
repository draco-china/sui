import {
  DataTable,
  type DataTableColumnDef,
  DataTableColumnSettings,
  DataTableDensity,
} from "@workspace/ui/blocks/data-table";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { LongText } from "@workspace/ui/components/long-text";
import { useState } from "react";
import type { ExampleProps } from "../types";
import { chineseTableLabels } from "./block-table-labels";

type Project = { id: string; name: string; status: string; amount: number };
const initialRows: Project[] = Array.from({ length: 18 }, (_, index) => ({
  id: String(index + 1),
  name: `production-api-gateway-${index + 1}.asia-east-1.example.com`,
  status: index % 3 === 0 ? "Draft" : "Active",
  amount: (index + 1) * 125,
}));

export default function TableLayout({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const stateLabels = zh
    ? {
        draft: "草稿",
        active: "启用",
        disableDrag: "关闭拖拽",
        enableDrag: "启用拖拽",
      }
    : {
        draft: "Draft",
        active: "Active",
        disableDrag: "Disable drag",
        enableDrag: "Enable drag",
      };
  const [rows, setRows] = useState(initialRows);
  const [drag, setDrag] = useState(false);
  const [message, setMessage] = useState("");
  const columns: DataTableColumnDef<Project>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label={zh ? "选择当前页" : "Select page"}
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onCheckedChange={(checked) =>
            table.toggleAllPageRowsSelected(checked)
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`${zh ? "选择" : "Select"} ${row.original.id}`}
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(checked)}
        />
      ),
      enableSorting: false,
    },
    {
      id: "project",
      header: zh ? "项目" : "Project",
      meta: { align: "center" },
      columns: [
        {
          accessorKey: "id",
          header: "ID",
          size: 64,
          meta: { pinned: "start", align: "center" },
        },
        {
          accessorKey: "name",
          header: zh ? "域名" : "Domain",
          cell: ({ getValue }) => (
            <LongText className="w-48">{String(getValue())}</LongText>
          ),
        },
      ],
    },
    {
      id: "details",
      header: zh ? "详情" : "Details",
      meta: { align: "center" },
      columns: [
        {
          accessorKey: "status",
          header: zh ? "状态" : "Status",
          cell: ({ getValue }) => (
            <Badge variant="secondary">
              {getValue() === "Draft" ? stateLabels.draft : stateLabels.active}
            </Badge>
          ),
          meta: { align: "center" },
        },
        {
          accessorKey: "amount",
          header: zh ? "金额" : "Amount",
          cell: ({ getValue }) => (
            <span className="tabular-nums">
              ${Number(getValue()).toFixed(2)}
            </span>
          ),
          meta: { align: "end" },
        },
      ],
    },
    {
      id: "actions",
      header: zh ? "操作" : "Actions",
      size: 96,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setMessage(`${zh ? "已查看" : "Viewed"} ${row.original.id}`)
          }
        >
          {zh ? "查看" : "View"}
        </Button>
      ),
    },
  ];
  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="h-104 min-h-0">
        <DataTable
          columns={columns}
          data={rows}
          rowKey="id"
          layout="full"
          dragSort={drag ? { rowKey: "id", onDragSortEnd: setRows } : false}
          table={{ stickyHeader: true }}
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
                }
              : undefined
          }
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
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  aria-pressed={drag}
                  onClick={() => setDrag((value) => !value)}
                >
                  {drag ? stateLabels.disableDrag : stateLabels.enableDrag}
                </Button>
                <div className="flex items-center gap-2">
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
              </div>

              {content}
            </>
          )}
        </DataTable>
      </div>
      <p role="status" className="text-muted-foreground text-sm">
        {message ||
          (zh
            ? "横向滚动检查固定列，纵向滚动检查分组表头。"
            : "Scroll horizontally to check pinned columns and vertically to check grouped headers.")}
      </p>
    </div>
  );
}
