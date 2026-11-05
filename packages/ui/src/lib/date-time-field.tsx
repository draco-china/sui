"use client";

import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@workspace/ui/components/bottom-sheet";
import { Button } from "@workspace/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
} from "@workspace/ui/components/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { WheelPicker } from "@workspace/ui/components/wheel-picker";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { cn } from "cn";
import { startOfToday } from "date-fns";
import { XIcon } from "lucide-react";
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  clampDate,
  type DateTimeLabels,
  type DateTimeLayoutItem,
  type DateTimeParts,
  type DateTimeSegmentType,
  dateFromParts,
  dateTimeLayout,
  dayPeriodNames,
  daysInMonth,
  type HourCycle,
  monthStart,
  partsFromDate,
  timeOptions,
} from "./date-time";
import type { GlassProps } from "./glass/with-glass";

type PartKey = keyof DateTimeParts;

const limits: Record<PartKey, [number, number]> = {
  year: [1, 9999],
  month: [1, 12],
  day: [1, 31],
  hour: [0, 23],
  minute: [0, 59],
  second: [0, 59],
};

const sameParts = (
  a: DateTimeParts | undefined,
  b: DateTimeParts | undefined,
) => JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});

function maxFor(type: PartKey, parts: DateTimeParts, hourCycle: HourCycle) {
  if (type === "day") return daysInMonth(parts.year, parts.month);
  if (type === "hour" && hourCycle === "h12") return 12;
  return limits[type][1];
}

function displayValue(
  type: DateTimeSegmentType,
  parts: DateTimeParts,
  hourCycle: HourCycle,
  periods: [string, string],
) {
  if (type === "dayPeriod") {
    return parts.hour === undefined
      ? undefined
      : periods[parts.hour < 12 ? 0 : 1];
  }
  const value = parts[type];
  if (value === undefined) return undefined;
  if (type === "year") return String(value).padStart(4, "0");
  if (type === "hour" && hourCycle === "h12") {
    return String(value % 12 || 12).padStart(2, "0");
  }
  return String(value).padStart(2, "0");
}

export interface DateTimeFieldProps {
  layout: readonly DateTimeLayoutItem[];
  /** Complete parts, or undefined for an empty or unfinished entry. */
  value: DateTimeParts | undefined;
  onValueChange: (value: DateTimeParts | undefined) => void;
  hourCycle: HourCycle;
  locale: string | undefined;
  labels: DateTimeLabels;
  /** Minute step for the arrow keys. */
  step?: number;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-invalid"?: boolean;
  className?: string;
}

/** A value a parent may control, or the picker keeps itself. */
export function useControllable<T>(
  props: {
    value?: T;
    defaultValue?: T;
    onValueChange?: (value: T | undefined) => void;
  },
  controlled: boolean,
) {
  const [inner, setInner] = useState(props.defaultValue);
  const value = controlled ? props.value : inner;
  const set = (next: T | undefined) => {
    if (!controlled) setInner(next);
    props.onValueChange?.(next);
  };
  return [value, set] as const;
}

/** The number a segment announces: 1–12 for a 12-hour hour, 0 or 1 for AM/PM. */
function spokenValue(
  type: DateTimeSegmentType,
  parts: DateTimeParts,
  hourCycle: HourCycle,
) {
  const hour = parts.hour;
  if (type === "dayPeriod")
    return hour === undefined ? undefined : +(hour >= 12);
  if (type === "hour" && hourCycle === "h12" && hour !== undefined) {
    return hour % 12 || 12;
  }
  return parts[type];
}

/**
 * Typed entry in segments: arrows step a segment, digits fill it and move on
 * once no further digit fits, Backspace clears it.
 */
