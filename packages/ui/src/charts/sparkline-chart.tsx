"use client";

import { cn } from "cn";
import { Area, AreaChart, Line, LineChart } from "recharts";
import { defaultValueFormatter } from "./shared/format";
import { ChartFrame } from "./shared/frame";
import { seriesColor, seriesKeys, useChartAnimation } from "./shared/series";
import type { BaseChartProps } from "./shared/types";

export { numberFormatter } from "./shared/format";
export {
  type ChartLabels,
  chartLabels,
  chartLabelsZhCN,
} from "./shared/labels";

export type SparklineChartProps = Omit<
  BaseChartProps,
  "showLegend" | "showTooltip"
> & {
  /** `area` fills under the line. */
  readonly variant?: "line" | "area";
};

/** A small chart without axes, for KPI cards and table cells. */
function SparklineChart({
  data,
  config,
  categories,
  variant = "line",
  valueFormatter = defaultValueFormatter,
  loading,
  labels,
  className,
  children,
  "aria-label": ariaLabel,
}: SparklineChartProps) {
  const series = seriesKeys(config, categories);
  const animate = useChartAnimation();
  const margin = { top: 2, right: 2, bottom: 2, left: 2 };
  const frame = {
    data,
    config,
    series,
    valueFormatter,
    loading,
    labels,
    className: cn("aspect-auto h-10 w-full", className),
    "aria-label": ariaLabel,
  };
  if (variant === "area")
    return (
      <ChartFrame {...frame}>
        <AreaChart data={[...data]} margin={margin} accessibilityLayer={false}>
          {series.map((key, position) => (
            <Area
              key={key}
              dataKey={key}
              type="monotone"
              stroke={seriesColor(key, position)}
              fill={seriesColor(key, position)}
              fillOpacity={0.2}
              strokeWidth={1.5}
              isAnimationActive={animate}
            />
          ))}
          {children}
        </AreaChart>
      </ChartFrame>
    );
  return (
    <ChartFrame {...frame}>
      <LineChart data={[...data]} margin={margin} accessibilityLayer={false}>
        {series.map((key, position) => (
          <Line
            key={key}
            dataKey={key}
            type="monotone"
            stroke={seriesColor(key, position)}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={animate}
          />
        ))}
        {children}
      </LineChart>
    </ChartFrame>
  );
}

export { SparklineChart };
