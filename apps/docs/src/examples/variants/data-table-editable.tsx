"use client";

import {
  DataTable,
  type DataTableColumn,
  dataTableLabelsZhCN,
  editable,
} from "@workspace/ui/components/data-table";
import { useMemo, useState } from "react";
import { userColumns } from "../support/data-table-columns";
import { type User, users } from "../support/data-table-users";
import type { ExampleProps } from "../types";

export default function DataTableEditable({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [data, setData] = useState(() => users.slice(0, 6));
  const columns = useMemo<DataTableColumn<User>[]>(
    () =>
      userColumns(zh).map((column) =>
        column.key === "name"
          ? { ...column, form: { required: true } }
          : column,
      ),
    [zh],
  );
  const plugins = useMemo(
    () => [
      editable<User>({
        onSave: async (row, values) => {
          await new Promise((resolve) => setTimeout(resolve, 400));
          // Errors from the server land in the row, under their cell.
          if (values.email === "taken@example.com")
            return {
              fields: {
                email: zh ? "这个邮箱已被使用。" : "This email is in use.",
              },
            };
          setData((current) =>
            current.map((item) =>
              item.id === row.id ? ({ ...item, ...values } as User) : item,
            ),
          );
        },
      }),
    ],
    [zh],
  );
  return (
    <DataTable
      rowKey="id"
      layout="auto"
      columns={columns}
      data={data}
      plugins={plugins}
      // Spending is read-only here; nobody edits the creation date.
      access={{ amount: "readonly", createdAt: "readonly" }}
      pagination={false}
      labels={zh ? dataTableLabelsZhCN : undefined}
      className="w-full"
    />
  );
}
