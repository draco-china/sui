"use client";

import { DatePicker } from "@workspace/ui/components/date-picker";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <DatePicker
        showTime={{ step: 15 }}
        aria-label={zh ? "会议开始" : "Meeting start"}
        locale={locale}
        defaultValue={new Date(2026, 10, 2, 9, 30)}
      />
      <DatePicker
        mode="range"
        showTime
        aria-label={zh ? "维护窗口" : "Maintenance window"}
        locale={locale}
      />
    </div>
  );
}
