"use client";

import { Field, FieldLabel } from "@workspace/ui/components/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { useId as usePreviewId } from "react";

export function InputOTPPattern() {
  const previewId = usePreviewId();

  return (
    <Field className="w-fit">
      <FieldLabel htmlFor={`${previewId}-digits-only`}>Digits Only</FieldLabel>
      <InputOTP
        id={`${previewId}-digits-only`}
        length={6}
        validationType="numeric"
      >
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
  );
}

export default InputOTPPattern;
