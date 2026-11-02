/**
 * Shared date and time helpers for DatePicker and TimePicker. Date math runs
 * on date-fns; locale-aware order and names come from Intl, so a BCP 47 tag
 * is all a picker needs.
 */

import {
  endOfDay,
  format,
  getDaysInMonth,
  isValid,
  parse,
  parseISO,
  set,
  startOfDay,
} from "date-fns";

export type HourCycle = "h12" | "h23";

export type DateTimeSegmentType =
  | "year"
  | "month"
  | "day"
  | "hour"
  | "minute"
  | "second"
  | "dayPeriod";

/** A partly entered date and time; `hour` is always 0–23. */
export type DateTimeParts = Partial<
  Record<Exclude<DateTimeSegmentType, "dayPeriod">, number>
>;

export type DateTimeLayoutItem =
  | { type: DateTimeSegmentType }
  | { type: "literal"; value: string };

export interface TimeOptions {
  /** Shows a seconds segment and wheel. */
  seconds?: boolean;
  /** Minute step of the wheel; typed minutes stay exact. */
  step?: number;
  /** Follows the locale when unset. */
  hourCycle?: HourCycle;
}

/** English defaults. Pass overrides through `labels`. */
export const dateTimeLabels = {
  chooseDate: "Choose date",
  chooseTime: "Choose time",
  clear: "Clear",
  done: "Done",
  start: "Start",
  end: "End",
  year: "Year",
  month: "Month",
  day: "Day",
  hour: "Hour",
  minute: "Minute",
  second: "Second",
  dayPeriod: "AM/PM",
  placeholders: {
    year: "yyyy",
    month: "mm",
    day: "dd",
    hour: "--",
    minute: "--",
    second: "--",
    dayPeriod: "--",
  } as Record<DateTimeSegmentType, string>,
};

export type DateTimeLabels = typeof dateTimeLabels;
export type DateTimeLabelOverrides = Partial<
  Omit<DateTimeLabels, "placeholders">
> & { readonly placeholders?: Partial<DateTimeLabels["placeholders"]> };

export const dateTimeLabelsZhCN: DateTimeLabelOverrides = {
  chooseDate: "选择日期",
  chooseTime: "选择时间",
  clear: "清空",
  done: "完成",
  start: "开始",
  end: "结束",
  year: "年",
  month: "月",
  day: "日",
  hour: "时",
  minute: "分",
  second: "秒",
  dayPeriod: "上午/下午",
  placeholders: { year: "年", month: "月", day: "日" },
};

/** Chinese locales start from the Chinese copy; overrides win. */
export function resolveDateTimeLabels(
  locale: string | undefined,
  overrides?: DateTimeLabelOverrides,
): DateTimeLabels {
  const base = locale?.toLowerCase().startsWith("zh") ? dateTimeLabelsZhCN : {};
  return {
    ...dateTimeLabels,
    ...base,
    ...overrides,
    placeholders: {
      ...dateTimeLabels.placeholders,
      ...base.placeholders,
      ...overrides?.placeholders,
    },
  };
}

export function localeHourCycle(locale: string | undefined): HourCycle {
  const cycle = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
  }).resolvedOptions().hourCycle;
  return cycle === "h11" || cycle === "h12" ? "h12" : "h23";
}

/** 0 is Sunday, as react-day-picker's `weekStartsOn` expects. */
export function localeWeekStart(
  locale: string | undefined,
): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  try {
    const intl = new Intl.Locale(
      locale ?? new Intl.DateTimeFormat().resolvedOptions().locale,
    ) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const firstDay = (intl.getWeekInfo?.() ?? intl.weekInfo)?.firstDay;
    if (firstDay) return (firstDay % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  } catch {}
  return 0;
}

const layoutSample = new Date(2001, 10, 22, 13, 44, 55);

/** The locale's segment order and separators, e.g. `yyyy/mm/dd hh:mm`. */
export function dateTimeLayout(
  locale: string | undefined,
  options: {
    date: boolean;
    time: boolean;
    seconds?: boolean;
    hourCycle: HourCycle;
  },
): DateTimeLayoutItem[] {
  const format = new Intl.DateTimeFormat(locale, {
    ...(options.date && { year: "numeric", month: "2-digit", day: "2-digit" }),
    ...(options.time && {
      hour: "2-digit",
      minute: "2-digit",
      ...(options.seconds && { second: "2-digit" }),
      hourCycle: options.hourCycle,
    }),
  });
  const items: DateTimeLayoutItem[] = [];
  for (const part of format.formatToParts(layoutSample)) {
    if (part.type === "literal") {
      // Collapse spacing and commas between the date and the time.
      const value = part.value.replace(/,\s*/, " ");
      if (items.length > 0) items.push({ type: "literal", value });
    } else if (isSegment(part.type)) {
      items.push({ type: part.type });
    }
  }
  return items;
}

