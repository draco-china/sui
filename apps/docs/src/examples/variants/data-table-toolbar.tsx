"use client";

import {
  DataTable,
  type DataTableColumn,
  dataTableLabelsZhCN,
  density,
} from "@workspace/ui/components/data-table";
import { useMemo } from "react";
import { userColumns } from "../support/data-table-columns";
import { type User, users } from "../support/data-table-users";
import type { ExampleProps } from "../types";

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export default function DataTableToolbarExample({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const columns = useMemo<DataTableColumn<User>[]>(
    () => [
      ...userColumns(zh).map((column) =>
        "key" in column && column.key === "createdAt"
          ? {
              ...column,
              search: {
                type: "dateRange" as const,
                presets: [
                  {
                    label: zh ? "最近 7 天" : "Last 7 days",
                    value: () => ({ from: daysAgo(6), to: new Date() }),
                  },
                  {
                    label: zh ? "最近 30 天" : "Last 30 days",
                    value: () => ({ from: daysAgo(29), to: new Date() }),
                  },
                ],
              },
            }
          : column,
      ),
      {
        key: "verified",
        title: zh ? "已验证" : "Verified",
        valueType: "boolean",
        search: true,
      },
    ],
    [zh],
  );
  const plugins = useMemo(() => [density<User>()], []);
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
