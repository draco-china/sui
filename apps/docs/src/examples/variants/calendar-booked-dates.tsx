"use client";

import { Calendar } from "@workspace/ui/components/calendar";
import { Card, CardContent } from "@workspace/ui/components/card";
import * as React from "react";

export function CalendarBookedDates() {
  const [date, setDate] = React.useState<Date | undefined>(
    new Date(2025, 0, 6),
  );
  const bookedDates = Array.from(
    { length: 15 },
    (_, i) => new Date(2025, 0, 12 + i),
  );

  return (
    <Card className="mx-auto w-fit p-0">
      <CardContent className="p-0">
        <Calendar
          mode="single"
          defaultMonth={date}
          selected={date}
          onSelect={setDate}
          disabled={bookedDates}
          modifiers={{
            booked: bookedDates,
          }}
          modifiersClassNames={{
            booked: "[&>button]:line-through opacity-100",
          }}
        />
      </CardContent>
    </Card>
  );
}

export default CalendarBookedDates;
