"use client";

import { Line, LineChart as RechartsLineChart } from "recharts";
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
import type { CartesianChartProps, ChartCurve } from "@/components/charts/shared/types";

export { numberFormatter } from "@/components/charts/shared/format";
export {
  type ChartLabels,
  chartLabels,
  chartLabelsZhCN,
} from "@/components/charts/shared/labels";

export type LineChartProps = CartesianChartProps & {
  readonly curve?: ChartCurve;
  readonly dots?: boolean;
};

function LineChart({
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
  curve = "natural",
  dots = false,
  loading,
  labels,
  className,
  children,
  "aria-label": ariaLabel,
}: LineChartProps) {
  const series = seriesKeys(config, categories);
  const { hidden, toggle } = useSeriesVisibility();
  const animate = useChartAnimation();
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
      <RechartsLineChart
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
        {showTooltip
          ? chartTooltip({ valueFormatter, series, config, indicator: "line" })
          : null}
        {series.map((key, position) => (
          <Line
            key={key}
            dataKey={key}
            type={curve}
            hide={hidden.has(key)}
            stroke={seriesColor(key, position)}
            strokeWidth={2}
            dot={dots ? { fill: seriesColor(key, position) } : false}
            activeDot={{ r: 5 }}
            isAnimationActive={animate}
          />
        ))}
        {children}
      </RechartsLineChart>
    </ChartFrame>
  );
}

export { LineChart };
