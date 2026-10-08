import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useId as usePreviewId } from "react";

export function InputField() {
  const previewId = usePreviewId();

  return (
    <Field>
      <FieldLabel htmlFor={`${previewId}-input-field-username`}>
        Username
      </FieldLabel>
      <Input
        id={`${previewId}-input-field-username`}
        type="text"
        placeholder="Enter your username"
      />
      <FieldDescription>
        Choose a unique username for your account.
      </FieldDescription>
    </Field>
  );
}

export default InputField;
