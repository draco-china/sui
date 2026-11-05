"use client";

import {
  DataForm,
  type DataFormFieldConfig,
  dataFormLabelsZhCN,
} from "@workspace/ui/components/data-form";
import { useMemo } from "react";
import type { ExampleProps } from "../types";
import { text, useSubmitted, wait } from "./data-form-support";

const cities: Record<string, { value: string; label: string; zh: string }[]> = {
  zj: [
    { value: "hz", label: "Hangzhou", zh: "杭州" },
    { value: "nb", label: "Ningbo", zh: "宁波" },
  ],
  gd: [
    { value: "gz", label: "Guangzhou", zh: "广州" },
    { value: "sz", label: "Shenzhen", zh: "深圳" },
  ],
};

function invoiceFields(zh: boolean): DataFormFieldConfig[] {
  const t = text(zh);
  return [
    {
      name: "invoice",
      label: t("Invoice", "发票"),
      valueType: "radio",
      valueEnum: { none: t("None", "不需要"), company: t("Company", "企业") },
      initialValue: "none",
    },
    // JSON reactions: a server can send these as they are.
    {
      name: "taxId",
      label: t("Tax ID", "税号"),
      reactions: [
        {
          when: {
            logic: "and",
            rules: [{ field: "invoice", operator: "eq", value: "company" }],
          },
          fulfill: { required: true },
          otherwise: { hidden: true, value: null },
        },
      ],
    },
    // Function props: list `dependencies` so only this field renders again.
    {
      name: "province",
      label: t("Province", "省份"),
      valueType: "select",
      valueEnum: { zj: t("Zhejiang", "浙江"), gd: t("Guangdong", "广东") },
    },
    {
      name: "city",
      label: t("City", "城市"),
      valueType: "select",
      dependencies: ["province"],
      clearOnChange: true,
      disabled: (values) => !values.province,
      options: (values) =>
        (cities[String(values.province)] ?? []).map((city) => ({
          value: city.value,
          label: zh ? city.zh : city.label,
        })),
    },
  ];
}

export default function DataFormReactions({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [submitted, setSubmitted] = useSubmitted(zh);
  const fields = useMemo(() => invoiceFields(zh), [zh]);
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
