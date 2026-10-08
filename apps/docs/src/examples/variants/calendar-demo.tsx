"use client";

import { Calendar } from "@workspace/ui/components/calendar";
import * as React from "react";

export default function CalendarDemo() {
  const [date, setDate] = React.useState<Date | undefined>(
    new Date(2025, 5, 12),
  );

  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      className="rounded-lg border"
      captionLayout="dropdown"
    />
  );
}
