"use client";
import {
  chartLabelsZhCN,
  SparklineChart,
} from "@workspace/ui/charts/sparkline-chart";
import type { ExampleProps } from "../types";

const revenue = [12, 18, 15, 22, 19, 27, 31].map((value) => ({ value }));
const churn = [8, 7, 9, 6, 5, 6, 4].map((value) => ({ value }));

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const cards = [
    {
      title: chinese ? "收入" : "Revenue",
      total: "$31K",
      data: revenue,
      color: "var(--chart-2)",
    },
    {
      title: chinese ? "流失" : "Churn",
      total: "4%",
      data: churn,
      color: "var(--chart-5)",
    },
  ];
  return (
    <div className="grid w-full gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <div key={card.title} className="grid gap-2 rounded-xl border p-4">
          <span className="text-muted-foreground text-sm">{card.title}</span>
          <span className="font-semibold text-2xl tabular-nums">
            {card.total}
          </span>
          <SparklineChart
            data={card.data}
            config={{ value: { label: card.title, color: card.color } }}
            variant="area"
            aria-label={card.title}
            labels={chinese ? chartLabelsZhCN : undefined}
          />
        </div>
      ))}
    </div>
  );
}
