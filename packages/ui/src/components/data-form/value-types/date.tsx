"use client";

import { DatePicker } from "@workspace/ui/components/date-picker";
import { TimePicker } from "@workspace/ui/components/time-picker";
import { formatLocalDate, parseLocalDate } from "@workspace/ui/lib/date-time";
import { cn } from "cn";
import { isEmptyValue } from "../conditions";
import { asPair, dateFormat, joinRange, toPair } from "./shared";
import type { ValueEditProps, ValueReadProps, ValueTypeMap } from "./types";

/** Props a date or time picker shares; `fieldProps` may add or override. */
function pickerProps(props: ValueEditProps) {
  const {
    valueFormat: _valueFormat,
    className,
    ...fieldProps
  } = props.fieldProps;
  return {
    id: props.id,
    disabled: props.disabled,
    locale: props.labels.locale,
    // Without a visible label (a light filter row), the field names itself.
    "aria-label": props.labelledBy ? undefined : props.label,
    "aria-labelledby": props.labelledBy || undefined,
    "aria-invalid": props.invalid || undefined,
    prefix: props.prefix,
    ...fieldProps,
    className: cn(props.size === "sm" && "h-8", className as string),
  };
}

/**
 * `fieldProps.valueFormat: "string"` keeps local `yyyy-mm-dd` (or
 * `yyyy-mm-ddThh:mm`) strings in the form instead of Dates, as tables and
 * URLs store them.
 */
function dateWriter(props: ValueEditProps, time: boolean | undefined) {
  return (date: Date | undefined) => {
    if (!date || props.fieldProps.valueFormat !== "string") return date;
    return formatLocalDate(date, time && {});
  };
}

function rangeLabels(props: ValueEditProps) {
  return { start: props.labels.rangeStart, end: props.labels.rangeEnd };
}

function DateEdit(props: ValueEditProps & { time?: boolean }) {
  const write = dateWriter(props, props.time);
  return (
    <DatePicker
      showTime={props.time}
      {...pickerProps(props)}
      value={parseLocalDate(props.value)}
      onValueChange={(next) => {
        props.onChange(write(next));
        props.onBlur();
      }}
    />
  );
}

function DateRangeEdit(props: ValueEditProps & { time?: boolean }) {
  const [start, end] = asPair(props.value);
  const from = parseLocalDate(start);
  const to = parseLocalDate(end);
  const write = dateWriter(props, props.time);
  return (
    <DatePicker
      mode="range"
      showTime={props.time}
      labels={rangeLabels(props)}
      {...pickerProps(props)}
      value={from || to ? { from, to } : undefined}
      onValueChange={(next) => {
        props.onChange(toPair(write(next?.from), write(next?.to)));
        props.onBlur();
      }}
    />
  );
}

function asTime(value: unknown) {
  return typeof value === "string" && value !== "" ? value : undefined;
}

function TimeEdit(props: ValueEditProps) {
  return (
    <TimePicker
      {...pickerProps(props)}
      value={asTime(props.value)}
      onValueChange={(next) => {
        props.onChange(next);
        props.onBlur();
      }}
    />
  );
}

function TimeRangeEdit(props: ValueEditProps) {
  const [start, end] = asPair(props.value);
  return (
    <TimePicker
      range
      labels={rangeLabels(props)}
      {...pickerProps(props)}
      value={{ from: asTime(start), to: asTime(end) }}
      onValueChange={(next) => {
        props.onChange(toPair(next?.from, next?.to));
        props.onBlur();
      }}
    />
  );
}

function formatDate(
  value: unknown,
  { labels, fieldProps }: ValueReadProps,
  defaults: Intl.DateTimeFormatOptions,
) {
  if (isEmptyValue(value)) return "";
  const date = parseLocalDate(value);
  if (!date) return String(value);
  const format = fieldProps.format as Intl.DateTimeFormatOptions | undefined;
  return dateFormat(labels.locale, format ?? defaults).format(date);
}

const dayFormat: Intl.DateTimeFormatOptions = { dateStyle: "medium" };
const dayTimeFormat: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

function dateText(format: Intl.DateTimeFormatOptions) {
  return (props: ValueReadProps) => formatDate(props.value, props, format);
}

function rangeText(format: Intl.DateTimeFormatOptions) {
  return (props: ValueReadProps) => {
    const [start, end] = asPair(props.value);
    return joinRange(
      formatDate(start, props, format),
      formatDate(end, props, format),
    );
  };
}

function timeRangeText({ value }: ValueReadProps) {
  const [start, end] = asPair(value);
  return joinRange(asTime(start) ?? "", asTime(end) ?? "");
}

/**
 * Pickers are compact triggers: in a light row they sit inline with their
 * label inside, and a group of segments is named by `aria-labelledby`.
 */
const picker = {
  labelTarget: "group",
  lightMode: "inline",
  prefix: true,
} as const;

const dateTime = {
  ...picker,
  edit: (props: ValueEditProps) => <DateEdit {...props} time />,
  text: dateText(dayTimeFormat),
  dateMode: "dateTime" as const,
};
const dateTimeRange = {
  ...picker,
  edit: (props: ValueEditProps) => <DateRangeEdit {...props} time />,
  text: rangeText(dayTimeFormat),
  dateMode: "dateTime" as const,
};

export const dateValueTypes: ValueTypeMap = {
  date: {
    ...picker,
    edit: (props) => <DateEdit {...props} />,
    text: dateText(dayFormat),
    dateMode: "date",
  },
  dateRange: {
    ...picker,
    edit: (props) => <DateRangeEdit {...props} />,
    text: rangeText(dayFormat),
    dateMode: "date",
  },
  dateTime,
  datetime: dateTime,
  dateTimeRange,
  datetimeRange: dateTimeRange,
  time: {
    ...picker,
    edit: (props) => <TimeEdit {...props} />,
    text: ({ value }) => asTime(value) ?? "",
  },
  timeRange: {
    ...picker,
    edit: (props) => <TimeRangeEdit {...props} />,
    text: timeRangeText,
  },
};
