"use client";

import {
  DatePicker,
  type DateRange,
} from "@workspace/ui/components/date-picker";
import { addDays, startOfMonth } from "date-fns";
import { useState } from "react";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [range, setRange] = useState<DateRange | undefined>();
  const today = () => new Date(new Date().setHours(0, 0, 0, 0));
  return (
    <DatePicker
      mode="range"
      className="w-80"
      aria-label={zh ? "入住日期" : "Stay"}
      locale={locale}
      value={range}
      onValueChange={setRange}
      min={today()}
      presets={[
        {
          label: zh ? "未来 7 天" : "Next 7 days",
          value: () => ({ from: today(), to: addDays(today(), 6) }),
        },
        {
          label: zh ? "未来 30 天" : "Next 30 days",
          value: () => ({ from: today(), to: addDays(today(), 29) }),
        },
        {
          label: zh ? "下个月起" : "From next month",
          value: () => ({
            from: startOfMonth(addDays(startOfMonth(today()), 32)),
            to: undefined,
          }),
        },
      ]}
    />
  );
}