function isSegment(type: string): type is DateTimeSegmentType {
  return (
    type === "year" ||
    type === "month" ||
    type === "day" ||
    type === "hour" ||
    type === "minute" ||
    type === "second" ||
    type === "dayPeriod"
  );
}

/** The locale's names for AM and PM. */
export function dayPeriodNames(locale: string | undefined): [string, string] {
  const name = (hour: number) =>
    new Intl.DateTimeFormat(locale, { hour: "numeric", hourCycle: "h12" })
      .formatToParts(new Date(2001, 0, 1, hour))
      .find((part) => part.type === "dayPeriod")?.value ??
    (hour < 12 ? "AM" : "PM");
  return [name(9), name(15)];
}

/**
 * The first of a month. `new Date(year, …)` reads years 0–99 as 1900–1999,
 * so the year is set on its own.
 */
export function monthStart(year: number, month: number) {
  const date = new Date(2000, 0, 1);
  date.setFullYear(year, month - 1, 1);
  return date;
}

export function daysInMonth(
  year: number | undefined,
  month: number | undefined,
) {
  if (month === undefined) return 31;
  return getDaysInMonth(monthStart(year ?? 2000, month));
}

export function partsFromDate(date: Date | undefined): DateTimeParts {
  if (!date) return {};
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };
}

/** Missing parts fall back to 2000-01-01 00:00; the day clamps to the month. */
export function dateFromParts(parts: DateTimeParts) {
  const { year = 2000, month = 1, day = 1 } = parts;
  return set(monthStart(year, month), {
    date: Math.min(day, daysInMonth(year, month)),
    hours: parts.hour ?? 0,
    minutes: parts.minute ?? 0,
    seconds: parts.second ?? 0,
    milliseconds: 0,
  });
}

const timeFormats = ["HH:mm:ss", "HH:mm"];
const anchor = new Date(2000, 0, 1);

/** Reads `"HH:mm"` or `"HH:mm:ss"`; anything else is no time. */
export function parseTime(value: string | undefined): DateTimeParts {
  if (!value) return {};
  for (const pattern of timeFormats) {
    const date = parse(value, pattern, anchor);
    if (isValid(date)) {
      const { hour, minute, second } = partsFromDate(date);
      return { hour, minute, second };
    }
  }
  return {};
}

export function formatTime(parts: DateTimeParts, seconds = false) {
  return format(dateFromParts(parts), seconds ? "HH:mm:ss" : "HH:mm");
}

/** Local `yyyy-MM-dd`, or `yyyy-MM-ddTHH:mm[:ss]` with a time. */
export function formatLocalDate(
  date: Date,
  time?: { seconds?: boolean } | false,
) {
  if (!time) return format(date, "yyyy-MM-dd");
  return format(
    date,
    time.seconds ? "yyyy-MM-dd'T'HH:mm:ss" : "yyyy-MM-dd'T'HH:mm",
  );
}

/**
 * Reads what a table cell or filter may hold: a Date, a timestamp, an ISO
 * string (local time without an offset) or any string `Date.parse` reads.
 */
export function parseLocalDate(value: unknown): Date | undefined {
  if (value instanceof Date) return isValid(value) ? value : undefined;
  if (typeof value === "number") {
    const date = new Date(value);
    return isValid(date) ? date : undefined;
  }
  if (typeof value !== "string" || value === "") return undefined;
  const iso = parseISO(value);
  if (isValid(iso)) return iso;
  // Only strings that name a full year, so "1" or "Q1" are not read as dates.
  if (!/\d{4}/.test(value)) return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : new Date(time);
}

/** Moves a date into the days from `min` to `max`, keeping its time. */
export function clampDate(date: Date, min?: Date, max?: Date) {
  const bound =
    (min && date < startOfDay(min) && min) ||
    (max && date > endOfDay(max) && max);
  if (!bound) return date;
  return set(date, {
    year: bound.getFullYear(),
    month: bound.getMonth(),
    date: bound.getDate(),
  });
}

/** Puts a range in order, so the end never comes before the start. */
export function orderRange<T>(
  from: T | undefined,
  to: T | undefined,
  compare: (a: T, b: T) => number,
): { from?: T; to?: T } {
  if (from !== undefined && to !== undefined && compare(from, to) > 0) {
    return { from: to, to: from };
  }
  return { from, to };
}

export function timeOptions(step = 1, length = 60) {
  const size = Math.max(1, Math.floor(step));
  return Array.from({ length: Math.ceil(length / size) }, (_, index) =>
    String(index * size).padStart(2, "0"),
  );
}
