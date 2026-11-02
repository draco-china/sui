"use client";

import {
  DataTable,
  type DataTableColumn,
  dataTableLabelsZhCN,
  queryForm,
  reload,
} from "@workspace/ui/components/data-table";
import { useMemo } from "react";
import { userOptions } from "../support/data-table-columns";
import {
  citiesOf,
  provinces,
  type User,
  users,
} from "../support/data-table-users";
import type { ExampleProps } from "../types";

export default function DataTableQueryForm({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const columns = useMemo<DataTableColumn<User>[]>(() => {
    const { status, role } = userOptions(zh);
    return [
      {
        key: "name",
        title: zh ? "姓名" : "Name",
        search: true,
        sortable: true,
      },
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
        filter: false,
        search: { type: "multiSelect" },
      },
      {
        key: "amount",
        title: zh ? "消费" : "Spend",
        valueType: "money",
        align: "end",
        search: true,
      },
      {
        key: "createdAt",
        title: zh ? "创建时间" : "Created",
        valueType: "date",
        search: true,
      },
      {
        key: "profile.province",
        id: "province",
        title: zh ? "省份" : "Province",
        search: { type: "select", options: provinces, order: 1 },
      },
      {
        key: "profile.city",
        id: "city",
        title: zh ? "城市" : "City",
        search: {
          type: "select",
          order: 2,
          dependencies: ["province"],
          options: (values) => citiesOf(values.province),
        },
      },
      {
        key: "verified",
        title: zh ? "已验证" : "Verified",
        valueType: "boolean",
        searchOnly: true,
      },
    ];
  }, [zh]);
  const plugins = useMemo(
    () => [queryForm<User>({ collapsedCount: 3 }), reload<User>()],
    [],
  );
  return (
    <DataTable
      rowKey="id"
      layout="auto"
      columns={columns}
      data={users}
      plugins={plugins}
      labels={zh ? dataTableLabelsZhCN : undefined}
      className="w-full"
    />
  );
}
