import { CartesianGrid, XAxis, YAxis } from "recharts";
import type { ValueFormatter } from "@/components/charts/shared/format";

/**
 * The grid and axes shared by cartesian charts. Called as a function so
 * Recharts sees the elements directly. `vertical` puts categories on the y axis.
 */
export function cartesianAxes({
  index,
  showGrid = true,
  showXAxis = true,
  showYAxis = true,
  dir = "ltr",
  vertical = false,
  valueFormatter,
  yAxisId,
}: {
  index: string;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  dir?: "ltr" | "rtl";
  vertical?: boolean;
  valueFormatter: ValueFormatter;
  yAxisId?: string;
}) {
  const rtl = dir === "rtl";
  const tick = { tickLine: false, axisLine: false, tickMargin: 8 } as const;
  const categoryAxis = vertical ? "y" : "x";
  return [
    showGrid ? (
      <CartesianGrid key="grid" vertical={vertical} horizontal={!vertical} />
    ) : null,
    showXAxis ? (
      <XAxis
        key="x"
        {...tick}
        type={categoryAxis === "x" ? "category" : "number"}
        dataKey={categoryAxis === "x" ? index : undefined}
        tickFormatter={categoryAxis === "x" ? undefined : valueFormatter}
        minTickGap={24}
        reversed={rtl}
      />
    ) : null,
    showYAxis ? (
      <YAxis
        key="y"
        {...tick}
        yAxisId={yAxisId}
        type={categoryAxis === "y" ? "category" : "number"}
        dataKey={categoryAxis === "y" ? index : undefined}
        tickFormatter={categoryAxis === "y" ? undefined : valueFormatter}
        orientation={rtl ? "right" : "left"}
        width="auto"
      />
    ) : null,
  ];
}
