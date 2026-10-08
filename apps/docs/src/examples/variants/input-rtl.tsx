"use client";

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useId as usePreviewId } from "react";
import { type Translations, useTranslation } from "./support";

const translations: Translations = {
  en: {
    dir: "ltr",
    values: {
      apiKey: "API Key",
      placeholder: "sk-...",
      description: "Your API key is encrypted and stored securely.",
    },
  },
  ar: {
    dir: "rtl",
    values: {
      apiKey: "مفتاح API",
      placeholder: "sk-...",
      description: "مفتاح API الخاص بك مشفر ومخزن بأمان.",
    },
  },
  he: {
    dir: "rtl",
    values: {
      apiKey: "מפתח API",
      placeholder: "sk-...",
      description: "מפתח ה-API שלך מוצפן ונשמר בצורה מאובטחת.",
    },
  },
};

export function InputRtl() {
  const previewId = usePreviewId();

  const { dir, t } = useTranslation(translations, "ar");

  return (
    <Field dir={dir}>
      <FieldLabel htmlFor={`${previewId}-input-rtl-api-key`}>
        {t.apiKey}
      </FieldLabel>
      <Input
        id={`${previewId}-input-rtl-api-key`}
        type="password"
        placeholder={t.placeholder}
        dir={dir}
      />
      <FieldDescription>{t.description}</FieldDescription>
    </Field>
  );
}

export default InputRtl;