export function DateTimeField({
  layout,
  value,
  onValueChange,
  hourCycle,
  locale,
  labels,
  step = 1,
  disabled,
  id,
  className,
  ...aria
}: DateTimeFieldProps) {
  const [draft, setDraft] = useState<DateTimeParts>(value ?? {});
  const emitted = useRef(value);
  const buffer = useRef("");
  const segments = useRef<(HTMLSpanElement | null)[]>([]);
  const periods = useMemo(() => dayPeriodNames(locale), [locale]);
  const required = layout.flatMap((item) =>
    item.type === "literal" || item.type === "dayPeriod" ? [] : [item.type],
  );

  // A `<label for={id}>` cannot reach a span, so its clicks focus the first
  // segment here, and a field with no name of its own takes the label's.
  const [labelledBy, setLabelledBy] = useState<string>();
  useEffect(() => {
    if (!id) return;
    const selector = `label[for="${id.replace(/["\\]/g, "\\$&")}"]`;
    const found = [...document.querySelectorAll<HTMLLabelElement>(selector)];
    const focus = (event: MouseEvent) => {
      event.preventDefault();
      segments.current.find(Boolean)?.focus();
    };
    for (const [index, label] of found.entries()) {
      label.id ||= `${id}-label-${index}`;
      label.addEventListener("click", focus);
    }
    setLabelledBy(found.map((label) => label.id).join(" ") || undefined);
    return () => {
      for (const label of found) label.removeEventListener("click", focus);
    };
  }, [id]);
  const named = Boolean(aria["aria-label"] || aria["aria-labelledby"]);

  // Follow outside changes, but keep an unfinished entry the field reported
  // as empty itself.
  useEffect(() => {
    if (sameParts(value, emitted.current)) return;
    emitted.current = value;
    setDraft(value ?? {});
  }, [value]);

  const commit = (next: DateTimeParts) => {
    setDraft(next);
    const complete = required.every((type) => next[type] !== undefined);
    const result = complete ? next : undefined;
    if (sameParts(result, emitted.current)) return;
    emitted.current = result;
    onValueChange(result);
  };

  const focusSegment = (index: number) => {
    const order = segments.current.filter(Boolean);
    order[Math.max(0, Math.min(order.length - 1, index))]?.focus();
  };

  const stepSegment = (type: PartKey, delta: number) => {
    const now: DateTimeParts = {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate(),
      hour: new Date().getHours(),
      minute: 0,
      second: 0,
    };
    const current = draft[type];
    if (current === undefined) return commit({ ...draft, [type]: now[type] });
    const [min] = limits[type];
    const max =
      type === "day" ? daysInMonth(draft.year, draft.month) : limits[type][1];
    const size = type === "minute" ? step : 1;
    const span = max - min + 1;
    const next =
      ((((current - min + delta * size) % span) + span) % span) + min;
    commit({ ...draft, [type]: next });
  };

  const typeDigit = (type: PartKey, digit: string, index: number) => {
    const max = maxFor(type, draft, hourCycle);
    let text = buffer.current + digit;
    if (+text > max) text = digit;
    buffer.current = text;
    let number = +text;
    const done = text.length >= String(max).length || number * 10 > max;
    if (type === "hour" && hourCycle === "h12") {
      if (number === 0 && !done) return;
      const pm = (draft.hour ?? 0) >= 12;
      number = (number % 12) + (pm ? 12 : 0);
    }
    if (number < limits[type][0] && !done) return setDraft({ ...draft });
    commit({ ...draft, [type]: Math.max(limits[type][0], number) });
    if (done) {
      buffer.current = "";
      focusSegment(index + 1);
    }
  };

  const setPeriod = (pm: boolean) => {
    const hour = draft.hour ?? 0;
    commit({ ...draft, hour: (hour % 12) + (pm ? 12 : 0) });
  };

  const onKeyDown = (
    event: KeyboardEvent<HTMLSpanElement>,
    type: DateTimeSegmentType,
    index: number,
  ) => {
    if (disabled) return;
    const rtl = event.currentTarget.closest("[dir=rtl]") !== null;
    const { key } = event;
    if (key === "ArrowLeft" || key === "ArrowRight") {
      event.preventDefault();
      buffer.current = "";
      focusSegment(index + ((key === "ArrowRight") !== rtl ? 1 : -1));
      return;
    }
    if (key === "ArrowUp" || key === "ArrowDown") {
      event.preventDefault();
      buffer.current = "";
      if (type === "dayPeriod") setPeriod((draft.hour ?? 0) < 12);
      else stepSegment(type, key === "ArrowUp" ? 1 : -1);
      return;
    }
    if (key === "Backspace" || key === "Delete") {
      event.preventDefault();
      if (type !== "dayPeriod" && buffer.current) {
        buffer.current = buffer.current.slice(0, -1);
        const rest = buffer.current;
        commit({ ...draft, [type]: rest ? +rest : undefined });
        return;
      }
      const key = type === "dayPeriod" ? "hour" : type;
      if (draft[key] === undefined) focusSegment(index - 1);
      else commit({ ...draft, [key]: undefined });
      return;
    }
    if (type === "dayPeriod") {
      const letter = key.toLowerCase();
      if (letter === "a" || letter === periods[0][0]?.toLowerCase()) {
        setPeriod(false);
      } else if (letter === "p" || letter === periods[1][0]?.toLowerCase()) {
        setPeriod(true);
      }
      return;
    }
    if (/^\d$/.test(key)) {
      event.preventDefault();
      typeDigit(type, key, index);
    }
  };

  let segmentIndex = -1;
  return (
    // biome-ignore lint/a11y/useSemanticElements: A segmented field is a labelled group of spinbuttons, not a fieldset.
    <div
      role="group"
      data-slot="date-time-field"
      aria-disabled={disabled || undefined}
      className={cn(
        "flex min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap px-3 text-sm tabular-nums",
        disabled && "opacity-50",
        className,
      )}
      {...aria}
      aria-labelledby={
        aria["aria-labelledby"] ?? (named ? undefined : labelledBy)
      }
    >
      {layout.map((item, position) => {
        if (item.type === "literal") {
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: Literals have no identity beyond their place in the layout.
              key={position}
              aria-hidden="true"
              className="text-muted-foreground"
            >
              {item.value}
            </span>
          );
        }
        segmentIndex += 1;
        const index = segmentIndex;
        const { type } = item;
        const shown = displayValue(type, draft, hourCycle, periods);
        const twelve = type === "hour" && hourCycle === "h12";
        return (
          <span
            key={type}
            ref={(node) => {
              segments.current[index] = node;
            }}
            id={index === 0 ? id : undefined}
            role="spinbutton"
            tabIndex={disabled ? -1 : 0}
            aria-label={labels[type]}
            aria-valuenow={spokenValue(type, draft, hourCycle)}
            aria-valuemin={
              type === "dayPeriod" || twelve ? +twelve : limits[type][0]
            }
            aria-valuemax={
              type === "dayPeriod" ? 1 : maxFor(type, draft, hourCycle)
            }
            aria-valuetext={shown ?? labels.placeholders[type]}
            aria-disabled={disabled || undefined}
            data-placeholder={shown === undefined ? "" : undefined}
            data-slot="date-time-segment"
            className="rounded-md px-0.5 caret-transparent outline-none focus:bg-primary focus:text-primary-foreground data-placeholder:text-muted-foreground"
            onKeyDown={(event) => onKeyDown(event, type, index)}
            onBlur={() => {
              buffer.current = "";
            }}
          >
            {shown ?? labels.placeholders[type]}
          </span>
        );
      })}
    </div>
  );
}

