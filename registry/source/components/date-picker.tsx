"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "cn";
import { CalendarIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import type { DateRange, Matcher, PropsBase } from "react-day-picker";
import {
  type DateTimeLabelOverrides,
  type DateTimeLabels,
  type DateTimeParts,
  dateFromParts,
  dateTimeLayout,
  formatLocalDate,
  localeHourCycle,
  localeWeekStart,
  orderRange,
  partsFromDate,
  resolveDateTimeLabels,
  type TimeOptions,
} from "@/lib/date-time";
import {
  DateTimeField,
  DateTimeWheels,
  PickerFrame,
  PickerOverlay,
  pickerLayout,
  TimeWheels,
  useControllable,
  WheelsGroup,
} from "@/lib/date-time-field";
import type { GlassProps } from "@/lib/glass/with-glass";

export interface DatePickerPreset {
  label: ReactNode;
  /** A function is read on click, so "Last 7 days" stays current. */
  value: DateRange | (() => DateRange);
}

interface DatePickerBaseProps extends GlassProps {
  /** Adds time segments and wheels; the value keeps its time of day. */
  showTime?: boolean | TimeOptions;
  /** A BCP 47 tag for segment order, names, week start and the hour cycle. */
  locale?: string;
  labels?: DateTimeLabelOverrides;
  /** Earliest and latest selectable days. */
  min?: Date;
  max?: Date;
  /** Days that cannot be picked, in react-day-picker matcher form. */
  disabledDates?: Matcher | Matcher[];
  disabled?: boolean;
  /** Submits local `yyyy-mm-dd` (or `yyyy-mm-ddThh:mm`) through hidden inputs. */
  name?: string;
  /** Lands on the first segment. */
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-invalid"?: boolean;
  /** A label inside the field, before the date, as filter rows show it. */
  prefix?: ReactNode;
  /** Further Calendar props, such as `captionLayout` or `numberOfMonths`. */
  calendarProps?: Partial<PropsBase>;
}

export interface DatePickerSingleProps extends DatePickerBaseProps {
  mode?: "single";
  value?: Date;
  defaultValue?: Date;
  onValueChange?: (value: Date | undefined) => void;
}

export interface DatePickerRangeProps extends DatePickerBaseProps {
  mode: "range";
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (value: DateRange | undefined) => void;
  /** Quick ranges listed beside the calendar. */
  presets?: readonly DatePickerPreset[];
}

export type DatePickerProps = DatePickerSingleProps | DatePickerRangeProps;

function usePickerSetup(props: DatePickerBaseProps) {
  const { locale, showTime, min, max, disabledDates } = props;
  const options = typeof showTime === "object" ? showTime : undefined;
  const { seconds, step } = options ?? {};
  const hourCycle = useMemo(
    () => options?.hourCycle ?? localeHourCycle(locale),
    [options?.hourCycle, locale],
  );
  // Keyed on primitives, so an inline `showTime={{ … }}` keeps its memo.
  const timed = Boolean(showTime);
  const time = useMemo(
    () => (timed ? { seconds, step } : undefined),
    [timed, seconds, step],
  );
  const labels = useMemo(
    () => resolveDateTimeLabels(locale, props.labels),
    [locale, props.labels],
  );
  const layout = useMemo(
    () =>
      dateTimeLayout(locale, {
        date: true,
        time: Boolean(time),
        seconds: time?.seconds,
        hourCycle,
      }),
    [locale, time, hourCycle],
  );
  const calendar = useMemo(() => {
    const month = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
    });
    const weekday = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
    const shortMonth = new Intl.DateTimeFormat(locale, { month: "short" });
    const matchers = [
      ...(min ? [{ before: min }] : []),
      ...(max ? [{ after: max }] : []),
      ...[disabledDates ?? []].flat(),
    ];
    return {
      weekStartsOn: localeWeekStart(locale),
      startMonth: min,
      endMonth: max,
      disabled: matchers.length ? matchers : undefined,
      formatters: {
        formatCaption: (date: Date) => month.format(date),
        formatWeekdayName: (date: Date) => weekday.format(date),
        formatMonthDropdown: (date: Date) => shortMonth.format(date),
      },
      ...props.calendarProps,
    };
  }, [locale, min, max, disabledDates, props.calendarProps]);
  const fieldProps = {
    layout,
    hourCycle,
    locale,
    labels,
    step: time?.step,
    disabled: props.disabled,
  };
  const wheelProps = {
    hourCycle,
    locale,
    labels,
    seconds: time?.seconds,
    step: time?.step,
    disabled: props.disabled,
  };
  return { time, labels, calendar, fieldProps, wheelProps };
}

