"use client";

import {
  DataTable,
  type DataTableColumn,
  dataTableLabelsZhCN,
  dragSort,
} from "@workspace/ui/components/data-table";
import { useMemo, useState } from "react";
import type { ExampleProps } from "../types";

type Task = { id: string; title: string; priority: "high" | "medium" | "low" };

const tasks: Task[] = [
  { id: "1", title: "Write release notes", priority: "high" },
  { id: "2", title: "Review pull requests", priority: "medium" },
  { id: "3", title: "Update dependencies", priority: "low" },
  { id: "4", title: "Plan the next sprint", priority: "medium" },
  { id: "5", title: "Fix flaky tests", priority: "high" },
];

export default function DataTableDragSort({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [order, setOrder] = useState(tasks.map((task) => task.id));
  const columns = useMemo<DataTableColumn<Task>[]>(
    () => [
      { key: "title", title: zh ? "任务" : "Task" },
      {
        key: "priority",
        title: zh ? "优先级" : "Priority",
        filter: false,
        valueEnum: [
          { value: "high", label: zh ? "高" : "High", color: "destructive" },
          { value: "medium", label: zh ? "中" : "Medium", color: "secondary" },
          { value: "low", label: zh ? "低" : "Low", color: "outline" },
        ],
      },
    ],
    [zh],
  );
  const plugins = useMemo(
    () => [
      dragSort<Task>({
        onDragEnd: (rows) => setOrder(rows.map((row) => row.id)),
      }),
    ],
    [],
  );
  return (
    <div className="w-full space-y-3">
      <DataTable
        rowKey="id"
        layout="auto"
        responsive={false}
        columns={columns}
        data={tasks}
        plugins={plugins}
        labels={zh ? dataTableLabelsZhCN : undefined}
      />
      <p className="text-muted-foreground text-sm">
        {zh ? "当前顺序：" : "Order: "}
        <code>{order.join(" → ")}</code>
      </p>
    </div>
  );
}