export interface PickerFrameProps extends GlassProps {
  children: ReactNode;
  /** The button that opens the panel, from `PickerOverlay`. */
  overlay: ReactNode;
  onClear?: () => void;
  labels: DateTimeLabels;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  /** A label inside the field, before the value, as filter rows show it. */
  prefix?: ReactNode;
}

/** The panel opens against the whole field, not just its icon button. */
const PickerAnchorContext =
  createContext<RefObject<HTMLDivElement | null> | null>(null);

/** The field capsule: segments, an optional clear button and the opener. */
export function PickerFrame({
  children,
  overlay,
  onClear,
  labels,
  disabled,
  invalid,
  className,
  glass,
  frosted,
  prefix,
}: PickerFrameProps) {
  const anchor = useRef<HTMLDivElement>(null);
  return (
    <PickerAnchorContext value={anchor}>
      <InputGroup
        ref={anchor}
        glass={glass}
        frosted={frosted}
        data-disabled={disabled || undefined}
        data-invalid={invalid || undefined}
        className={cn(
          "has-[[data-slot=date-time-segment]:focus-visible]:border-ring has-[[data-slot=date-time-segment]:focus-visible]:ring-3 has-[[data-slot=date-time-segment]:focus-visible]:ring-ring/30 data-invalid:border-destructive data-invalid:ring-3 data-invalid:ring-destructive/20 dark:data-invalid:ring-destructive/40",
          className,
        )}
      >
        {prefix ? (
          <InputGroupAddon className="whitespace-nowrap text-muted-foreground">
            {prefix}
          </InputGroupAddon>
        ) : null}
        {children}
        <InputGroupAddon align="inline-end" className="gap-0.5">
          {onClear && !disabled && (
            <InputGroupButton
              size="icon-xs"
              aria-label={labels.clear}
              onClick={onClear}
              className="text-muted-foreground"
            >
              <XIcon />
            </InputGroupButton>
          )}
          {overlay}
        </InputGroupAddon>
      </InputGroup>
    </PickerAnchorContext>
  );
}

