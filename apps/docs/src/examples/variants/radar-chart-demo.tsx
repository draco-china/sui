"use client";
import { chartLabelsZhCN, RadarChart } from "@workspace/ui/charts/radar-chart";
import type { ExampleProps } from "../types";

const months = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
  { month: "Mar", desktop: 237, mobile: 120 },
  { month: "Apr", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "Jun", desktop: 214, mobile: 140 },
];

function deviceConfig(chinese: boolean) {
  return {
    desktop: { label: chinese ? "桌面端" : "Desktop", color: "var(--chart-1)" },
    mobile: { label: chinese ? "移动端" : "Mobile", color: "var(--chart-2)" },
  };
}

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <RadarChart
      data={months}
      config={deviceConfig(chinese)}
      index="month"
      showLegend
      labels={chinese ? chartLabelsZhCN : undefined}
    />
  );
}
