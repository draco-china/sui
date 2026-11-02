import type * as React from "react";
import type { ChartConfig } from "@/components/charts/chart";
import type { ValueFormatter } from "@/components/charts/shared/format";
import type { ChartLabels } from "@/components/charts/shared/labels";

export type ChartDatum = Record<string, unknown>;

/** Props every SUI chart accepts. */
export type BaseChartProps<TDatum extends ChartDatum = ChartDatum> = {
  readonly data: readonly TDatum[];
  readonly config: ChartConfig;
  /** Series keys to draw. Defaults to every key in `config`. */
  readonly categories?: readonly string[];
  readonly valueFormatter?: ValueFormatter;
  readonly showLegend?: boolean;
  readonly showTooltip?: boolean;
  readonly loading?: boolean;
  readonly labels?: Partial<ChartLabels>;
  /** Names the chart for screen readers, which also get a data table. */
  readonly "aria-label"?: string;
  readonly className?: string;
  /** Extra Recharts elements, such as a ReferenceLine. */
  readonly children?: React.ReactNode;
};

/** Props for charts drawn on x and y axes. */
export type CartesianChartProps<TDatum extends ChartDatum = ChartDatum> =
  BaseChartProps<TDatum> & {
    /** The key for the category axis. */
    readonly index: string;
    readonly showGrid?: boolean;
    readonly showXAxis?: boolean;
    readonly showYAxis?: boolean;
    readonly dir?: "ltr" | "rtl";
  };

export type ChartCurve = "linear" | "natural" | "monotone" | "step";