/**
 * Panel layouts: side by side in a popover; stacked in a phone's sheet,
 * compact enough that the sheet shows everything at once without scrolling.
 */
export function pickerLayout(mobile: boolean) {
  if (mobile) {
    return {
      panel: "flex w-full flex-col items-center gap-3",
      presets: "flex w-full flex-wrap justify-center gap-1",
      // A range's ends stack; each group sits closer to its own wheels than
      // to the other end's.
      ends: "flex w-full flex-col gap-6",
      // Stacked ends caption on the leading edge, with the title and bands.
      caption: "start" as const,
    };
  }
  return {
    panel: "flex",
    presets: "flex flex-col gap-1 border-e p-3",
    ends: "flex gap-3 p-1.5",
    // Side by side, each caption centres over its own wheels.
    caption: "center" as const,
  };
}

/**
 * One set of wheels, captioned when it is one end of a range: on the leading
 * edge when ends stack, centred over the wheels when they sit side by side.
 */
export function WheelsGroup({
  caption,
  align = "start",
  className,
  children,
}: {
  caption?: string;
  align?: "start" | "center";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-fit flex-1 flex-col", className)}>
      {caption && (
        <span
          data-align={align}
          className="text-start text-muted-foreground text-sm data-[align=center]:text-center"
        >
          {caption}
        </span>
      )}
      {children}
    </div>
  );
}

export interface PickerOverlayProps extends GlassProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: ReactNode;
  label: string;
  /** The sheet's close button on phones. */
  doneLabel: string;
  disabled?: boolean;
  children: ReactNode;
  contentClassName?: string;
}

