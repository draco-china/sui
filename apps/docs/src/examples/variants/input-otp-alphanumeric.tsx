"use client";

import { Field, FieldLabel } from "@workspace/ui/components/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { useId } from "react";

export function InputOTPAlphanumeric() {
  const id = useId();
  return (
    <Field className="w-fit">
      <FieldLabel htmlFor={id}>Alphanumeric verification code</FieldLabel>
      <InputOTP id={id} length={6} validationType="alphanumeric">
        <InputOTPGroup>
          <InputOTPSlot />
          <InputOTPSlot />
          <InputOTPSlot />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot />
          <InputOTPSlot />
          <InputOTPSlot />
        </InputOTPGroup>
      </InputOTP>
    </Field>
  );
}

export default InputOTPAlphanumeric;
