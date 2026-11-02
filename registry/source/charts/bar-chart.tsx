"use client";

import { Bar, Cell, BarChart as RechartsBarChart } from "recharts";
import { cartesianAxes } from "@/components/charts/shared/axes";
import { defaultValueFormatter } from "@/components/charts/shared/format";
import { ChartFrame } from "@/components/charts/shared/frame";
import {
  seriesColor,
  seriesKeys,
  useChartAnimation,
  useSeriesVisibility,
} from "@/components/charts/shared/series";
import { chartTooltip } from "@/components/charts/shared/tooltip";
import type { CartesianChartProps } from "@/components/charts/shared/types";

export { numberFormatter } from "@/components/charts/shared/format";
export {
  type ChartLabels,
  chartLabels,
  chartLabelsZhCN,
} from "@/components/charts/shared/labels";

export type BarChartProps = CartesianChartProps & {
  /** `horizontal` lays bars along the x axis with categories on the y axis. */
  readonly layout?: "vertical" | "horizontal";
  readonly stacked?: boolean;
  readonly radius?: number;
  /** Colors negative values; defaults to the destructive color. */
  readonly negativeColor?: string;
};

function barRadius(
  radius: number,
  horizontal: boolean,
): [number, number, number, number] {
  if (horizontal) return [0, radius, radius, 0];
  return [radius, radius, 0, 0];
}

function BarChart({
  data,
  config,
  index,
  categories,
  valueFormatter = defaultValueFormatter,
  showLegend = false,
  showTooltip = true,
  showGrid,
  showXAxis,
  showYAxis,
  dir,
  layout = "vertical",
  stacked = false,
  radius = 8,
  negativeColor = "var(--destructive)",
  loading,
  labels,
  className,
  children,
  "aria-label": ariaLabel,
}: BarChartProps) {
  const series = seriesKeys(config, categories);
  const { hidden, toggle } = useSeriesVisibility();
  const animate = useChartAnimation();
  const horizontal = layout === "horizontal";
  const visible = series.filter((key) => !hidden.has(key));
  const last = visible.at(-1);
  return (
    <ChartFrame
      data={data}
      config={config}
      index={index}
      series={series}
      valueFormatter={valueFormatter}
      loading={loading}
      labels={labels}
      legend={showLegend}
      hidden={hidden}
      onToggle={toggle}
      className={className}
      aria-label={ariaLabel}
    >
      <RechartsBarChart
        data={[...data]}
        layout={horizontal ? "vertical" : "horizontal"}
        accessibilityLayer={false}
        margin={{ left: 12, right: 12 }}
      >
        {cartesianAxes({
          index,
          showGrid,
          showXAxis: showXAxis ?? !horizontal,
          showYAxis: showYAxis ?? horizontal,
          dir,
          vertical: horizontal,
          valueFormatter,
        })}
        {showTooltip
          ? chartTooltip({
              valueFormatter,
              series,
              config,
              indicator: "dashed",
            })
          : null}
        {series.map((key, position) => {
          const color = seriesColor(key, position);
          // Stacked bars round only the outer end of the stack.
          const rounded = !stacked || key === last;
          return (
            <Bar
              key={key}
              dataKey={key}
              hide={hidden.has(key)}
              stackId={stacked ? "stack" : undefined}
              fill={color}
              radius={rounded ? barRadius(radius, horizontal) : 0}
              isAnimationActive={animate}
            >
              {data.map((row, rowIndex) => {
                const value = row[key];
                const negative = typeof value === "number" && value < 0;
                return (
                  <Cell
                    // biome-ignore lint/suspicious/noArrayIndexKey: one cell per positional row.
                    key={rowIndex}
                    fill={negative ? negativeColor : color}
                  />
                );
              })}
            </Bar>
          );
        })}
        {children}
      </RechartsBarChart>
    </ChartFrame>
  );
}

export { BarChart };
