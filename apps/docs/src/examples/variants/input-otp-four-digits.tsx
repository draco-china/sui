"use client";

import { Field, FieldLabel } from "@workspace/ui/components/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { useId } from "react";

export function InputOTPFourDigits() {
  const id = useId();
  return (
    <Field className="w-fit">
      <FieldLabel htmlFor={id}>Four-digit PIN</FieldLabel>
      <InputOTP id={id} length={4} validationType="numeric">
        <InputOTPGroup>
          <InputOTPSlot />
          <InputOTPSlot />
          <InputOTPSlot />
          <InputOTPSlot />
        </InputOTPGroup>
      </InputOTP>
    </Field>
  );
}

export default InputOTPFourDigits;
