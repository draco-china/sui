"use client";

import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart as RechartsRadialBarChart,
} from "recharts";
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

export type RadialChartProps = Omit<BaseChartProps, "categories"> & {
  /** The key naming each ring; ring colors come from `config[name]`. */
  readonly nameKey: string;
  readonly valueKey: string;
  /** The value of a full ring. Rings scale to the largest value when unset. */
  readonly max?: number;
  /** The value in the center. */
  readonly value?: number;
  /** Text under the center value. */
  readonly label?: string;
};

function RadialChart({
  data,
  config,
  nameKey,
  valueKey,
  max,
  value,
  label,
  valueFormatter = defaultValueFormatter,
  showLegend = false,
  showTooltip = true,
  loading,
  labels,
  className,
  children,
  "aria-label": ariaLabel,
}: RadialChartProps) {
  const animate = useChartAnimation();
  const series = data.map((row) => String(row[nameKey]));
  const rows = data.map((row, position) => ({
    ...row,
    fill: seriesColor(String(row[nameKey]), position),
  }));
  return (
    <ChartFrame
      data={data}
      config={config}
      index={nameKey}
      series={[valueKey]}
      valueFormatter={valueFormatter}
      loading={loading}
      labels={labels}
      legend={showLegend}
      legendSeries={series}
      className={className ?? "mx-auto aspect-square max-h-72"}
      aria-label={ariaLabel}
      center={
        value === undefined
          ? undefined
          : { value: valueFormatter(value), label }
      }
    >
      <RechartsRadialBarChart
        data={rows}
        innerRadius="40%"
        outerRadius="100%"
        startAngle={90}
        endAngle={-270}
        accessibilityLayer={false}
      >
        <PolarAngleAxis
          type="number"
          domain={[0, max ?? "dataMax"]}
          tick={false}
          axisLine={false}
        />
        {showTooltip
          ? chartTooltip({
              valueFormatter,
              series,
              config,
              hideLabel: true,
              nameKey,
            })
          : null}
        <RadialBar
          dataKey={valueKey}
          background
          cornerRadius={10}
          isAnimationActive={animate}
        />
        {children}
      </RechartsRadialBarChart>
    </ChartFrame>
  );
}

export { RadialChart };
