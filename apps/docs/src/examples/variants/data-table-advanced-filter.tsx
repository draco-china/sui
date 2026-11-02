"use client";

import {
  advancedFilter,
  DataTable,
  dataTableLabelsZhCN,
} from "@workspace/ui/components/data-table";
import { useMemo } from "react";
import { userColumns } from "../support/data-table-columns";
import { type User, users } from "../support/data-table-users";
import type { ExampleProps } from "../types";

export default function DataTableAdvancedFilter({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const columns = useMemo(() => userColumns(zh), [zh]);
  const plugins = useMemo(
    () => [advancedFilter<User>({ storageKey: "sui-docs-user-views" })],
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
      initialState={{
        query: {
          advanced: {
            logic: "and",
            rules: [
              { id: "spend", field: "amount", operator: "gte", value: "1000" },
            ],
          },
        },
      }}
      className="w-full"
    />
  );
}
