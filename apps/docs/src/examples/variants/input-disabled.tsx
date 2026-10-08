import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useId as usePreviewId } from "react";

export function InputDisabled() {
  const previewId = usePreviewId();

  return (
    <Field data-disabled>
      <FieldLabel htmlFor={`${previewId}-input-demo-disabled`}>
        Email
      </FieldLabel>
      <Input
        id={`${previewId}-input-demo-disabled`}
        type="email"
        placeholder="Email"
        disabled
      />
      <FieldDescription>This field is currently disabled.</FieldDescription>
    </Field>
  );
}

export default InputDisabled;
