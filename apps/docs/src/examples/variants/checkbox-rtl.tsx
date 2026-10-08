"use client";

import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@workspace/ui/components/field";
import { Label } from "@workspace/ui/components/label";
import { useId as usePreviewId } from "react";
import { type Translations, useTranslation } from "./support";

const translations: Translations = {
  en: {
    dir: "ltr",
    values: {
      acceptTerms: "Accept terms and conditions",
      acceptTermsDescription:
        "By clicking this checkbox, you agree to the terms.",
      enableNotifications: "Enable notifications",
      enableNotificationsDescription:
        "You can enable or disable notifications at any time.",
    },
  },
  ar: {
    dir: "rtl",
    values: {
      acceptTerms: "قبول الشروط والأحكام",
      acceptTermsDescription: "بالنقر على هذا المربع، فإنك توافق على الشروط.",
      enableNotifications: "تفعيل الإشعارات",
      enableNotificationsDescription:
        "يمكنك تفعيل أو إلغاء تفعيل الإشعارات في أي وقت.",
    },
  },
  he: {
    dir: "rtl",
    values: {
      acceptTerms: "קבל תנאים והגבלות",
      acceptTermsDescription:
        "על ידי לחיצה על תיבת הסימון הזו, אתה מסכים לתנאים.",
      enableNotifications: "הפעל התראות",
      enableNotificationsDescription:
        "אתה יכול להפעיל או להשבית התראות בכל עת.",
    },
  },
};

export function CheckboxRtl() {
  const previewId = usePreviewId();

  const { dir, t } = useTranslation(translations, "ar");

  return (
    <FieldGroup className="max-w-sm" dir={dir}>
      <Field orientation="horizontal">
        <Checkbox
          id={`${previewId}-terms-checkbox-rtl`}
          name="terms-checkbox"
        />
        <Label htmlFor={`${previewId}-terms-checkbox-rtl`}>
          {t.acceptTerms}
        </Label>
      </Field>
      <Field orientation="horizontal">
        <Checkbox
          id={`${previewId}-terms-checkbox-2-rtl`}
          name="terms-checkbox-2"
          defaultChecked
        />
        <FieldContent>
          <FieldLabel htmlFor={`${previewId}-terms-checkbox-2-rtl`}>
            {t.acceptTerms}
          </FieldLabel>
          <FieldDescription>{t.acceptTermsDescription}</FieldDescription>
        </FieldContent>
      </Field>
      <Field orientation="horizontal" data-disabled>
        <Checkbox
          id={`${previewId}-toggle-checkbox-rtl`}
          name="toggle-checkbox"
          disabled
        />
        <FieldLabel htmlFor={`${previewId}-toggle-checkbox-rtl`}>
          {t.enableNotifications}
        </FieldLabel>
      </Field>
      <FieldLabel>
        <Field orientation="horizontal">
          <Checkbox
            id={`${previewId}-toggle-checkbox-2`}
            name="toggle-checkbox-2"
          />
          <FieldContent>
            <FieldTitle>{t.enableNotifications}</FieldTitle>
            <FieldDescription>
              {t.enableNotificationsDescription}
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>
    </FieldGroup>
  );
}

export default CheckboxRtl;
