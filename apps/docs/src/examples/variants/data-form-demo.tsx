"use client";

import {
  DataForm,
  type DataFormFieldConfig,
  dataFormLabelsZhCN,
} from "@workspace/ui/components/data-form";
import { useMemo } from "react";
import type { ExampleProps } from "../types";
import { useSubmitted, wait } from "./data-form-support";

export default function DataFormDemo({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [submitted, setSubmitted] = useSubmitted(zh);
  const invalidEmail = zh
    ? "请输入有效的邮箱地址。"
    : "Enter a valid email address.";
  const fields = useMemo<DataFormFieldConfig[]>(
    () => [
      {
        name: "name",
        label: zh ? "姓名" : "Name",
        required: true,
        placeholder: zh ? "例如 陈明" : "e.g. Alex Chen",
      },
      {
        name: "email",
        label: zh ? "邮箱" : "Email",
        required: true,
        fieldProps: { type: "email", autoComplete: "email" },
        placeholder: "name@example.com",
        validators: {
          onBlur: ({ value }) =>
            typeof value === "string" && !value.includes("@")
              ? invalidEmail
              : undefined,
        },
      },
      {
        name: "type",
        label: zh ? "账号类型" : "Account type",
        valueType: "radio",
        valueEnum: zh
          ? { personal: "个人", team: "团队" }
          : { personal: "Personal", team: "Team" },
        initialValue: "personal",
      },
      {
        name: "company",
        label: zh ? "团队名称" : "Team name",
        reactions: [
          {
            when: {
              logic: "and",
              rules: [{ field: "type", operator: "eq", value: "team" }],
            },
            fulfill: { required: true },
            otherwise: { hidden: true },
          },
        ],
      },
      {
        name: "role",
        label: zh ? "角色" : "Role",
        valueType: "select",
        valueEnum: zh
          ? { admin: "管理员", developer: "开发者", viewer: "访客" }
          : { admin: "Admin", developer: "Developer", viewer: "Viewer" },
      },
      {
        name: "notifications",
        label: zh ? "接收产品更新邮件" : "Email me product updates",
        valueType: "switch",
        initialValue: true,
      },
    ],
    [zh, invalidEmail],
  );
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <DataForm
        fields={fields}
        labels={zh ? dataFormLabelsZhCN : undefined}
        onFinish={async (values) => {
          await wait();
          setSubmitted(values);
        }}
      />
      {submitted}
    </div>
  );
}
