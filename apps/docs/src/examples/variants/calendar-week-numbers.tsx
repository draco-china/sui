"use client";

import { Calendar } from "@workspace/ui/components/calendar";
import { Card, CardContent } from "@workspace/ui/components/card";
import * as React from "react";

export function CalendarWeekNumbers() {
  const [date, setDate] = React.useState<Date | undefined>(
    new Date(2025, 0, 12),
  );

  return (
    <Card className="mx-auto w-fit p-0">
      <CardContent className="p-0">
        <Calendar
          mode="single"
          defaultMonth={date}
          selected={date}
          onSelect={setDate}
          showWeekNumber
        />
      </CardContent>
    </Card>
  );
}

export default CalendarWeekNumbers;
