"use client";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group";
import { Loader } from "@workspace/ui/components/loader";
import { Search } from "lucide-react";
import { useId as usePreviewId } from "react";
import { type Translations, useTranslation } from "./support";

const translations: Translations = {
  en: {
    dir: "ltr",
    values: {
      placeholder: "Search...",
      results: "12 results",
      searching: "Searching...",
      saving: "Saving...",
      savingChanges: "Saving changes...",
      textareaLabel: "Textarea",
      textareaPlaceholder: "Write a comment...",
      characterCount: "0/280",
      post: "Post",
      textareaDescription: "Footer positioned below the textarea.",
    },
  },
  ar: {
    dir: "rtl",
    values: {
      placeholder: "بحث...",
      results: "١٢ نتيجة",
      searching: "جاري البحث...",
      saving: "جاري الحفظ...",
      savingChanges: "جاري حفظ التغييرات...",
      textareaLabel: "منطقة النص",
      textareaPlaceholder: "اكتب تعليقًا...",
      characterCount: "٠/٢٨٠",
      post: "نشر",
      textareaDescription: "تذييل موضع أسفل منطقة النص.",
    },
  },
  he: {
    dir: "rtl",
    values: {
      placeholder: "חפש...",
      results: "12 תוצאות",
      searching: "מחפש...",
      saving: "שומר...",
      savingChanges: "שומר שינויים...",
      textareaLabel: "אזור טקסט",
      textareaPlaceholder: "כתוב תגובה...",
      characterCount: "0/280",
      post: "פרסם",
      textareaDescription: "כותרת תחתונה ממוקמת מתחת לאזור הטקסט.",
    },
  },
};

export function InputGroupRtl() {
  const previewId = usePreviewId();

  const { t } = useTranslation(translations, "ar");

  return (
    <div className="grid w-full max-w-sm gap-6">
      <InputGroup className="max-w-xs">
        <InputGroupInput placeholder={t.placeholder} />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">{t.results}</InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder={t.searching} />
        <InputGroupAddon align="inline-end">
          <Loader size="sm" />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder={t.savingChanges} />
        <InputGroupAddon align="inline-end">
          <InputGroupText>{t.saving}</InputGroupText>
          <Loader size="sm" />
        </InputGroupAddon>
      </InputGroup>
      <FieldGroup className="max-w-sm">
        <Field>
          <FieldLabel htmlFor={`${previewId}-rtl-textarea`}>
            {t.textareaLabel}
          </FieldLabel>
          <InputGroup>
            <InputGroupTextarea
              id={`${previewId}-rtl-textarea`}
              placeholder={t.textareaPlaceholder}
            />
            <InputGroupAddon align="block-end">
              <InputGroupText>{t.characterCount}</InputGroupText>
              <InputGroupButton variant="default" size="sm" className="ms-auto">
                {t.post}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription>{t.textareaDescription}</FieldDescription>
        </Field>
      </FieldGroup>
    </div>
  );
}

export default InputGroupRtl;
