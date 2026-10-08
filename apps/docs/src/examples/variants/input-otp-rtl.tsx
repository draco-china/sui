"use client";

import { DirectionProvider } from "@workspace/ui/components/direction";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { useId as usePreviewId } from "react";
import { type Translations, useTranslation } from "./support";

const translations: Translations = {
  en: {
    dir: "ltr",
    values: {
      verificationCode: "Verification code",
    },
  },
  ar: {
    dir: "rtl",
    values: {
      verificationCode: "رمز التحقق",
    },
  },
  he: {
    dir: "rtl",
    values: {
      verificationCode: "קוד אימות",
    },
  },
};

export function InputOTPRtl() {
  const previewId = usePreviewId();

  const { dir, t } = useTranslation(translations, "ar");

  return (
    <DirectionProvider direction={dir}>
      <Field className="mx-auto max-w-xs" dir={dir}>
        <FieldLabel htmlFor={`${previewId}-input-otp-rtl`}>
          {t.verificationCode}
        </FieldLabel>
        <InputOTP length={6} dir={dir} id={`${previewId}-input-otp-rtl`}>
          <InputOTPGroup>
            <InputOTPSlot />
            <InputOTPSlot />
            <InputOTPSlot />
            <InputOTPSlot />
            <InputOTPSlot />
            <InputOTPSlot />
          </InputOTPGroup>
        </InputOTP>
      </Field>
    </DirectionProvider>
  );
}

export default InputOTPRtl;
