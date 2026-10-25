"use client";

import { WheelPicker } from "@workspace/ui/components/wheel-picker";
import { useState } from "react";
import type { ExampleProps } from "../types";

const hours = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const minutes = Array.from({ length: 12 }, (_, index) =>
  String(index * 5).padStart(2, "0"),
);

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("30");
  return (
    <div className="flex max-w-full flex-col items-center gap-6">
      <p className="text-sm tabular-nums" aria-live="polite">
        {zh ? "提醒时间" : "Reminder time"} · {hour}:{minute}
      </p>
      <fieldset
        aria-label={zh ? "提醒时间" : "Reminder time"}
        className="flex max-w-full items-center gap-2"
      >
        <WheelPicker
          className="w-24"
          aria-label={zh ? "小时" : "Hours"}
          options={hours}
          value={hour}
          onValueChange={setHour}
        />
        <span aria-hidden="true" className="text-sm">
          :
        </span>
        <WheelPicker
          className="w-24"
          aria-label={zh ? "分钟" : "Minutes"}
          options={minutes}
          value={minute}
          onValueChange={setMinute}
        />
      </fieldset>
    </div>
  );
}
