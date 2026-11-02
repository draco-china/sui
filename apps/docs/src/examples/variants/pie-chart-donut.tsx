"use client";
import { chartLabelsZhCN, PieChart } from "@workspace/ui/charts/pie-chart";
import type { ExampleProps } from "../types";

const browsers = [
  { browser: "chrome", visitors: 275 },
  { browser: "safari", visitors: 200 },
  { browser: "firefox", visitors: 187 },
  { browser: "edge", visitors: 173 },
  { browser: "other", visitors: 90 },
];

function browserConfig(chinese: boolean) {
  return {
    chrome: { label: "Chrome" },
    safari: { label: "Safari" },
    firefox: { label: "Firefox" },
    edge: { label: "Edge" },
    other: { label: chinese ? "其他" : "Other" },
  };
}

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <PieChart
      data={browsers}
      config={browserConfig(chinese)}
      nameKey="browser"
      valueKey="visitors"
      donut
      label={chinese ? "访客" : "Visitors"}
      labels={chinese ? chartLabelsZhCN : undefined}
    />
  );
}