/** A popover next to the field; a bottom sheet on phones. */
export function PickerOverlay({
  open,
  onOpenChange,
  icon,
  label,
  doneLabel,
  disabled,
  children,
  contentClassName,
  glass,
  frosted,
}: PickerOverlayProps) {
  const mobile = useIsMobile();
  const anchor = useContext(PickerAnchorContext);
  const trigger = (
    <InputGroupButton size="icon-xs" aria-label={label} disabled={disabled} />
  );
  if (mobile) {
    return (
      // Sized to the picker, not half the screen, so nothing hides below.
      <BottomSheet open={open} onOpenChange={onOpenChange} detents={false}>
        <BottomSheetTrigger render={trigger}>{icon}</BottomSheetTrigger>
        <BottomSheetContent glass={glass} frosted={frosted}>
          <BottomSheetHeader className="flex-row items-center justify-between">
            <BottomSheetTitle>{label}</BottomSheetTitle>
            <BottomSheetClose
              render={
                // The label's end meets the bands' end: the button's
                // padding and border hang past the header's.
                <Button
                  variant="ghost"
                  size="sm"
                  className="-me-3.25 text-primary"
                />
              }
            >
              {doneLabel}
            </BottomSheetClose>
          </BottomSheetHeader>
          <BottomSheetBody className={cn("items-center", contentClassName)}>
            {children}
          </BottomSheetBody>
        </BottomSheetContent>
      </BottomSheet>
    );
  }
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger render={trigger}>{icon}</PopoverTrigger>
      <PopoverContent
        anchor={anchor ?? undefined}
        align="start"
        sideOffset={6}
        glass={glass}
        frosted={frosted}
        // Sized like Select: never narrower than the field, and concentric
        // with the 16px selection band 6px inside it.
        className={cn(
          "w-max min-w-(--anchor-width) max-w-(--available-width) rounded-[calc(var(--radius-2xl)+--spacing(1.5))] p-0",
          contentClassName,
        )}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

const rowHeight = 32;
// The frame is the panel: columns drop their own ring, fill and band, share
// the frame's selection band, and show focus on their own row of it. Rows
// keep a slim inset, so a date and a time fit one row on a phone. Columns
// start at the width their labels need; a row with a date grows them to
// fill it, while a time alone stays together in the middle, as on iOS.
const wheelColumn = cn(
  "w-auto shrink-0 rounded-none bg-transparent ring-0 focus-visible:outline-none [&_[data-wheel-band-item]]:px-1 [&_[data-wheel-item]]:px-1",
  "*:data-[slot=wheel-picker-band]:bg-transparent focus-visible:*:data-[slot=wheel-picker-band]:ring-2 focus-visible:*:data-[slot=wheel-picker-band]:ring-ring/50",
);

/** Wheel columns side by side on one selection band, fading at the ends. */
function WheelsFrame({
  slot,
  className,
  children,
  ...aria
}: {
  slot: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: Wheels share one label as a group, not a fieldset.
    <div
      role="group"
      data-slot={slot}
      className={cn(
        "relative isolate flex items-center justify-center overflow-hidden px-1.5 [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]",
        className,
      )}
      {...aria}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-1 h-8 -translate-y-1/2 rounded-2xl bg-foreground/5"
      />
      {children}
    </div>
  );
}

interface DateColumnsOptions {
  /** Shows today until a day is picked. */
  value: Date | undefined;
  /** Receives the date with its time kept, moved into `min`–`max`. */
  onValueChange: (value: Date) => void;
  locale: string | undefined;
  labels: DateTimeLabels;
  min?: Date;
  max?: Date;
  disabled?: boolean;
}

const yearsBefore = 100;
const yearsAfter = 50;

/** Year, month and day columns in the locale's order, with its names. */
function useDateColumns({
  value,
  onValueChange,
  locale,
  labels,
  min,
  max,
  disabled,
}: DateColumnsOptions) {
  const shown = value ?? startOfToday();
  const year = shown.getFullYear();
  const month = shown.getMonth() + 1;
  const names = useMemo(
    () => ({
      order: dateTimeLayout(locale, {
        date: true,
        time: false,
        hourCycle: "h23",
      }).flatMap((item) =>
        item.type === "year" || item.type === "month" || item.type === "day"
          ? [item.type]
          : [],
      ),
      year: new Intl.DateTimeFormat(locale, { year: "numeric" }),
      month: new Intl.DateTimeFormat(locale, { month: "short" }),
      day: new Intl.DateTimeFormat(locale, { day: "numeric" }),
    }),
    [locale],
  );
  const thisYear = new Date().getFullYear();
  const first = Math.min(min?.getFullYear() ?? thisYear - yearsBefore, year);
  const last = Math.max(max?.getFullYear() ?? thisYear + yearsAfter, year);
  const years = useMemo(
    () =>
      Array.from({ length: last - first + 1 }, (_, index) => ({
        value: String(first + index),
        label: names.year.format(monthStart(first + index, 1)),
      })),
    [first, last, names],
  );
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: String(index + 1),
        label: names.month.format(monthStart(2000, index + 1)),
      })),
    [names],
  );
  const days = Array.from({ length: daysInMonth(year, month) }, (_, index) => ({
    value: String(index + 1),
    label: names.day.format(new Date(2000, 0, index + 1)),
  }));
  const set = (parts: DateTimeParts) =>
    onValueChange(
      clampDate(dateFromParts({ ...partsFromDate(shown), ...parts }), min, max),
    );
  const columns = {
    year: (
      <WheelPicker
        key="year"
        itemHeight={rowHeight}
        className={cn(wheelColumn, "grow basis-16")}
        disabled={disabled}
        aria-label={labels.year}
        options={years}
        value={String(year)}
        onValueChange={(next) => set({ year: +next })}
      />
    ),
    month: (
      <WheelPicker
        key="month"
        itemHeight={rowHeight}
        className={cn(wheelColumn, "grow basis-12")}
        disabled={disabled}
        aria-label={labels.month}
        options={months}
        value={String(month)}
        onValueChange={(next) => set({ month: +next })}
      />
    ),
    day: (
      <WheelPicker
        key="day"
        itemHeight={rowHeight}
        className={cn(wheelColumn, "grow basis-11")}
        disabled={disabled}
        aria-label={labels.day}
        options={days}
        value={String(shown.getDate())}
        onValueChange={(next) => set({ day: +next })}
      />
    ),
  };
  return names.order.map((type) => columns[type]);
}

