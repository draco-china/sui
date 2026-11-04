"use client";

import {
  DatePicker,
  type DatePickerPreset,
} from "@/components/ui/date-picker";
import { formatLocalDate, parseLocalDate } from "@/lib/date-time";
import { useMemo } from "react";
import { useDataTableContext } from "@/components/ui/data-table/context";

interface DateFieldProps {
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  /** Adds a time of day; values become `yyyy-mm-ddThh:mm`. */
  readonly time?: boolean;
  readonly id?: string;
  readonly label?: string;
  readonly labelledBy?: string;
  readonly className?: string;
  /** Quick ranges shown beside the calendar (range fields only). */
  readonly presets?: readonly DatePickerPreset[];
}

/**
 * A table's date filter. It reads any value the engine matches (a Date, a
 * timestamp or a date string) and writes local `yyyy-mm-dd` strings, as the
 * native inputs did, so filtering and URL state are unchanged.
 */
export function DataTableDateField({
  value,
  onChange,
  time = false,
  id,
  label,
  labelledBy,
  className,
}: DateFieldProps) {
  const table = useDataTableContext();
  return (
    <DatePicker
      id={id}
      className={className}
      showTime={time}
      locale={table.labels.locale}
      aria-label={label}
      aria-labelledby={labelledBy}
      value={parseLocalDate(value)}
      onValueChange={(next) =>
        onChange(next ? formatLocalDate(next, time && {}) : undefined)
      }
    />
  );
}

/** A `[start, end]` table filter; either end may be empty. */
export function DataTableDateRangeField({
  value,
  onChange,
  time = false,
  id,
  label,
  labelledBy,
  className,
  presets,
}: DateFieldProps) {
  const table = useDataTableContext();
  const { rangeStart, rangeEnd, locale } = table.labels;
  const labels = useMemo(
    () => ({ start: rangeStart, end: rangeEnd }),
    [rangeStart, rangeEnd],
  );
  const [start, end] = Array.isArray(value) ? value : [];
  const from = parseLocalDate(start);
  const to = parseLocalDate(end);
  return (
    <DatePicker
      mode="range"
      id={id}
      className={className}
      showTime={time}
      locale={locale}
      labels={labels}
      aria-label={label}
      aria-labelledby={labelledBy}
      value={from || to ? { from, to } : undefined}
      presets={presets}
      onValueChange={(next) => {
        const pair = [next?.from, next?.to].map((date) =>
          date ? formatLocalDate(date, time && {}) : undefined,
        );
        onChange(pair.every((item) => item === undefined) ? undefined : pair);
      }}
    />
  );
}
