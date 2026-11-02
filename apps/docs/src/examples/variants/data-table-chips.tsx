"use client";

import {
  DataTable,
  dataTableLabelsZhCN,
} from "@workspace/ui/components/data-table";
import { useMemo } from "react";
import { userColumns } from "../support/data-table-columns";
import { users } from "../support/data-table-users";
import type { ExampleProps } from "../types";

export default function DataTableChips({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const columns = useMemo(() => userColumns(zh), [zh]);
  return (
    <DataTable
      rowKey="id"
      layout="auto"
      chips
      columns={columns}
      data={users}
      labels={zh ? dataTableLabelsZhCN : undefined}
      initialState={{
        pageSize: 5,
        query: { keyword: "a", filters: { status: ["active", "invited"] } },
      }}
      className="w-full"
    />
  );
}
