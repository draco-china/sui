"use client";

import {
  DataTable,
  dataTableLabelsZhCN,
  virtual,
} from "@workspace/ui/components/data-table";
import { useMemo } from "react";
import { userColumns } from "../support/data-table-columns";
import { createUsers, type User } from "../support/data-table-users";
import type { ExampleProps } from "../types";

const manyUsers = createUsers(5000);

export default function DataTableVirtual({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const columns = useMemo(() => userColumns(zh), [zh]);
  const plugins = useMemo(() => [virtual<User>({ rowHeight: 41 })], []);
  return (
    <div className="h-[480px] w-full">
      <DataTable
        rowKey="id"
        pagination={false}
        responsive={false}
        columns={columns}
        data={manyUsers}
        plugins={plugins}
        labels={zh ? dataTableLabelsZhCN : undefined}
        title={zh ? `${manyUsers.length} 位用户` : `${manyUsers.length} users`}
      />
    </div>
  );
}
