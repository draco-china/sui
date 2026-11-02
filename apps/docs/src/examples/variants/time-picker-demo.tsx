"use client";

import { TimePicker } from "@workspace/ui/components/time-picker";
import { useState } from "react";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [time, setTime] = useState<string | undefined>("08:30");
  return (
    <div className="flex w-44 flex-col gap-2">
      <TimePicker
        aria-label={zh ? "闹钟" : "Alarm"}
        locale={locale}
        value={time}
        onValueChange={setTime}
      />
      <p className="text-muted-foreground text-sm" aria-live="polite">
        value = {JSON.stringify(time)}
      </p>
    </div>
  );
}
