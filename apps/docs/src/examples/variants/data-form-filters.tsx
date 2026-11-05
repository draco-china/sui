"use client";

import {
  DataForm,
  type DataFormFieldConfig,
  dataFormLabelsZhCN,
} from "@workspace/ui/components/data-form";
import { useMemo, useState } from "react";
import type { ExampleProps } from "../types";
import { text } from "./data-form-support";

function filterFields(zh: boolean): DataFormFieldConfig[] {
  const t = text(zh);
  return [
    // `inline` puts the control on the row; `more` keeps it in Filters.
    { name: "keyword", label: t("Name", "名称"), lightMode: "inline" },
    {
      name: "status",
      label: t("Status", "状态"),
      valueType: "multiSelect",
      valueEnum: {
        open: t("Open", "进行中"),
        paused: t("Paused", "已暂停"),
        done: t("Done", "已完成"),
      },
    },
    {
      name: "createdAt",
      label: t("Created", "创建时间"),
      valueType: "dateRange",
    },
    { name: "amount", label: t("Amount", "金额"), valueType: "digitRange" },
    { name: "owner", label: t("Owner", "负责人") },
    {
      name: "archived",
      label: t("Archived", "已归档"),
      valueType: "boolean",
      lightMode: "more",
    },
  ];
}

function Payload({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-muted p-3 font-mono text-xs">
      {JSON.stringify(value)}
    </pre>
  );
}

export default function DataFormFilters({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const t = text(zh);
  const [query, setQuery] = useState<unknown>({});
  const [light, setLight] = useState<unknown>({});
  const fields = useMemo(() => filterFields(zh), [zh]);
  const labels = zh ? dataFormLabelsZhCN : undefined;
  return (
    <div className="flex w-full flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h3 className="font-semibold text-base">
          {t("Query form", "查询表单")}
        </h3>
        <DataForm
          layout="grid"
          columns={3}
          collapse={{ count: 3 }}
          fields={fields}
          labels={labels}
          onFinish={setQuery}
        />
        <Payload value={query} />
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="font-semibold text-base">
          {t("Light filter", "轻量筛选")}
        </h3>
        <DataForm
          layout="light"
          submitOn="change"
          collapse={{ count: 3 }}
          fields={fields}
          labels={labels}
          onFinish={setLight}
        />
        <Payload value={light} />
      </section>
    </div>
  );
}
