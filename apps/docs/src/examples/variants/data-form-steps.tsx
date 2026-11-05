"use client";

import {
  DataForm,
  dataFormLabelsZhCN,
  steps,
} from "@workspace/ui/components/data-form";
import { useMemo } from "react";
import type { ExampleProps } from "../types";
import { text, useSubmitted, wait } from "./data-form-support";

export default function DataFormSteps({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const t = text(zh);
  const [submitted, setSubmitted] = useSubmitted(zh);
  const plugins = useMemo(() => {
    const copy = text(zh);
    return [
      steps({
        items: [
          {
            key: "account",
            title: copy("Account", "账号"),
            description: copy("How you sign in.", "用于登录。"),
          },
          { key: "workspace", title: copy("Workspace", "工作区") },
          { key: "invite", title: copy("Invite", "邀请成员") },
        ],
      }),
    ];
  }, [zh]);
  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <DataForm
        plugins={plugins}
        labels={zh ? dataFormLabelsZhCN : undefined}
        fields={[
          {
            name: "email",
            label: t("Email", "邮箱"),
            required: true,
            step: "account",
          },
          {
            name: "password",
            label: t("Password", "密码"),
            valueType: "password",
            required: true,
            step: "account",
          },
          {
            name: "workspace",
            label: t("Workspace name", "工作区名称"),
            required: true,
            step: "workspace",
          },
          {
            name: "size",
            label: t("Team size", "团队规模"),
            valueType: "radio",
            valueEnum: { small: "1–10", medium: "11–50", large: "50+" },
            step: "workspace",
          },
          {
            name: "invites",
            label: t("Invite by email", "通过邮箱邀请"),
            valueType: "tags",
            step: "invite",
          },
        ]}
        onFinish={async (values) => {
          await wait();
          setSubmitted({ ...values, password: "••••••••" });
        }}
      />
      {submitted}
    </div>
  );
}