interface TimeColumnsOptions {
  value: DateTimeParts | undefined;
  onValueChange: (value: DateTimeParts) => void;
  hourCycle: HourCycle;
  locale: string | undefined;
  labels: DateTimeLabels;
  seconds?: boolean;
  step?: number;
  /** Visible rows; WheelPicker's default when unset. */
  rows?: number;
  /** Grows the columns to fill the row, beside a date's. */
  fill?: boolean;
  disabled?: boolean;
}

/** Hour, minute and optional second and AM/PM columns. */
function useTimeColumns({
  value,
  onValueChange,
  hourCycle,
  locale,
  labels,
  seconds,
  step = 1,
  rows,
  fill,
  disabled,
}: TimeColumnsOptions) {
  const periods = useMemo(() => dayPeriodNames(locale), [locale]);
  const hour = value?.hour ?? 0;
  const minuteSize = Math.max(1, Math.floor(step));
  const minute = Math.floor((value?.minute ?? 0) / minuteSize) * minuteSize;
  const twelve = hourCycle === "h12";
  const hours = twelve
    ? Array.from({ length: 12 }, (_, index) =>
        String(index + 1).padStart(2, "0"),
      )
    : timeOptions(1, 24);
  const set = (next: DateTimeParts) =>
    onValueChange({
      hour,
      minute: value?.minute ?? 0,
      second: value?.second ?? 0,
      ...next,
    });
  const grow = fill && "grow";
  const column = {
    itemHeight: rowHeight,
    visibleCount: rows,
    className: cn(wheelColumn, grow, "basis-10"),
    disabled,
  };
  const colon = (key: string) => (
    <span key={key} aria-hidden="true" className="-mx-0.5 font-medium text-sm">
      :
    </span>
  );
  return [
    <WheelPicker
      key="hour"
      {...column}
      aria-label={labels.hour}
      options={hours}
      value={String(twelve ? hour % 12 || 12 : hour).padStart(2, "0")}
      onValueChange={(next) => {
        const number = +next;
        set({
          hour: twelve ? (number % 12) + (hour >= 12 ? 12 : 0) : number,
        });
      }}
    />,
    colon("hour-minute"),
    <WheelPicker
      key="minute"
      {...column}
      aria-label={labels.minute}
      options={timeOptions(minuteSize)}
      value={String(minute).padStart(2, "0")}
      onValueChange={(next) => set({ minute: +next })}
    />,
    seconds && colon("minute-second"),
    seconds && (
      <WheelPicker
        key="second"
        {...column}
        aria-label={labels.second}
        options={timeOptions()}
        value={String(value?.second ?? 0).padStart(2, "0")}
        onValueChange={(next) => set({ second: +next })}
      />
    ),
    twelve && (
      <WheelPicker
        key="period"
        {...column}
        className={cn(wheelColumn, grow, "ms-1 basis-12")}
        aria-label={labels.dayPeriod}
        options={[
          { label: periods[0], value: "am" },
          { label: periods[1], value: "pm" },
        ]}
        value={hour < 12 ? "am" : "pm"}
        onValueChange={(next) =>
          set({ hour: (hour % 12) + (next === "pm" ? 12 : 0) })
        }
      />
    ),
  ];
}

