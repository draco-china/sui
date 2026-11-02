"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart as RechartsRadarChart,
} from "recharts";
import { defaultValueFormatter } from "@/components/charts/shared/format";
import { ChartFrame } from "@/components/charts/shared/frame";
import {
  seriesColor,
  seriesKeys,
  useChartAnimation,
  useSeriesVisibility,
} from "@/components/charts/shared/series";
import { chartTooltip } from "@/components/charts/shared/tooltip";
import type { BaseChartProps } from "@/components/charts/shared/types";

export { numberFormatter } from "@/components/charts/shared/format";
export {
  type ChartLabels,
  chartLabels,
  chartLabelsZhCN,
} from "@/components/charts/shared/labels";

export type RadarChartProps = BaseChartProps & {
  /** The key for each spoke. */
  readonly index: string;
  readonly filled?: boolean;
  readonly grid?: "polygon" | "circle";
};

function RadarChart({
  data,
  config,
  index,
  categories,
  valueFormatter = defaultValueFormatter,
  showLegend = false,
  showTooltip = true,
  filled = true,
  grid = "polygon",
  loading,
  labels,
  className,
  children,
  "aria-label": ariaLabel,
}: RadarChartProps) {
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
      className={className ?? "mx-auto aspect-square max-h-72"}
      aria-label={ariaLabel}
    >
      <RechartsRadarChart data={[...data]} accessibilityLayer={false}>
        {showTooltip
          ? chartTooltip({ valueFormatter, series, config, indicator: "line" })
          : null}
        <PolarGrid gridType={grid} />
        <PolarAngleAxis dataKey={index} />
        {series.map((key, position) => (
          <Radar
            key={key}
            dataKey={key}
            hide={hidden.has(key)}
            stroke={seriesColor(key, position)}
            fill={seriesColor(key, position)}
            fillOpacity={filled ? 0.5 : 0}
            strokeWidth={filled ? 1 : 2}
            isAnimationActive={animate}
          />
        ))}
        {children}
      </RechartsRadarChart>
    </ChartFrame>
  );
}

export { RadarChart };
