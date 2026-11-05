"use client";

import { Button } from "@workspace/ui/components/button";
import {
  DataForm,
  type DataFormAccessMap,
  dataFormLabelsZhCN,
} from "@workspace/ui/components/data-form";
import { useState } from "react";
import type { ExampleProps } from "../types";

const record = {
  name: "Alex Chen",
  status: "active",
  salary: 32000,
  joinedAt: "2024-03-18",
  note: "",
};

export default function DataFormReadonly({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const t = (en: string, cn: string) => (zh ? cn : en);
  const [editing, setEditing] = useState(false);
  const [manager, setManager] = useState(false);
  // Only managers see salaries; nobody edits the join date.
  const access: DataFormAccessMap = {
    salary: manager ? "edit" : "hidden",
    joinedAt: "readonly",
  };
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-pressed={editing}
          onClick={() => setEditing(!editing)}
        >
          {editing ? t("View", "查看") : t("Edit", "编辑")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-pressed={manager}
          onClick={() => setManager(!manager)}
        >
          {t("Manager access", "经理权限")}
        </Button>
      </div>
      <DataForm
        key={String(editing)}
        readonly={!editing}
        access={access}
        submitter={editing ? undefined : false}
        labels={zh ? dataFormLabelsZhCN : undefined}
        defaultValues={record}
        layout="horizontal"
        fields={[
          { name: "name", label: t("Name", "姓名"), required: true },
          {
            name: "status",
            label: t("Status", "状态"),
            valueType: "select",
            valueEnum: {
              active: { text: t("Active", "在职"), color: "default" },
              leave: { text: t("On leave", "休假"), color: "secondary" },
            },
          },
          {
            name: "salary",
            label: t("Salary", "薪资"),
            valueType: "money",
            fieldProps: { format: { currency: "CNY" } },
          },
          {
            name: "joinedAt",
            label: t("Joined", "入职日期"),
            valueType: "date",
          },
          { name: "note", label: t("Note", "备注"), valueType: "textarea" },
        ]}
      />
    </div>
  );
}
