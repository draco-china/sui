"use client";

import {
  Bar,
  Line,
  ComposedChart as RechartsComposedChart,
  YAxis,
} from "recharts";
import { cartesianAxes } from "./shared/axes";
import { defaultValueFormatter, type ValueFormatter } from "./shared/format";
import { ChartFrame } from "./shared/frame";
import {
  seriesColor,
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

export type ComposedChartProps = Omit<CartesianChartProps, "categories"> & {
  readonly bars: readonly string[];
  readonly lines: readonly string[];
  /** Plots lines against a second y axis, with its own formatter. */
  readonly lineAxis?: boolean;
  readonly lineValueFormatter?: ValueFormatter;
  readonly curve?: ChartCurve;
};

/** Bars and lines on one chart, such as a count beside a rate. */
function ComposedChart({
  data,
  config,
  index,
  bars,
  lines,
  lineAxis = false,
  valueFormatter = defaultValueFormatter,
  lineValueFormatter = valueFormatter,
  curve = "monotone",
  showLegend = false,
  showTooltip = true,
  showGrid,
  showXAxis,
  showYAxis = true,
  dir,
  loading,
  labels,
  className,
  children,
  "aria-label": ariaLabel,
}: ComposedChartProps) {
  const series = [...bars, ...lines];
  const { hidden, toggle } = useSeriesVisibility();
  const animate = useChartAnimation();
  const lineAxisId = lineAxis ? "line" : undefined;
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
      <RechartsComposedChart
        data={[...data]}
        accessibilityLayer={false}
        margin={{ left: 12, right: 12 }}
      >
        {cartesianAxes({
          index,
          showGrid,
          showXAxis,
          showYAxis,
          dir,
          valueFormatter,
        })}
        {lineAxis && showYAxis ? (
          <YAxis
            yAxisId="line"
            orientation={dir === "rtl" ? "left" : "right"}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={lineValueFormatter}
            width="auto"
          />
        ) : null}
        {lineAxis && !showYAxis ? <YAxis yAxisId="line" hide /> : null}
        {showTooltip
          ? chartTooltip({ valueFormatter, series, config, indicator: "dot" })
          : null}
        {bars.map((key, position) => (
          <Bar
            key={key}
            dataKey={key}
            hide={hidden.has(key)}
            fill={seriesColor(key, position)}
            radius={[8, 8, 0, 0]}
            isAnimationActive={animate}
          />
        ))}
        {lines.map((key, position) => (
          <Line
            key={key}
            dataKey={key}
            yAxisId={lineAxisId}
            type={curve}
            hide={hidden.has(key)}
            stroke={seriesColor(key, bars.length + position)}
            strokeWidth={2}
            dot={false}
            isAnimationActive={animate}
          />
        ))}
        {children}
      </RechartsComposedChart>
    </ChartFrame>
  );
}

export { ComposedChart };
