import { expect, test } from "bun:test";
import {
  clampDate,
  dateFromParts,
  dateTimeLayout,
  formatLocalDate,
  orderRange,
  parseLocalDate,
  parseTime,
  resolveDateTimeLabels,
} from "@workspace/ui/lib/date-time";
import { DateTimeWheels } from "@workspace/ui/lib/date-time-field";
import { renderToStaticMarkup } from "react-dom/server";
import { describeFixture } from "./support/fixture";

describeFixture("Date and time picker entry", "date-time-picker-runtime.tsx");

test("time strings parse strictly and round-trip", () => {
  expect(parseTime("09:05")).toEqual({ hour: 9, minute: 5, second: 0 });
  expect(parseTime("23:59:59")).toEqual({ hour: 23, minute: 59, second: 59 });
  expect(parseTime("24:00")).toEqual({});
  expect(parseTime("nope")).toEqual({});
});

test("local date strings read and write as local time", () => {
  const date = parseLocalDate("2026-03-04");
  expect(date?.getDate()).toBe(4);
  expect(date?.getHours()).toBe(0);
  expect(formatLocalDate(new Date(2026, 2, 4, 5, 6))).toBe("2026-03-04");
  expect(formatLocalDate(new Date(2026, 2, 4, 5, 6), {})).toBe(
    "2026-03-04T05:06",
  );
  expect(parseLocalDate("")).toBeUndefined();
  // Whatever the table engine matches: timestamps and Date strings too.
  const day = new Date(2026, 0, 5);
  expect(parseLocalDate(day.getTime())?.getDate()).toBe(5);
  expect(parseLocalDate(String(day))?.getDate()).toBe(5);
  expect(parseLocalDate("not a date")).toBeUndefined();
  // A loose string is not a date unless it names a full year.
  expect(parseLocalDate("1")).toBeUndefined();
  expect(parseLocalDate("Q1")).toBeUndefined();
});

test("ranges are ordered and layouts follow the locale", () => {
  expect(orderRange(5, 2, (a, b) => a - b)).toEqual({ from: 2, to: 5 });
  const order = (locale: string) =>
    dateTimeLayout(locale, { date: true, time: false, hourCycle: "h23" })
      .filter((item) => item.type !== "literal")
      .map((item) => item.type);
  expect(order("zh-CN")).toEqual(["year", "month", "day"]);
  expect(order("en-US")).toEqual(["month", "day", "year"]);
  expect(order("de-DE")).toEqual(["day", "month", "year"]);
  expect(resolveDateTimeLabels("zh-CN").clear).toBe("清空");
  expect(resolveDateTimeLabels("en", { clear: "Reset" }).clear).toBe("Reset");
});

test("two-digit years stay in the first century", () => {
  expect(dateFromParts({ year: 2, month: 3, day: 4 }).getFullYear()).toBe(2);
  expect(dateFromParts({ year: 2024, month: 2, day: 31 }).getDate()).toBe(29);
});

test("wheels keep a date within min and max, with its time", () => {
  const min = new Date(2026, 0, 10);
  const max = new Date(2026, 0, 20);
  const early = clampDate(new Date(2026, 0, 2, 9, 30), min, max);
  expect([early.getDate(), early.getHours(), early.getMinutes()]).toEqual([
    10, 9, 30,
  ]);
  expect(clampDate(new Date(2026, 1, 1), min, max).getDate()).toBe(20);
  const inside = new Date(2026, 0, 15);
  expect(clampDate(inside, min, max)).toBe(inside);
});

test("phone wheels put the date in locale order and the time on its row", () => {
  const labels = resolveDateTimeLabels("zh-CN");
  const html = renderToStaticMarkup(
    <DateTimeWheels
      value={new Date(2026, 10, 2, 9, 30)}
      onValueChange={() => {}}
      locale="zh-CN"
      labels={labels}
      time={{ hourCycle: "h23" }}
    />,
  );
  const names = [...html.matchAll(/role="listbox" aria-label="([^"]+)"/g)].map(
    (match) => match[1],
  );
  expect(names).toEqual(["年", "月", "日", "时", "分"]);
  expect(html).toContain('data-slot="date-time-wheels"');
  // Seconds with AM/PM take a second row.
  const wide = renderToStaticMarkup(
    <DateTimeWheels
      value={undefined}
      onValueChange={() => {}}
      locale="en-US"
      labels={resolveDateTimeLabels("en-US")}
      time={{ hourCycle: "h12", seconds: true }}
    />,
  );
  expect(wide).toContain('data-slot="date-wheels"');
  expect(wide).toContain('data-slot="time-wheels"');
});