/** A picked day keeps the time already chosen; a new one starts at 00:00. */
function onDay(day: Date, previous: Date | undefined) {
  if (!previous) return day;
  return dateFromParts({
    ...partsFromDate(previous),
    year: day.getFullYear(),
    month: day.getMonth() + 1,
    day: day.getDate(),
  });
}

/** Time wheels on a day not picked yet start from today. */
function atTime(parts: DateTimeParts, previous: Date | undefined) {
  const base = previous ?? new Date(new Date().setHours(0, 0, 0, 0));
  return dateFromParts({ ...partsFromDate(base), ...parts });
}

const sameRange = (a: DateRange | undefined, b: DateRange | undefined) =>
  a?.from?.getTime() === b?.from?.getTime() &&
  a?.to?.getTime() === b?.to?.getTime();

const toParts = (date: Date | undefined) =>
  date ? partsFromDate(date) : undefined;
const toDate = (parts: DateTimeParts | undefined) =>
  parts ? dateFromParts(parts) : undefined;
const isInvalid = (date: Date | undefined, min?: Date, max?: Date) =>
  Boolean(
    date &&
      ((min && date < new Date(new Date(min).setHours(0, 0, 0, 0))) ||
        (max && date > new Date(new Date(max).setHours(23, 59, 59, 999)))),
  );

type PickerSetup = ReturnType<typeof usePickerSetup>;

// Beside the calendar on wider screens, taking the width the popover has
// beyond it, so the wheels sit centred on a band across the column.
const timeColumn = "flex flex-1 flex-col justify-center gap-3 border-s p-1.5";
// A lone time beside the calendar shows as many rows as it fits, even in a
// five-week month, so the panel keeps its height between months.
const besideCalendarRows = 11;

interface PhoneWheelsProps {
  value: Date | undefined;
  onValueChange: (value: Date) => void;
  setup: PickerSetup;
  locale: string | undefined;
  labels: DateTimeLabels;
  min?: Date;
  max?: Date;
  disabled?: boolean;
}

/** On phones, wheels replace the calendar: the date and its time in a row. */
function PhoneWheels({
  value,
  onValueChange,
  setup,
  locale,
  labels,
  min,
  max,
  disabled,
}: PhoneWheelsProps) {
  const { time, wheelProps } = setup;
  return (
    <DateTimeWheels
      className="w-full"
      aria-label={labels.chooseDate}
      value={value}
      onValueChange={onValueChange}
      time={
        time && {
          hourCycle: wheelProps.hourCycle,
          seconds: time.seconds,
          step: time.step,
        }
      }
      locale={locale}
      labels={labels}
      min={min}
      max={max}
      disabled={disabled}
    />
  );
}

