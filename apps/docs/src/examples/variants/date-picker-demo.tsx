"use client";

import { DatePicker } from "@workspace/ui/components/date-picker";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { useId, useState } from "react";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const id = useId();
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 10, 2));
  return (
    <Field className="w-60">
      <FieldLabel id={`${id}-label`}>
        {zh ? "出发日期" : "Departure"}
      </FieldLabel>
      <DatePicker
        id={id}
        aria-labelledby={`${id}-label`}
        locale={locale}
        value={date}
        onValueChange={setDate}
      />
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {date ? date.toDateString() : zh ? "未选择" : "No date"}
      </p>
    </Field>
  );
}
