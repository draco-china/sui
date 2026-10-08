"use client";

import { Button } from "@workspace/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { useId as usePreviewId } from "react";
import { type Translations, useTranslation } from "./support";

const translations: Translations = {
  en: {
    dir: "ltr",
    values: {
      open: "Open",
      editProfile: "Edit profile",
      description:
        "Make changes to your profile here. Click save when you're done.",
      name: "Name",
      username: "Username",
      save: "Save changes",
      close: "Close",
    },
  },
  ar: {
    dir: "rtl",
    values: {
      open: "فتح",
      editProfile: "تعديل الملف الشخصي",
      description:
        "قم بإجراء تغييرات على ملفك الشخصي هنا. انقر حفظ عند الانتهاء.",
      name: "الاسم",
      username: "اسم المستخدم",
      save: "حفظ التغييرات",
      close: "إغلاق",
    },
  },
  he: {
    dir: "rtl",
    values: {
      open: "פתח",
      editProfile: "עריכת פרופיל",
      description: "בצע שינויים בפרופיל שלך כאן. לחץ שמור כשתסיים.",
      name: "שם",
      username: "שם משתמש",
      save: "שמור שינויים",
      close: "סגור",
    },
  },
};

export function SheetRtl() {
  const previewId = usePreviewId();

  const { dir, t, language } = useTranslation(translations, "ar");

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" />}>
        {t.open}
      </SheetTrigger>
      <SheetContent
        dir={dir}
        side={dir === "rtl" ? "left" : "right"}
        data-lang={dir === "rtl" ? language : undefined}
      >
        <SheetHeader>
          <SheetTitle>{t.editProfile}</SheetTitle>
          <SheetDescription>{t.description}</SheetDescription>
        </SheetHeader>
        <FieldGroup className="px-4">
          <Field>
            <FieldLabel htmlFor={`${previewId}-sheet-rtl-name`}>
              {t.name}
            </FieldLabel>
            <Input
              id={`${previewId}-sheet-rtl-name`}
              defaultValue="Pedro Duarte"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${previewId}-sheet-rtl-username`}>
              {t.username}
            </FieldLabel>
            <Input
              id={`${previewId}-sheet-rtl-username`}
              defaultValue="peduarte"
            />
          </Field>
        </FieldGroup>
        <SheetFooter>
          <Button type="submit">{t.save}</Button>
          <SheetClose render={<Button variant="outline" />}>
            {t.close}
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default SheetRtl;