function SingleDatePicker(props: DatePickerSingleProps) {
  const setup = usePickerSetup(props);
  const { time, labels, calendar, fieldProps, wheelProps } = setup;
  const [value, setValue] = useControllable(props, "value" in props);
  const [open, setOpen] = useState(false);
  const mobile = useIsMobile();
  const invalid =
    props["aria-invalid"] || isInvalid(value, props.min, props.max);
  return (
    <>
      <PickerFrame
        labels={labels}
        disabled={props.disabled}
        invalid={invalid}
        glass={props.glass}
        frosted={props.frosted}
        prefix={props.prefix}
        className={props.className}
        onClear={value ? () => setValue(undefined) : undefined}
        overlay={
          <PickerOverlay
            open={open}
            onOpenChange={setOpen}
            icon={<CalendarIcon />}
            label={labels.chooseDate}
            doneLabel={labels.done}
            disabled={props.disabled}
            glass={props.glass}
            frosted={props.frosted}
          >
            {mobile ? (
              <PhoneWheels
                value={value}
                onValueChange={setValue}
                setup={setup}
                locale={props.locale}
                labels={labels}
                min={props.min}
                max={props.max}
                disabled={props.disabled}
              />
            ) : (
              <div className="flex">
                <Calendar
                  className="bg-transparent"
                  {...calendar}
                  mode="single"
                  selected={value}
                  defaultMonth={value}
                  onSelect={(day) => {
                    if (!day) return;
                    setValue(onDay(day, value));
                    if (!time) setOpen(false);
                  }}
                />
                {time && (
                  <div className={timeColumn}>
                    <TimeWheels
                      {...wheelProps}
                      rows={besideCalendarRows}
                      aria-label={labels.chooseTime}
                      value={toParts(value)}
                      onValueChange={(parts) => setValue(atTime(parts, value))}
                    />
                  </div>
                )}
              </div>
            )}
          </PickerOverlay>
        }
      >
        <DateTimeField
          {...fieldProps}
          id={props.id}
          aria-label={props["aria-label"]}
          aria-labelledby={props["aria-labelledby"]}
          aria-invalid={invalid || undefined}
          value={toParts(value)}
          onValueChange={(parts) => setValue(toDate(parts))}
        />
      </PickerFrame>
      {props.name && (
        <input
          type="hidden"
          name={props.name}
          value={value ? formatLocalDate(value, time) : ""}
        />
      )}
    </>
  );
}

