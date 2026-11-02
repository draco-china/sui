"use client";

import {
  columnSettings,
  DataTable,
  dataTableLabelsZhCN,
  density,
  exportCsv,
} from "@workspace/ui/components/data-table";
import { useMemo } from "react";
import { userColumns } from "../support/data-table-columns";
import { type User, users } from "../support/data-table-users";
import type { ExampleProps } from "../types";

export default function DataTableLocal({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const columns = useMemo(() => userColumns(zh), [zh]);
  const plugins = useMemo(
    () => [
      density<User>(),
      columnSettings<User>(),
      exportCsv<User>({ filename: "users" }),
    ],
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
