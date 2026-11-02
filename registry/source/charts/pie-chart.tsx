"use client";

import { Cell, Pie, PieChart as RechartsPieChart } from "recharts";
import { defaultValueFormatter } from "@/components/charts/shared/format";
import { ChartFrame } from "@/components/charts/shared/frame";
import { seriesColor, useChartAnimation } from "@/components/charts/shared/series";
import { chartTooltip } from "@/components/charts/shared/tooltip";
import type { BaseChartProps } from "@/components/charts/shared/types";

export { numberFormatter } from "@/components/charts/shared/format";
export {
  type ChartLabels,
  chartLabels,
  chartLabelsZhCN,
} from "@/components/charts/shared/labels";

export type PieChartProps = Omit<BaseChartProps, "categories"> & {
  /** The key naming each slice; slice colors come from `config[name]`. */
  readonly nameKey: string;
  readonly valueKey: string;
  readonly donut?: boolean;
  /** Text in the donut hole, under the total. Shows the total alone when true. */
  readonly label?: string | boolean;
};

function PieChart({
  data,
  config,
  nameKey,
  valueKey,
  valueFormatter = defaultValueFormatter,
  showLegend = false,
  showTooltip = true,
  donut = false,
  label = false,
  loading,
  labels,
  className,
  children,
  "aria-label": ariaLabel,
}: PieChartProps) {
  const animate = useChartAnimation();
  const series = data.map((row) => String(row[nameKey]));
  const total = data.reduce((sum, row) => {
    const value = row[valueKey];
    return typeof value === "number" ? sum + value : sum;
  }, 0);
  const centered = donut && label !== false;
  return (
    <ChartFrame
      data={data}
      config={config}
      index={nameKey}
      series={[valueKey]}
      valueFormatter={valueFormatter}
      loading={loading}
      labels={labels}
      className={className ?? "mx-auto aspect-square max-h-72"}
      aria-label={ariaLabel}
      legend={showLegend}
      legendSeries={series}
      center={
        centered
          ? {
              value: valueFormatter(total),
              label: typeof label === "string" ? label : undefined,
            }
          : undefined
      }
    >
      <RechartsPieChart accessibilityLayer={false}>
        {showTooltip
          ? chartTooltip({
              valueFormatter,
              series,
              config,
              hideLabel: true,
              nameKey,
            })
          : null}
        <Pie
          data={[...data]}
          dataKey={valueKey}
          nameKey={nameKey}
          innerRadius={donut ? "60%" : 0}
          strokeWidth={4}
          isAnimationActive={animate}
        >
          {series.map((key, position) => (
            <Cell key={key} fill={seriesColor(key, position)} />
          ))}
        </Pie>
        {children}
      </RechartsPieChart>
    </ChartFrame>
  );
}

export { PieChart };
