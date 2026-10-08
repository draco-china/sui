import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useId as usePreviewId } from "react";

export function InputRequired() {
  const previewId = usePreviewId();

  return (
    <Field>
      <FieldLabel htmlFor={`${previewId}-input-required`}>
        Required Field <span className="text-destructive">*</span>
      </FieldLabel>
      <Input
        id={`${previewId}-input-required`}
        placeholder="This field is required"
        required
      />
      <FieldDescription>This field must be filled out.</FieldDescription>
    </Field>
  );
}

export default InputRequired;
