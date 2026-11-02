"use client";

import { TimePicker } from "@workspace/ui/components/time-picker";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="flex w-48 flex-col gap-4">
      <TimePicker
        seconds
        aria-label={zh ? "精确到秒" : "With seconds"}
        locale={locale}
        defaultValue="12:00:30"
      />
      <TimePicker
        hourCycle="h12"
        step={5}
        aria-label={zh ? "12 小时制" : "12-hour clock"}
        locale={locale}
        defaultValue="19:45"
      />
      <TimePicker
        hourCycle="h23"
        aria-label={zh ? "24 小时制" : "24-hour clock"}
        locale={locale}
      />
    </div>
  );
}
