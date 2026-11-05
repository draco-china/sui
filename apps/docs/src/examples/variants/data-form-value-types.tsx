"use client";

import {
  DataForm,
  type DataFormFieldConfig,
  dataFormLabelsZhCN,
} from "@workspace/ui/components/data-form";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { useId, useMemo, useState } from "react";
import type { ExampleProps } from "../types";
import { text } from "./data-form-support";

/** Every built-in value type with a sample value, in edit or read view. */
function valueTypeFields(zh: boolean): DataFormFieldConfig[] {
  const t = text(zh);
  const plans = {
    free: t("Free", "免费版"),
    team: { text: t("Team", "团队版"), color: "default" as const },
    enterprise: {
      text: t("Enterprise", "企业版"),
      color: "secondary" as const,
    },
  };
  const field = (
    valueType: string,
    label: string,
    extra: Partial<DataFormFieldConfig> = {},
  ): DataFormFieldConfig => ({
    name: valueType,
    label,
    valueType,
    description: valueType,
    ...extra,
  });
  return [
    field("text", t("Text", "文本")),
    field("password", t("Password", "密码")),
    field("textarea", t("Textarea", "多行文本"), { colSpan: 2 }),
    field("digit", t("Number", "数字")),
    field("digitRange", t("Number range", "数字范围")),
    field("money", t("Money", "金额"), {
      fieldProps: { format: { currency: zh ? "CNY" : "USD" } },
    }),
    field("percent", t("Percent", "百分比")),
    field("select", t("Select", "下拉选择"), { valueEnum: plans }),
    field("multiSelect", t("Multiple select", "多选"), { valueEnum: plans }),
    field("radio", t("Radio", "单选"), { valueEnum: plans }),
    field("checkboxGroup", t("Checkbox group", "复选组"), { valueEnum: plans }),
    field("checkbox", t("Checkbox", "复选框")),
    field("switch", t("Switch", "开关")),
    field("boolean", t("Yes or no", "是否")),
    field("date", t("Date", "日期")),
    field("dateRange", t("Date range", "日期范围")),
    field("dateTime", t("Date and time", "日期时间")),
    field("dateTimeRange", t("Date and time range", "日期时间范围")),
    field("time", t("Time", "时间")),
    field("timeRange", t("Time range", "时间范围")),
    field("color", t("Color", "颜色")),
    field("tags", t("Tags", "标签")),
    field("slider", t("Slider", "滑块"), { fieldProps: { max: 100 } }),
  ];
}

const sample = {
  text: "Alex Chen",
  password: "secret-pass",
  textarea: "First line\nSecond line",
  digit: 42,
  digitRange: [10, 99],
  money: 1280.5,
  percent: 37.5,
  select: "team",
  multiSelect: ["team", "enterprise"],
  radio: "free",
  checkboxGroup: ["free", "team"],
  checkbox: true,
  switch: false,
  boolean: true,
  date: "2026-03-18",
  dateRange: ["2026-03-01", "2026-03-31"],
  dateTime: "2026-03-18T09:30",
  dateTimeRange: ["2026-03-18T09:00", "2026-03-18T18:00"],
  time: "09:30",
  timeRange: ["09:00", "18:00"],
  color: "#0088FF",
  tags: ["design", "forms"],
  slider: 60,
};

export default function DataFormValueTypes({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const id = useId();
  const [readonly, setReadonly] = useState(false);
  const fields = useMemo(() => valueTypeFields(zh), [zh]);
  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-2">
        <Switch id={id} checked={readonly} onCheckedChange={setReadonly} />
        <Label htmlFor={id}>{zh ? "只读展示" : "Read-only view"}</Label>
      </div>
      <DataForm
        layout="grid"
        columns={2}
        readonly={readonly}
        submitter={false}
        fields={fields}
        defaultValues={sample}
        labels={zh ? dataFormLabelsZhCN : undefined}
      />
    </div>
  );
}
