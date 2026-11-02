"use client";

import { Button } from "@workspace/ui/components/button";
import {
  bulkActions,
  DataTable,
  type DataTableColumn,
  dataTableLabelsZhCN,
  proPlugins,
} from "@workspace/ui/components/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Archive, Download, Ellipsis, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { userOptions } from "../support/data-table-columns";
import { fetchUsers, type User } from "../support/data-table-users";
import type { ExampleProps } from "../types";

export default function DataTableDemo({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const columns = useMemo<DataTableColumn<User>[]>(() => {
    const { status, role } = userOptions(zh);
    return [
      {
        key: "name",
        title: zh ? "姓名" : "Name",
        sortable: true,
        primary: true,
        search: { placeholder: zh ? "姓名或邮箱" : "Name or email" },
      },
      { key: "email", title: zh ? "邮箱" : "Email", copyable: true },
      {
        key: "status",
        title: zh ? "状态" : "Status",
        valueEnum: status,
        filter: false,
        search: true,
      },
      {
        key: "role",
        title: zh ? "角色" : "Role",
        valueEnum: role,
        search: { type: "multiSelect" },
      },
      {
        key: "amount",
        title: zh ? "消费" : "Spend",
        valueType: "money",
        align: "end",
        sortable: true,
        search: {
          transform: (value) => {
            const [min, max] = value as [string?, string?];
            return { minAmount: min, maxAmount: max };
          },
        },
      },
      {
        key: "usage",
        title: zh ? "用量" : "Usage",
        valueType: "percent",
        align: "end",
        tooltip: zh ? "本月配额使用比例" : "Share of this month's quota",
      },
      {
        key: "verified",
        title: zh ? "已验证" : "Verified",
        valueType: "boolean",
      },
      {
        key: "createdAt",
        title: zh ? "创建时间" : "Created",
        valueType: "date",
        sortable: true,
        search: {
          transform: (value) => {
            const [from, to] = value as [string?, string?];
            return { createdFrom: from, createdTo: to };
          },
        },
      },
      {
        id: "actions",
        title: zh ? "操作" : "Actions",
        fixed: "end",
        width: 72,
        align: "end",
        render: () => (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={zh ? "更多" : "More"}
                />
              }
            >
              <Ellipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>{zh ? "编辑" : "Edit"}</DropdownMenuItem>
              <DropdownMenuItem variant="destructive">
                {zh ? "删除" : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ];
  }, [zh]);
  const plugins = useMemo(
    () => [
      ...proPlugins<User>({ urlSync: false }),
      bulkActions<User>([
        {
          label: zh ? "导出" : "Export",
          icon: <Download />,
          onClick: () => {},
        },
        {
          label: zh ? "归档" : "Archive",
          icon: <Archive />,
          onClick: () => {},
        },
        {
          label: zh ? "删除" : "Delete",
          icon: <Trash2 />,
          variant: "destructive",
          onClick: (_, table) => table.selection?.clear(),
        },
      ]),
    ],
    [zh],
  );
  return (
    <div className="h-[680px] w-full">
      <DataTable
        rowKey="id"
        columns={columns}
        request={fetchUsers}
        plugins={plugins}
        rowSelection
        labels={zh ? dataTableLabelsZhCN : undefined}
        title={zh ? "用户" : "Users"}
        toolbar={
          <Button size="sm">
            <Plus />
            {zh ? "新建" : "New"}
          </Button>
        }
      />
    </div>
  );
}
