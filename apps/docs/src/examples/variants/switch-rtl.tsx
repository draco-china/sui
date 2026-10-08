"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Switch } from "@workspace/ui/components/switch";
import { useId as usePreviewId } from "react";
import { type Translations, useTranslation } from "./support";

const translations: Translations = {
  en: {
    dir: "ltr",
    values: {
      label: "Share across devices",
      description:
        "Focus is shared across devices, and turns off when you leave the app.",
    },
  },
  ar: {
    dir: "rtl",
    values: {
      label: "المشاركة عبر الأجهزة",
      description:
        "يتم مشاركة التركيز عبر الأجهزة، ويتم إيقاف تشغيله عند مغادرة التطبيق.",
    },
  },
  he: {
    dir: "rtl",
    values: {
      label: "שיתוף בין מכשירים",
      description: "המיקוד משותף בין מכשירים, וכבה כשאתה עוזב את האפליקציה.",
    },
  },
};

export function SwitchRtl() {
  const previewId = usePreviewId();

  const { dir, t } = useTranslation(translations, "ar");

  return (
    <Field orientation="horizontal" className="max-w-sm" dir={dir}>
      <FieldContent>
        <FieldLabel htmlFor={`${previewId}-switch-focus-mode-rtl`} dir={dir}>
          {t.label}
        </FieldLabel>
        <FieldDescription dir={dir}>{t.description}</FieldDescription>
      </FieldContent>
      <Switch id={`${previewId}-switch-focus-mode-rtl`} dir={dir} />
    </Field>
  );
}

export default SwitchRtl;
