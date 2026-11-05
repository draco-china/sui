"use client";

import { Button } from "@workspace/ui/components/button";
import {
  DataForm,
  type DataFormFieldConfig,
  dataFormLabelsZhCN,
  dialog,
  sheet,
} from "@workspace/ui/components/data-form";
import { useMemo } from "react";
import type { ExampleProps } from "../types";
import { text, useSubmitted, wait } from "./data-form-support";

function projectFields(zh: boolean): DataFormFieldConfig[] {
  const t = text(zh);
  return [
    { name: "name", label: t("Project name", "项目名称"), required: true },
    {
      name: "visibility",
      label: t("Visibility", "可见范围"),
      valueType: "radio",
      valueEnum: { private: t("Private", "私有"), team: t("Team", "团队") },
      initialValue: "private",
    },
  ];
}

export default function DataFormOverlay({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [submitted, setSubmitted] = useSubmitted(zh);
  const fields = useMemo(() => projectFields(zh), [zh]);
  const inDialog = useMemo(() => {
    const t = text(zh);
    return [
      dialog({
        title: t("New project", "新建项目"),
        description: t("Projects group your work.", "项目用来归类你的工作。"),
        trigger: <Button>{t("New project", "新建项目")}</Button>,
      }),
    ];
  }, [zh]);
  const inSheet = useMemo(() => {
    const t = text(zh);
    return [
      sheet({
        title: t("Edit project", "编辑项目"),
        description: t(
          "Changes apply to everyone on the project.",
          "修改对项目所有成员生效。",
        ),
        trigger: (
          <Button variant="outline">
            {t("Edit in a sheet", "在侧边栏中编辑")}
          </Button>
        ),
      }),
    ];
  }, [zh]);
  const finish = async (values: Record<string, unknown>) => {
    await wait();
    setSubmitted(values);
  };
  const labels = zh ? dataFormLabelsZhCN : undefined;
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <DataForm
          fields={fields}
          plugins={inDialog}
          labels={labels}
          onFinish={finish}
        />
        <DataForm
          fields={fields}
          plugins={inSheet}
          labels={labels}
          defaultValues={{ name: "Website", visibility: "team" }}
          onFinish={finish}
        />
      </div>
      {submitted}
    </div>
  );
}
