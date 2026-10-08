"use client";

import { Button, buttonVariants } from "@workspace/ui/components/button";
import { cn } from "cn";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import * as React from "react";
import {
  type DayButton,
  DayPicker,
  getDefaultClassNames,
  type Locale,
} from "react-day-picker";
import { withGlass } from "../lib/glass/context";

const CalendarLocaleContext = React.createContext<Partial<Locale> | undefined>(
  undefined,
);

function CalendarRoot({
  className,
  rootRef,
  ...props
}: React.ComponentProps<
  NonNullable<
    NonNullable<React.ComponentProps<typeof DayPicker>["components"]>["Root"]
  >
>) {
  return (
    <div
      data-slot="calendar"
      ref={rootRef}
      className={cn(className)}
      {...props}
    />
  );
}

function CalendarChevron({
  className,
  orientation,
  ...props
}: React.ComponentProps<
  NonNullable<
    NonNullable<React.ComponentProps<typeof DayPicker>["components"]>["Chevron"]
  >
>) {
  if (orientation === "left")
    return (
      <ChevronLeftIcon
        className={cn("size-4 rtl:rotate-180", className)}
        {...props}
      />
    );
  if (orientation === "right")
    return (
      <ChevronRightIcon
        className={cn("size-4 rtl:rotate-180", className)}
        {...props}
      />
    );
  return <ChevronDownIcon className={cn("size-4", className)} {...props} />;
}

function CalendarWeekNumber({
  children,
  ...props
}: React.ComponentProps<
  NonNullable<
    NonNullable<
      React.ComponentProps<typeof DayPicker>["components"]
    >["WeekNumber"]
  >
>) {
  return (
    <td {...props}>
      <div className="flex size-(--cell-size) items-center justify-center text-center">
        {children}
      </div>
    </td>
  );
}

function CalendarImplementation({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <CalendarLocaleContext value={locale}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn(
          "group/calendar bg-background in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent p-3 [--cell-radius:var(--radius-4xl)] [--cell-size:--spacing(8)]",
          String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
          String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
          className,
        )}
        captionLayout={captionLayout}
        locale={locale}
        formatters={{
          formatMonthDropdown: (date) =>
            date.toLocaleString(locale?.code ?? "en-US", { month: "short" }),
          ...formatters,
        }}
        classNames={{
          root: cn("w-fit", defaultClassNames.root),
          months: cn(
            "relative flex flex-col gap-4 md:flex-row",
            defaultClassNames.months,
          ),
          month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
          nav: cn(
            "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
            defaultClassNames.nav,
          ),
          button_previous: cn(
            buttonVariants({ variant: buttonVariant }),
            "size-(--cell-size) select-none p-0 aria-disabled:opacity-50",
            defaultClassNames.button_previous,
          ),
          button_next: cn(
            buttonVariants({ variant: buttonVariant }),
            "size-(--cell-size) select-none p-0 aria-disabled:opacity-50",
            defaultClassNames.button_next,
          ),
          month_caption: cn(
            "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
            defaultClassNames.month_caption,
          ),
          dropdowns: cn(
            "flex h-(--cell-size) w-full items-center justify-center gap-1.5 font-medium text-sm",
            defaultClassNames.dropdowns,
          ),
          dropdown_root: cn(
            "relative rounded-(--cell-radius)",
            defaultClassNames.dropdown_root,
          ),
          dropdown: cn(
            "absolute inset-0 bg-popover opacity-0",
            defaultClassNames.dropdown,
          ),
          caption_label: cn(
            "select-none font-medium",
            captionLayout === "label"
              ? "text-sm"
              : "flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
            defaultClassNames.caption_label,
          ),
          month_grid: cn(
            "w-full border-collapse",
            defaultClassNames.month_grid,
          ),
          weekdays: cn("flex", defaultClassNames.weekdays),
          weekday: cn(
            "flex-1 select-none rounded-(--cell-radius) font-normal text-[0.8rem] text-muted-foreground",
            defaultClassNames.weekday,
          ),
          week: cn("mt-2 flex w-full", defaultClassNames.week),
          week_number_header: cn(
            "w-(--cell-size) select-none",
            defaultClassNames.week_number_header,
          ),
          week_number: cn(
            "select-none text-[0.8rem] text-muted-foreground",
            defaultClassNames.week_number,
          ),
          day: cn(
            "group/day relative aspect-square h-full w-full select-none rounded-(--cell-radius) p-0 text-center [&:last-child[data-selected=true]_button]:rounded-e-(--cell-radius)",
            props.showWeekNumber
              ? "[&:nth-child(2)[data-selected=true]_button]:rounded-s-(--cell-radius)"
              : "[&:first-child[data-selected=true]_button]:rounded-s-(--cell-radius)",
            defaultClassNames.day,
          ),
          range_start: cn(
            "relative isolate z-0 rounded-s-(--cell-radius) bg-accent after:absolute after:inset-y-0 after:end-0 after:w-4 after:bg-accent",
            defaultClassNames.range_start,
          ),
          range_middle: cn("rounded-none", defaultClassNames.range_middle),
          range_end: cn(
            "relative isolate z-0 rounded-e-(--cell-radius) bg-accent after:absolute after:inset-y-0 after:start-0 after:w-4 after:bg-accent",
            defaultClassNames.range_end,
          ),
          today: cn(
            "rounded-(--cell-radius) bg-accent text-accent-foreground data-[selected=true]:rounded-none",
            defaultClassNames.today,
          ),
          outside: cn(
            "text-muted-foreground aria-selected:text-muted-foreground",
            defaultClassNames.outside,
          ),
          disabled: cn(
            "text-muted-foreground opacity-50",
            defaultClassNames.disabled,
          ),
          hidden: cn("invisible", defaultClassNames.hidden),
          ...classNames,
        }}
        components={{
          Root: CalendarRoot,
          Chevron: CalendarChevron,
          DayButton: CalendarDayButton,
          WeekNumber: CalendarWeekNumber,
          ...components,
        }}
        {...props}
      />
    </CalendarLocaleContext>
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ref: forwardedRef,
  ...props
}: React.ComponentProps<typeof DayButton> & {
  locale?: Partial<Locale>;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  const defaultClassNames = getDefaultClassNames();

  const contextLocale = React.useContext(CalendarLocaleContext);
  const ref = React.useRef<HTMLButtonElement>(null);
  const setRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      ref.current = node;
      if (typeof forwardedRef === "function") return forwardedRef(node);
      if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={setRef}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(
        (locale ?? contextLocale)?.code ?? "en-US",
      )}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 border-0 font-normal leading-none data-[range-end=true]:rounded-(--cell-radius) data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-s-(--cell-radius) data-[range-end=true]:rounded-e-(--cell-radius) data-[range-end=true]:bg-primary data-[range-middle=true]:bg-accent data-[range-start=true]:bg-primary data-[selected-single=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:text-accent-foreground data-[range-start=true]:text-primary-foreground data-[selected-single=true]:text-primary-foreground data-[range-end=true]:hover:bg-primary data-[range-middle=true]:hover:bg-accent data-[range-start=true]:hover:bg-primary data-[selected-single=true]:hover:bg-primary data-[range-end=true]:hover:text-primary-foreground data-[range-middle=true]:hover:text-accent-foreground data-[range-start=true]:hover:text-primary-foreground data-[selected-single=true]:hover:text-primary-foreground group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

const Calendar = withGlass(CalendarImplementation);

export { Calendar, CalendarDayButton };
