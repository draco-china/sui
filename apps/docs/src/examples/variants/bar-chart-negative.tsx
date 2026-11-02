"use client";
import {
  BarChart,
  chartLabelsZhCN,
  numberFormatter,
} from "@workspace/ui/charts/bar-chart";
import type { ExampleProps } from "../types";

const balance = [
  { month: "Jan", net: 1860 },
  { month: "Feb", net: 3050 },
  { month: "Mar", net: -2370 },
  { month: "Apr", net: 730 },
  { month: "May", net: -2090 },
  { month: "Jun", net: 2140 },
];

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <BarChart
      data={balance}
      config={{
        net: { label: chinese ? "净收入" : "Net", color: "var(--chart-1)" },
      }}
      index="month"
      showYAxis
      valueFormatter={numberFormatter(
        { style: "currency", currency: "USD", notation: "compact" },
        locale,
      )}
      labels={chinese ? chartLabelsZhCN : undefined}
    />
  );
}
