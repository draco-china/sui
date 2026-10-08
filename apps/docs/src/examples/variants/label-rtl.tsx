"use client";

import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { useId as usePreviewId } from "react";
import { type Translations, useTranslation } from "./support";

const translations: Translations = {
  en: {
    dir: "ltr",
    values: {
      label: "Accept terms and conditions",
    },
  },
  ar: {
    dir: "rtl",
    values: {
      label: "قبول الشروط والأحكام",
    },
  },
  he: {
    dir: "rtl",
    values: {
      label: "קבל תנאים והגבלות",
    },
  },
};

export function LabelRtl() {
  const previewId = usePreviewId();

  const { dir, t } = useTranslation(translations, "ar");

  return (
    <div className="flex gap-2" dir={dir}>
      <Checkbox id={`${previewId}-terms-rtl`} dir={dir} />
      <Label htmlFor={`${previewId}-terms-rtl`} dir={dir}>
        {t.label}
      </Label>
    </div>
  );
}

export default LabelRtl;
