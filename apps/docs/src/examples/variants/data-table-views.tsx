"use client";

import { Badge } from "@workspace/ui/components/badge";
import {
  DataTable,
  dataTableLabelsZhCN,
  views,
} from "@workspace/ui/components/data-table";
import { useMemo } from "react";
import { userColumns } from "../support/data-table-columns";
import { type User, users } from "../support/data-table-users";
import type { ExampleProps } from "../types";

export default function DataTableViews({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const columns = useMemo(() => userColumns(zh), [zh]);
  const plugins = useMemo(
    () => [
      views<User>({
        grid: (user) => (
          <div className="flex h-full flex-col gap-2 rounded-xl border p-4">
            <div className="font-medium">{user.name}</div>
            <div className="truncate text-muted-foreground text-sm">
              {user.email}
            </div>
            <div className="mt-auto flex gap-2">
              <Badge variant="secondary">{user.role}</Badge>
              <Badge variant="outline">{user.status}</Badge>
            </div>
          </div>
        ),
      }),
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
