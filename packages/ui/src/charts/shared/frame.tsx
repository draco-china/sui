"use client";

import { cn } from "cn";
import type * as React from "react";
import { type ChartConfig, ChartContainer } from "../chart";
import { formatValue, type ValueFormatter } from "./format";
import { type ChartLabels, chartLabels } from "./labels";
import { seriesColor } from "./series";
import type { ChartDatum } from "./types";

/**
 * Wraps a chart with its loading and empty states, an optional series
 * legend, and a data table for screen readers.
 */
export function ChartFrame({
  data,
  config,
  index,
  series,
  valueFormatter,
  loading,
  labels,
  legend,
  legendSeries,
  hidden,
  onToggle,
  className,
  center,
  "aria-label": ariaLabel,
  children,
}: {
  data: readonly ChartDatum[];
  config: ChartConfig;
  index?: string;
  series: readonly string[];
  valueFormatter: ValueFormatter;
  loading?: boolean;
  labels?: Partial<ChartLabels>;
  legend?: boolean;
  /** Legend entries when they differ from the table columns, as with pie slices. */
  legendSeries?: readonly string[];
  hidden?: ReadonlySet<string>;
  onToggle?: (key: string) => void;
  className?: string;
  /** Text drawn over the middle of the chart, such as a donut total. */
  center?: { value: string; label?: string };
  "aria-label"?: string;
  children: React.ComponentProps<typeof ChartContainer>["children"];
}) {
  const text = { ...chartLabels, ...labels };
  const placeholder = "flex aspect-video w-full items-center justify-center";
  if (loading)
    return (
      <div
        role="status"
        data-slot="chart-loading"
        className={cn(
          placeholder,
          "animate-pulse rounded-2xl bg-muted",
          className,
        )}
      >
        <span className="sr-only">{text.loading}</span>
      </div>
    );
  if (!data.length)
    return (
      <div
        data-slot="chart-empty"
        className={cn(
          placeholder,
          "rounded-2xl border border-dashed text-muted-foreground text-sm",
          className,
        )}
      >
        {text.empty}
      </div>
    );
  return (
    <figure aria-label={ariaLabel} data-slot="chart-frame" className="w-full">
      <div className="relative">
        <ChartContainer
          config={config}
          className={className}
          aria-hidden="true"
        >
          {children}
        </ChartContainer>
        {center ? (
          <div
            data-slot="chart-center"
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          >
            <span className="font-semibold text-3xl text-foreground tabular-nums">
              {center.value}
            </span>
            {center.label ? (
              <span className="text-muted-foreground text-xs">
                {center.label}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {legend ? (
        <SeriesLegend
          config={config}
          series={legendSeries ?? series}
          hidden={hidden}
          onToggle={onToggle}
          label={text.toggleSeries}
        />
      ) : null}
      <ChartTable
        data={data}
        config={config}
        index={index}
        series={series}
        valueFormatter={valueFormatter}
        caption={ariaLabel}
      />
    </figure>
  );
}

function SeriesLegend({
  config,
  series,
  hidden,
  onToggle,
  label,
}: {
  config: ChartConfig;
  series: readonly string[];
  hidden?: ReadonlySet<string>;
  onToggle?: (key: string) => void;
  label: string;
}) {
  return (
    <fieldset
      aria-label={label}
      data-slot="chart-legend"
      className="m-0 flex min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 border-0 p-0 pt-3 text-xs"
    >
      {series.map((key, position) => {
        const off = hidden?.has(key) ?? false;
        const Icon = config[key]?.icon;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={onToggle ? !off : undefined}
            disabled={!onToggle}
            onClick={() => onToggle?.(key)}
            className={cn(
              "flex items-center gap-1.5 rounded-sm outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
              off && "opacity-40",
            )}
          >
            {Icon ? (
              <Icon />
            ) : (
              <span
                className="size-2 shrink-0 rounded-xs"
                style={{ backgroundColor: seriesColor(key, position) }}
              />
            )}
            {config[key]?.label ?? key}
          </button>
        );
      })}
    </fieldset>
  );
}

function ChartTable({
  data,
  config,
  index,
  series,
  valueFormatter,
  caption,
}: {
  data: readonly ChartDatum[];
  config: ChartConfig;
  index?: string;
  series: readonly string[];
  valueFormatter: ValueFormatter;
  caption?: string;
}) {
  const label = (key: string) => {
    const value = config[key]?.label;
    return typeof value === "string" ? value : key;
  };
  return (
    <table className="sr-only">
      {caption ? <caption>{caption}</caption> : null}
      <thead>
        <tr>
          {index ? <th scope="col">{label(index)}</th> : null}
          {series.map((key) => (
            <th key={key} scope="col">
              {label(key)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, position) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and may repeat an index value.
          <tr key={position}>
            {index ? <th scope="row">{String(row[index] ?? "")}</th> : null}
            {series.map((key) => (
              <td key={key}>{formatValue(row[key], valueFormatter)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
