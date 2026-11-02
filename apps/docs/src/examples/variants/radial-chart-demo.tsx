"use client";
import {
  chartLabelsZhCN,
  numberFormatter,
  RadialChart,
} from "@workspace/ui/charts/radial-chart";
import type { ExampleProps } from "../types";

const goals = [
  { goal: "sales", progress: 72 },
  { goal: "signups", progress: 48 },
];

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <RadialChart
      data={goals}
      config={{
        sales: { label: chinese ? "销售" : "Sales" },
        signups: { label: chinese ? "注册" : "Sign-ups" },
      }}
      nameKey="goal"
      valueKey="progress"
      max={100}
      value={0.72}
      label={chinese ? "销售目标" : "Sales goal"}
      valueFormatter={numberFormatter({ style: "percent" }, locale)}
      showLegend
      labels={chinese ? chartLabelsZhCN : undefined}
    />
  );
}
