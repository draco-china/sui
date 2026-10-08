"use client";

import { Field, FieldLabel } from "@workspace/ui/components/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import * as React from "react";

export default function InputOTPControlled() {
  const [value, setValue] = React.useState("");
  const id = React.useId();

  return (
    <Field className="w-fit gap-2">
      <FieldLabel htmlFor={id}>One-time password</FieldLabel>
      <InputOTP id={id} length={6} value={value} onValueChange={setValue}>
        <InputOTPGroup>
          <InputOTPSlot />
          <InputOTPSlot />
          <InputOTPSlot />
          <InputOTPSlot />
          <InputOTPSlot />
          <InputOTPSlot />
        </InputOTPGroup>
      </InputOTP>
      <output className="block text-center text-sm" aria-live="polite">
        {value === "" ? (
          <>Enter your one-time password.</>
        ) : (
          <>You entered: {value}</>
        )}
      </output>
    </Field>
  );
}
