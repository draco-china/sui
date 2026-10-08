import { Field, FieldLabel } from "@workspace/ui/components/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { useId } from "react";

export default function InputOTPWithSeparator() {
  const id = useId();
  return (
    <Field className="w-fit">
      <FieldLabel htmlFor={id}>Verification code</FieldLabel>
      <InputOTP id={id} length={6}>
        <InputOTPGroup>
          <InputOTPSlot />
          <InputOTPSlot />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot />
          <InputOTPSlot />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot />
          <InputOTPSlot />
        </InputOTPGroup>
      </InputOTP>
    </Field>
  );
}
