"use client";

import {
  TimePicker,
  type TimeRange,
} from "@workspace/ui/components/time-picker";
import { useState } from "react";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [hours, setHours] = useState<TimeRange | undefined>({
    from: "09:00",
    to: "18:00",
  });
  return (
    <div className="flex w-64 flex-col gap-2">
      <TimePicker
        range
        step={30}
        aria-label={zh ? "营业时间" : "Opening hours"}
        locale={locale}
        value={hours}
        onValueChange={setHours}
      />
      <p className="text-muted-foreground text-sm" aria-live="polite">
        value = {JSON.stringify(hours)}
      </p>
    </div>
  );
}
