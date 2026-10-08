"use client";

import { Calendar, CalendarDayButton } from "@workspace/ui/components/calendar";
import { Card, CardContent } from "@workspace/ui/components/card";
import { addDays } from "date-fns";
import * as React from "react";
import type { DateRange } from "react-day-picker";

export function CalendarCustomDays() {
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: new Date(2025, 11, 8),
    to: addDays(new Date(2025, 11, 8), 10),
  });

  return (
    <Card className="mx-auto w-fit p-0">
      <CardContent className="p-0">
        <Calendar
          mode="range"
          defaultMonth={range?.from}
          selected={range}
          onSelect={setRange}
          numberOfMonths={1}
          captionLayout="dropdown"
          className="[--cell-size:--spacing(10)] md:[--cell-size:--spacing(12)]"
          formatters={{
            formatMonthDropdown: (date) => {
              return date.toLocaleString("en-US", { month: "long" });
            },
          }}
          components={{
            DayButton: CalendarDayButtonRenderer,
          }}
        />
      </CardContent>
    </Card>
  );
}

export default CalendarCustomDays;

function CalendarDayButtonRenderer({
  children,
  modifiers,
  day,
  ...props
}: React.ComponentProps<typeof CalendarDayButton>) {
  const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;

  return (
    <CalendarDayButton day={day} modifiers={modifiers} {...props}>
      {children}
      {!modifiers.outside && <span>{isWeekend ? "$120" : "$100"}</span>}
    </CalendarDayButton>
  );
}
