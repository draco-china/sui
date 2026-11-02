"use client";

import { Button } from "@workspace/ui/components/button";
import { DatePicker } from "@workspace/ui/components/date-picker";
import { DirectionProvider } from "@workspace/ui/components/direction";
import { useState } from "react";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [submitted, setSubmitted] = useState("");
  return (
    <div className="flex w-64 flex-col gap-4">
      <DatePicker
        disabled
        aria-label={zh ? "已禁用" : "Disabled"}
        locale={locale}
        defaultValue={new Date(2026, 0, 1)}
      />
      <DatePicker
        aria-label={zh ? "超出范围" : "Out of range"}
        locale={locale}
        max={new Date(2025, 11, 31)}
        defaultValue={new Date(2026, 0, 1)}
      />
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(String(new FormData(event.currentTarget).get("due")));
        }}
      >
        <DatePicker
          name="due"
          aria-label={zh ? "截止日期" : "Due date"}
          locale={locale}
        />
        <Button type="submit" variant="outline" className="self-start">
          {zh ? "提交" : "Submit"}
        </Button>
        <output className="text-muted-foreground text-sm">
          due = {JSON.stringify(submitted)}
        </output>
      </form>
      <DirectionProvider direction="rtl">
        <div dir="rtl">
          <DatePicker aria-label="RTL" locale="ar-EG" />
        </div>
      </DirectionProvider>
    </div>
  );
}
