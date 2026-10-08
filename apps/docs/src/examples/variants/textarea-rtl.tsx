"use client";

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Textarea } from "@workspace/ui/components/textarea";
import { useId as usePreviewId } from "react";
import { type Translations, useTranslation } from "./support";

const translations: Translations = {
  en: {
    dir: "ltr",
    values: {
      label: "Feedback",
      placeholder: "Your feedback helps us improve...",
      description: "Share your thoughts about our service.",
    },
  },
  ar: {
    dir: "rtl",
    values: {
      label: "التعليقات",
      placeholder: "تعليقاتك تساعدنا على التحسين...",
      description: "شاركنا أفكارك حول خدمتنا.",
    },
  },
  he: {
    dir: "rtl",
    values: {
      label: "משוב",
      placeholder: "המשוב שלך עוזר לנו להשתפר...",
      description: "שתף את מחשבותיך על השירות שלנו.",
    },
  },
};

export default function TextareaRtl() {
  const previewId = usePreviewId();

  const { dir, t } = useTranslation(translations, "ar");

  return (
    <Field className="w-full max-w-xs" dir={dir}>
      <FieldLabel htmlFor={`${previewId}-feedback`} dir={dir}>
        {t.label}
      </FieldLabel>
      <Textarea
        id={`${previewId}-feedback`}
        placeholder={t.placeholder}
        dir={dir}
        rows={4}
      />
      <FieldDescription dir={dir}>{t.description}</FieldDescription>
    </Field>
  );
}
