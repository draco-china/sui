"use client";

import * as React from "react";
import { Area, AreaChart as RechartsAreaChart } from "recharts";
import { cartesianAxes } from "./shared/axes";
import { defaultValueFormatter } from "./shared/format";
import { ChartFrame } from "./shared/frame";
import {
  seriesColor,
  seriesKeys,
  useChartAnimation,
  useSeriesVisibility,
} from "./shared/series";
import { chartTooltip } from "./shared/tooltip";
import type { CartesianChartProps, ChartCurve } from "./shared/types";

export { numberFormatter } from "./shared/format";
export {
  type ChartLabels,
  chartLabels,
  chartLabelsZhCN,
} from "./shared/labels";

export type AreaChartProps = CartesianChartProps & {
  readonly stacked?: boolean;
  readonly curve?: ChartCurve;
  /** Fades each area toward the axis. */
  readonly gradient?: boolean;
};

function AreaChart({
  data,
  config,
  index,
  categories,
  valueFormatter = defaultValueFormatter,
  showLegend = false,
  showTooltip = true,
  showGrid,
  showXAxis,
  showYAxis = false,
  dir,
  stacked = false,
  curve = "natural",
  gradient = false,
  loading,
  labels,
  className,
  children,
  "aria-label": ariaLabel,
}: AreaChartProps) {
  const series = seriesKeys(config, categories);
  const { hidden, toggle } = useSeriesVisibility();
  const animate = useChartAnimation();
  const id = React.useId().replace(/:/g, "");
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
      <RechartsAreaChart
        data={[...data]}
        accessibilityLayer={false}
        margin={{ left: 12, right: 12 }}
      >
        {gradient ? (
          <defs>
            {series.map((key, position) => (
              <linearGradient
                key={key}
                id={`${id}-${position}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={seriesColor(key, position)}
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor={seriesColor(key, position)}
                  stopOpacity={0.1}
                />
              </linearGradient>
            ))}
          </defs>
        ) : null}
        {cartesianAxes({
          index,
          showGrid,
          showXAxis,
          showYAxis,
          dir,
          valueFormatter,
        })}
        {showTooltip
          ? chartTooltip({ valueFormatter, series, config, indicator: "dot" })
          : null}
        {series.map((key, position) => (
          <Area
            key={key}
            dataKey={key}
            type={curve}
            hide={hidden.has(key)}
            stackId={stacked ? "stack" : undefined}
            stroke={seriesColor(key, position)}
            fill={
              gradient ? `url(#${id}-${position})` : seriesColor(key, position)
            }
            fillOpacity={gradient ? 1 : 0.4}
            isAnimationActive={animate}
          />
        ))}
        {children}
      </RechartsAreaChart>
    </ChartFrame>
  );
}

export { AreaChart };
