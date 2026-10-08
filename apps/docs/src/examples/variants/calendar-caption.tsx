"use client";

import { Calendar } from "@workspace/ui/components/calendar";

export function CalendarCaption() {
  return (
    <Calendar
      mode="single"
      captionLayout="dropdown"
      className="rounded-lg border"
    />
  );
}

export default CalendarCaption;