export interface TimeWheelsProps extends TimeColumnsOptions {
  className?: string;
  "aria-label"?: string;
}

/** Hour, minute and optional second and AM/PM wheels side by side. */
export function TimeWheels({
  className,
  "aria-label": label,
  ...options
}: TimeWheelsProps) {
  return (
    <WheelsFrame slot="time-wheels" className={className} aria-label={label}>
      {useTimeColumns(options)}
    </WheelsFrame>
  );
}

export interface DateTimeWheelsProps extends DateColumnsOptions {
  /** Adds time columns after the date's. */
  time?: Pick<TimeColumnsOptions, "hourCycle" | "seconds" | "step">;
  className?: string;
  "aria-label"?: string;
}

/**
 * A phone's date picker: year, month and day wheels, then the time's on the
 * same row and band, as on iOS. Seconds with AM/PM outgrow a phone's row, so
 * that time takes a row of its own.
 */
export function DateTimeWheels({
  time,
  className,
  "aria-label": label,
  ...date
}: DateTimeWheelsProps) {
  const shown = date.value;
  const ownRow = Boolean(time?.seconds && time.hourCycle === "h12");
  const dateColumns = useDateColumns(date);
  const timeColumns = useTimeColumns({
    hourCycle: "h23",
    ...time,
    fill: !ownRow,
    value: shown && partsFromDate(shown),
    onValueChange: (parts) =>
      date.onValueChange(
        clampDate(
          dateFromParts({
            ...partsFromDate(shown ?? startOfToday()),
            ...parts,
          }),
          date.min,
          date.max,
        ),
      ),
    locale: date.locale,
    labels: date.labels,
    disabled: date.disabled,
  });
  if (!time) {
    return (
      <WheelsFrame slot="date-wheels" className={className} aria-label={label}>
        {dateColumns}
      </WheelsFrame>
    );
  }
  if (ownRow) {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        <WheelsFrame slot="date-wheels" aria-label={label}>
          {dateColumns}
        </WheelsFrame>
        <WheelsFrame slot="time-wheels" aria-label={date.labels.chooseTime}>
          {timeColumns}
        </WheelsFrame>
      </div>
    );
  }
  return (
    <WheelsFrame
      slot="date-time-wheels"
      className={cn("gap-0", className)}
      aria-label={label}
    >
      {dateColumns}
      <span aria-hidden="true" className="w-3 shrink-0" />
      {timeColumns}
    </WheelsFrame>
  );
}
