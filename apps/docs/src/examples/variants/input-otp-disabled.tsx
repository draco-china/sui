import { Field, FieldLabel } from "@workspace/ui/components/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp";
import { useId } from "react";

export function InputOTPDisabled() {
  const id = useId();
  return (
    <Field className="w-fit">
      <FieldLabel htmlFor={id}>Disabled verification code</FieldLabel>
      <InputOTP id={id} length={6} disabled value="123456">
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

export default InputOTPDisabled;
