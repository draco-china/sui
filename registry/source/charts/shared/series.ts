"use client";

import { useReducedMotion } from "motion/react";
import * as React from "react";
import { type ChartConfig, chartKey } from "@/components/charts/chart";

export function seriesKeys(
  config: ChartConfig,
  categories: readonly string[] | undefined,
) {
  return categories ?? Object.keys(config);
}

/** The series color, falling back to the theme palette when config has none. */
export function seriesColor(key: string, position: number) {
  return `var(--color-${chartKey(key)}, var(--chart-${(position % 5) + 1}))`;
}

export function toggleSeries(hidden: ReadonlySet<string>, key: string) {
  const next = new Set(hidden);
  if (!next.delete(key)) next.add(key);
  return next;
}

/** Tracks which series the legend has hidden. */
export function useSeriesVisibility() {
  const [hidden, setHidden] = React.useState<ReadonlySet<string>>(new Set());
  const toggle = React.useCallback((key: string) => {
    setHidden((current) => toggleSeries(current, key));
  }, []);
  return { hidden, toggle };
}

export function useChartAnimation() {
  return !useReducedMotion();
}
