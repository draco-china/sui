"use client";

import {
  DataTable,
  dataTableLabelsZhCN,
} from "@workspace/ui/components/data-table";
import { useMemo } from "react";
import { userColumns } from "../support/data-table-columns";
import { createUsers } from "../support/data-table-users";
import type { ExampleProps } from "../types";

const fewUsers = createUsers(3);

export default function DataTableFillFewRows({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const columns = useMemo(() => userColumns(zh), [zh]);
  return (
    // A fixed height stands in for a page; three rows keep their own height
    // and the pagination stays at the bottom.
    <div className="h-[480px] w-full">
      <DataTable
        rowKey="id"
        columns={columns}
        data={fewUsers}
        labels={zh ? dataTableLabelsZhCN : undefined}
      />
    </div>
  );
}
