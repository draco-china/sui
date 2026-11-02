"use client";
import {
  ComposedChart,
  chartLabelsZhCN,
  numberFormatter,
} from "@workspace/ui/charts/composed-chart";
import type { ExampleProps } from "../types";

const orders = [
  { month: "Jan", orders: 420, conversion: 0.031 },
  { month: "Feb", orders: 510, conversion: 0.034 },
  { month: "Mar", orders: 480, conversion: 0.029 },
  { month: "Apr", orders: 620, conversion: 0.041 },
  { month: "May", orders: 700, conversion: 0.044 },
  { month: "Jun", orders: 660, conversion: 0.039 },
];

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <ComposedChart
      data={orders}
      config={{
        orders: { label: chinese ? "订单" : "Orders", color: "var(--chart-1)" },
        conversion: {
          label: chinese ? "转化率" : "Conversion",
          color: "var(--chart-4)",
        },
      }}
      index="month"
      bars={["orders"]}
      lines={["conversion"]}
      lineAxis
      lineValueFormatter={numberFormatter(
        { style: "percent", maximumFractionDigits: 1 },
        locale,
      )}
      showLegend
      labels={chinese ? chartLabelsZhCN : undefined}
    />
  );
}
