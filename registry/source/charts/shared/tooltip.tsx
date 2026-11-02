import { ChartTooltip, ChartTooltipContent } from "@/components/charts/chart";
import { formatValue, type ValueFormatter } from "@/components/charts/shared/format";
import { seriesColor } from "@/components/charts/shared/series";

/** The default tooltip, formatting values with the chart's formatter. */
export function chartTooltip({
  valueFormatter,
  series,
  config,
  indicator = "dot",
  hideLabel = false,
  nameKey,
}: {
  valueFormatter: ValueFormatter;
  series: readonly string[];
  config: Record<string, { label?: React.ReactNode }>;
  indicator?: "dot" | "line" | "dashed";
  hideLabel?: boolean;
  nameKey?: string;
}) {
  return (
    <ChartTooltip
      key="tooltip"
      content={
        <ChartTooltipContent
          indicator={indicator}
          hideLabel={hideLabel}
          nameKey={nameKey}
          formatter={(value, name, item) => {
            const key = String(nameKey ? item.payload?.[nameKey] : name);
            const position = Math.max(series.indexOf(key), 0);
            return (
              <div className="flex w-full items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-xs"
                  style={{
                    backgroundColor:
                      item.payload?.fill ??
                      item.color ??
                      seriesColor(key, position),
                  }}
                />
                <span className="flex-1 text-muted-foreground">
                  {config[key]?.label ?? key}
                </span>
                <span className="font-medium font-mono text-foreground tabular-nums">
                  {formatValue(value, valueFormatter)}
                </span>
              </div>
            );
          }}
        />
      }
    />
  );
}
