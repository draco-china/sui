"use client";

import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Card, CardContent, CardFooter } from "@workspace/ui/components/card";
import { addDays } from "date-fns";
import * as React from "react";

export function CalendarWithPresets() {
  const [date, setDate] = React.useState<Date | undefined>(
    new Date(2025, 1, 12),
  );
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    new Date(
      new Date(2025, 5, 12).getFullYear(),
      new Date(2025, 5, 12).getMonth(),
      1,
    ),
  );

  return (
    <Card className="mx-auto w-fit max-w-[300px]" size="sm">
      <CardContent>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          fixedWeeks
          className="p-0 [--cell-size:--spacing(9.5)]"
        />
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t">
        {[
          { label: "Today", value: 0 },
          { label: "Tomorrow", value: 1 },
          { label: "In 3 days", value: 3 },
          { label: "In a week", value: 7 },
          { label: "In 2 weeks", value: 14 },
        ].map((preset) => (
          <Button
            key={preset.value}
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              const newDate = addDays(new Date(2025, 5, 12), preset.value);
              setDate(newDate);
              setCurrentMonth(
                new Date(newDate.getFullYear(), newDate.getMonth(), 1),
              );
            }}
          >
            {preset.label}
          </Button>
        ))}
      </CardFooter>
    </Card>
  );
}

export default CalendarWithPresets;
