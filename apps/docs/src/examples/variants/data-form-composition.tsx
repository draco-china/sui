"use client";

import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  DataFormErrorSummary,
  DataFormFooter,
  DataFormGroup,
  DataFormItem,
  DataFormReset,
  DataFormRoot,
  DataFormSubmit,
  dataFormLabelsZhCN,
  useDataForm,
} from "@workspace/ui/components/data-form";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import type { ExampleProps } from "../types";
import { useSubmitted, wait } from "./data-form-support";

export default function DataFormComposition({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const t = (en: string, cn: string) => (zh ? cn : en);
  const [submitted, setSubmitted] = useSubmitted(zh);
  const form = useDataForm({
    labels: zh ? dataFormLabelsZhCN : undefined,
    onFinish: async (values) => {
      await wait();
      setSubmitted(values);
    },
  });
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <DataFormRoot form={form}>
        <DataFormErrorSummary />
        <DataFormGroup title={t("Report a bug", "报告问题")}>
          <DataFormItem name="title" label={t("Title", "标题")} required>
            <Input
              placeholder={t(
                "e.g. Export fails on Safari",
                "例如 Safari 中导出失败",
              )}
            />
          </DataFormItem>
          <DataFormItem
            name="steps"
            label={t("Steps to reproduce", "复现步骤")}
            description={t("One step per line.", "每行一个步骤。")}
            required
          >
            <Textarea rows={4} />
          </DataFormItem>
          <DataFormItem
            name="urgent"
            label={t("Blocks my work", "影响正常工作")}
          >
            <Checkbox />
          </DataFormItem>
        </DataFormGroup>
        <DataFormFooter>
          <DataFormReset />
          <DataFormSubmit>{t("Send report", "提交报告")}</DataFormSubmit>
        </DataFormFooter>
      </DataFormRoot>
      {submitted}
    </div>
  );
}
