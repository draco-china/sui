"use client";

import { Button } from "@workspace/ui/components/button";
import {
  DataForm,
  dataFormLabelsZhCN,
  sheet,
} from "@workspace/ui/components/data-form";
import {
  DataTable,
  dataTableLabelsZhCN,
  toFormFields,
} from "@workspace/ui/components/data-table";
import { useMemo, useState } from "react";
import { userColumns } from "../support/data-table-columns";
import { type User, users } from "../support/data-table-users";
import type { ExampleProps } from "../types";

export default function DataTableForm({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [data, setData] = useState(() => users.slice(0, 5));
  const columns = useMemo(() => userColumns(zh), [zh]);
  // The same columns describe the table and the form; `form` on a column
  // adds field options, such as `required`, or leaves it out.
  const fields = useMemo(
    () =>
      toFormFields(columns).map((field) =>
        field.name === "name" || field.name === "email"
          ? { ...field, required: true }
          : field,
      ),
    [columns],
  );
  const plugins = useMemo(
    () => [
      sheet({
        title: zh ? "新建用户" : "New user",
        description: zh
          ? "字段来自表格的列配置。"
          : "The fields come from the table's columns.",
        trigger: <Button>{zh ? "新建用户" : "New user"}</Button>,
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
      pagination={false}
      labels={zh ? dataTableLabelsZhCN : undefined}
      className="w-full"
      toolbar={
        <DataForm
          fields={fields}
          plugins={plugins}
          labels={zh ? dataFormLabelsZhCN : undefined}
          defaultValues={{ status: "invited", role: "viewer" }}
          onFinish={(values) =>
            setData((current) => [
              {
                ...(values as Partial<User>),
                id: `new-${current.length + 1}`,
                amount: Number(values.amount ?? 0),
                usage: 0,
                verified: false,
                createdAt:
                  String(values.createdAt ?? "") ||
                  new Date().toISOString().slice(0, 10),
                profile: { province: "", city: "" },
              } as User,
              ...current,
            ])
          }
        />
      }
    />
  );
}
