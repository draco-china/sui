"use client";

import {
  bulkActions,
  DataTable,
  dataTableLabelsZhCN,
  density,
  expandable,
} from "@workspace/ui/components/data-table";
import { Download } from "lucide-react";
import { useMemo } from "react";
import { userColumns } from "../support/data-table-columns";
import { type User, users } from "../support/data-table-users";
import type { ExampleProps } from "../types";

export default function DataTableExpandable({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const columns = useMemo(() => userColumns(zh).slice(0, 4), [zh]);
  const plugins = useMemo(
    () => [
      expandable<User>((user) => (
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr_auto_1fr]">
          <dt className="text-muted-foreground">{zh ? "省份" : "Province"}</dt>
          <dd>{user.profile.province}</dd>
          <dt className="text-muted-foreground">{zh ? "城市" : "City"}</dt>
          <dd>{user.profile.city}</dd>
          <dt className="text-muted-foreground">{zh ? "用量" : "Usage"}</dt>
          <dd>{user.usage}%</dd>
          <dt className="text-muted-foreground">
            {zh ? "已验证" : "Verified"}
          </dt>
          <dd>{user.verified ? "✓" : "—"}</dd>
        </dl>
      )),
      density<User>(),
      bulkActions<User>([
        {
          label: zh ? "导出" : "Export",
          icon: <Download />,
          onClick: () => {},
        },
      ]),
    ],
    [zh],
  );
  return (
    <div className="h-[520px] w-full">
      <DataTable
        rowKey="id"
        columns={columns}
        data={users}
        plugins={plugins}
        rowSelection
        labels={zh ? dataTableLabelsZhCN : undefined}
      />
    </div>
  );
}
