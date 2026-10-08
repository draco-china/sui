"use client";

import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import * as React from "react";

export function InputOTPInvalid() {
  const [value, setValue] = React.useState("000000");
  const id = React.useId();

  return (
    <Field data-invalid className="w-fit">
      <FieldLabel htmlFor={id}>Verification code</FieldLabel>
      <InputOTP id={id} length={6} value={value} onValueChange={setValue}>
        <InputOTPGroup>
          <InputOTPSlot aria-invalid aria-describedby={`${id}-error`} />
          <InputOTPSlot aria-invalid aria-describedby={`${id}-error`} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot aria-invalid aria-describedby={`${id}-error`} />
          <InputOTPSlot aria-invalid aria-describedby={`${id}-error`} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot aria-invalid aria-describedby={`${id}-error`} />
          <InputOTPSlot aria-invalid aria-describedby={`${id}-error`} />
        </InputOTPGroup>
      </InputOTP>
      <FieldDescription id={`${id}-error`}>
        The verification code is invalid. Try another code.
      </FieldDescription>
    </Field>
  );
}

export default InputOTPInvalid;
