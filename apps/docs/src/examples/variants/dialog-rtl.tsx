"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Field, FieldGroup } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { useId as usePreviewId } from "react";
import { type Translations, useTranslation } from "./support";

const translations: Translations = {
  en: {
    dir: "ltr",
    values: {
      openDialog: "Open Dialog",
      editProfile: "Edit profile",
      description:
        "Make changes to your profile here. Click save when you're done.",
      name: "Name",
      username: "Username",
      cancel: "Cancel",
      saveChanges: "Save changes",
    },
  },
  ar: {
    dir: "rtl",
    values: {
      openDialog: "فتح الحوار",
      editProfile: "تعديل الملف الشخصي",
      description:
        "قم بإجراء تغييرات على ملفك الشخصي هنا. انقر فوق حفظ عند الانتهاء.",
      name: "الاسم",
      username: "اسم المستخدم",
      cancel: "إلغاء",
      saveChanges: "حفظ التغييرات",
    },
  },
  he: {
    dir: "rtl",
    values: {
      openDialog: "פתח דיאלוג",
      editProfile: "ערוך פרופיל",
      description: "בצע שינויים בפרופיל שלך כאן. לחץ על שמור כשתסיים.",
      name: "שם",
      username: "שם משתמש",
      cancel: "בטל",
      saveChanges: "שמור שינויים",
    },
  },
};

export function DialogRtl() {
  const previewId = usePreviewId();

  const { dir, t, language } = useTranslation(translations, "ar");

  return (
    <Dialog>
      <form>
        <DialogTrigger render={<Button variant="outline" />}>
          {t.openDialog}
        </DialogTrigger>
        <DialogContent
          className="sm:max-w-sm"
          dir={dir}
          data-lang={dir === "rtl" ? language : undefined}
        >
          <DialogHeader>
            <DialogTitle>{t.editProfile}</DialogTitle>
            <DialogDescription>{t.description}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor={`${previewId}-name-1`}>{t.name}</Label>
              <Input
                id={`${previewId}-name-1`}
                name="name"
                defaultValue="Pedro Duarte"
              />
            </Field>
            <Field>
              <Label htmlFor={`${previewId}-username-1`}>{t.username}</Label>
              <Input
                id={`${previewId}-username-1`}
                name="username"
                defaultValue="@peduarte"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {t.cancel}
            </DialogClose>
            <Button type="submit">{t.saveChanges}</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}

export default DialogRtl;
