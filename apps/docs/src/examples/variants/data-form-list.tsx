"use client";

import {
  DataForm,
  DataFormList,
  dataFormLabelsZhCN,
} from "@workspace/ui/components/data-form";
import type { ExampleProps } from "../types";
import { useSubmitted, wait } from "./data-form-support";

export default function DataFormListDemo({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const t = (en: string, cn: string) => (zh ? cn : en);
  const [submitted, setSubmitted] = useSubmitted(zh);
  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <DataForm
        labels={zh ? dataFormLabelsZhCN : undefined}
        defaultValues={{ members: [{ email: "", role: "editor" }] }}
        fields={[{ name: "team", label: t("Team", "团队"), required: true }]}
        onFinish={async (values) => {
          await wait();
          setSubmitted(values);
        }}
      >
        <DataFormList
          name="members"
          label={t("Members", "成员")}
          min={1}
          max={5}
          sortable
          newRow={() => ({ email: "", role: "viewer" })}
          fields={[
            {
              name: "email",
              label: t("Email", "邮箱"),
              required: true,
              placeholder: "name@example.com",
            },
            {
              name: "role",
              label: t("Role", "角色"),
              valueType: "select",
              valueEnum: {
                editor: t("Editor", "编辑"),
                viewer: t("Viewer", "访客"),
              },
            },
          ]}
        />
      </DataForm>
      {submitted}
    </div>
  );
}