function RangeDatePicker(props: DatePickerRangeProps) {
  const setup = usePickerSetup(props);
  const { time, labels, calendar, fieldProps, wheelProps } = setup;
  const [value, setValue] = useControllable(props, "value" in props);
  // Typing and wheels leave the ends as entered until focus leaves the field
  // or the panel closes, so a swap never moves the end being set. Until then
  // a reversed range is shown here but never reported, and only while the
  // value it was entered over still stands: a new value replaces it.
  const [held, setHeld] = useState<{ range: DateRange; over?: DateRange }>();
  const reversed = held && sameRange(held.over, value) ? held.range : undefined;
  // Clearing remounts the fields, so no half-typed segment outlives it.
  const [clears, setClears] = useState(0);
  const [open, setOpen] = useState(false);
  const mobile = useIsMobile();
  const layout = pickerLayout(mobile);
  const from = (reversed ?? value)?.from;
  const to = (reversed ?? value)?.to;
  const report = (range: Partial<DateRange>) => {
    setHeld(undefined);
    setValue(
      range.from || range.to ? { from: range.from, to: range.to } : undefined,
    );
  };
  const update = (next: Partial<DateRange>, order = true) => {
    const edges = {
      from: "from" in next ? next.from : from,
      to: "to" in next ? next.to : to,
    };
    if (!order && edges.from && edges.to && edges.from > edges.to) {
      setHeld({ range: { from: edges.from, to: edges.to }, over: value });
      return;
    }
    report(
      order
        ? orderRange(edges.from, edges.to, (a, b) => a.getTime() - b.getTime())
        : edges,
    );
  };
  const putInOrder = () => {
    if (reversed) update({});
  };
  const edgeLabel = (end: "from" | "to") =>
    end === "from" ? labels.start : labels.end;
  const invalid =
    props["aria-invalid"] ||
    isInvalid(from, props.min, props.max) ||
    isInvalid(to, props.min, props.max);
  const field = (end: "from" | "to", date: Date | undefined, id?: string) => (
    <DateTimeField
      key={`${end}-${clears}`}
      {...fieldProps}
      id={id}
      className={end === "from" ? "flex-none pe-1" : "flex-none ps-1"}
      aria-label={[props["aria-label"], edgeLabel(end)]
        .filter(Boolean)
        .join(" ")}
      aria-invalid={invalid || undefined}
      value={toParts(date)}
      onValueChange={(parts) => update({ [end]: toDate(parts) }, false)}
    />
  );
  const presets = props.presets && props.presets.length > 0 && (
    <div className={layout.presets}>
      {props.presets.map((preset, index) => (
        <Button
          // biome-ignore lint/suspicious/noArrayIndexKey: Presets are an ordered list without ids.
          key={index}
          variant="ghost"
          size="sm"
          className="justify-start"
          onClick={() => {
            const range =
              typeof preset.value === "function"
                ? preset.value()
                : preset.value;
            update({ from: range.from, to: range.to });
            setOpen(false);
          }}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
  return (
    <>
      <PickerFrame
        labels={labels}
        disabled={props.disabled}
        invalid={invalid}
        glass={props.glass}
        frosted={props.frosted}
        prefix={props.prefix}
        // A range is as wide as its two dates, not the row it sits in.
        className={cn("w-fit max-w-full", props.className)}
        onClear={
          value || reversed
            ? () => {
                setClears((count) => count + 1);
                report({});
              }
            : undefined
        }
        overlay={
          <PickerOverlay
            open={open}
            onOpenChange={(next) => {
              setOpen(next);
              if (!next) putInOrder();
            }}
            icon={<CalendarIcon />}
            label={labels.chooseDate}
            doneLabel={labels.done}
            disabled={props.disabled}
            glass={props.glass}
            frosted={props.frosted}
          >
            {mobile ? (
              <div className={layout.panel}>
                {presets}
                <div className={layout.ends}>
                  {(["from", "to"] as const).map((end) => (
                    <WheelsGroup key={end} caption={edgeLabel(end)}>
                      <PhoneWheels
                        // An end not set yet starts at the other end's day.
                        value={end === "from" ? (from ?? to) : (to ?? from)}
                        onValueChange={(date) => update({ [end]: date }, false)}
                        setup={setup}
                        locale={props.locale}
                        labels={labels}
                        min={props.min}
                        max={props.max}
                        disabled={props.disabled}
                      />
                    </WheelsGroup>
                  ))}
                </div>
              </div>
            ) : (
              <div className={layout.panel}>
                {presets}
                <Calendar
                  className="bg-transparent"
                  numberOfMonths={2}
                  {...calendar}
                  mode="range"
                  resetOnSelect
                  selected={{ from, to }}
                  defaultMonth={from}
                  onSelect={(range) => {
                    update({
                      from: range?.from && onDay(range.from, from),
                      to: range?.to && onDay(range.to, to),
                    });
                    if (!time && range?.from && range.to) setOpen(false);
                  }}
                />
                {time && (
                  <div className={timeColumn}>
                    {(["from", "to"] as const).map((end) => {
                      const date = end === "from" ? from : to;
                      return (
                        <WheelsGroup key={end} caption={edgeLabel(end)}>
                          <TimeWheels
                            {...wheelProps}
                            aria-label={`${edgeLabel(end)} ${labels.chooseTime}`}
                            value={toParts(date)}
                            onValueChange={(parts) =>
                              update(
                                { [end]: atTime(parts, date ?? from) },
                                false,
                              )
                            }
                          />
                        </WheelsGroup>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </PickerOverlay>
        }
      >
        {/* biome-ignore lint/a11y/useSemanticElements: The two ends form one labelled group without fieldset layout. */}
        <div
          role="group"
          aria-label={props["aria-label"]}
          aria-labelledby={props["aria-labelledby"]}
          // Scrolls sideways when narrower than both dates, with no scrollbar
          className="flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onBlur={(event) => {
            if (event.currentTarget.contains(event.relatedTarget)) return;
            putInOrder();
          }}
        >
          {field("from", from, props.id)}
          <span aria-hidden="true" className="text-muted-foreground">
            ~
          </span>
          {field("to", to)}
        </div>
      </PickerFrame>
      {props.name &&
        [value?.from, value?.to].map((date, index) => (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: The start and end inputs keep their order.
            key={index}
            type="hidden"
            name={props.name}
            value={date ? formatLocalDate(date, time) : ""}
          />
        ))}
    </>
  );
}

/**
 * A typed, segmented date field with a calendar panel: one day or a range,
 * optionally with a time of day.
 */
function DatePicker(props: DatePickerProps) {
  if (props.mode === "range") return <RangeDatePicker {...props} />;
  return <SingleDatePicker {...props} />;
}

export type { DateRange } from "react-day-picker";
export {
  type DateTimeLabelOverrides,
  dateTimeLabels,
  dateTimeLabelsZhCN,
} from "@/lib/date-time";
export { DatePicker };
