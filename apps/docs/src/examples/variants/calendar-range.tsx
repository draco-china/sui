"use client";

import { Calendar } from "@workspace/ui/components/calendar";
import { addDays } from "date-fns";
import * as React from "react";
import type { DateRange } from "react-day-picker";

export function CalendarRange() {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: new Date(2025, 0, 12),
    to: addDays(new Date(2025, 0, 12), 30),
  });

  return (
    <Calendar
      mode="range"
      defaultMonth={dateRange?.from}
      selected={dateRange}
      onSelect={setDateRange}
      numberOfMonths={2}
      className="rounded-lg border"
    />
  );
}

export default CalendarRange;
