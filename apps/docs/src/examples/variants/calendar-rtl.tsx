"use client";

import { Calendar } from "@workspace/ui/components/calendar";
import * as React from "react";
import { arSA, he } from "react-day-picker/locale";
import { type Translations, useTranslation } from "./support";

const translations: Translations = {
  en: {
    dir: "ltr",
    values: {},
  },
  ar: {
    dir: "rtl",
    values: {},
  },
  he: {
    dir: "rtl",
    values: {},
  },
};

const locales = {
  ar: arSA,
  he: he,
} as const;

export function CalendarRtl() {
  const { dir, language } = useTranslation(translations, "ar");
  const [date, setDate] = React.useState<Date | undefined>(
    new Date(2025, 5, 12),
  );

  return (
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      className="rounded-lg border [--cell-size:--spacing(9)]"
      captionLayout="dropdown"
      dir={dir}
      locale={
        dir === "rtl" ? locales[language as keyof typeof locales] : undefined
      }
    />
  );
}

export default CalendarRtl;
