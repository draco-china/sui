import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useId as usePreviewId } from "react";

export function InputInvalid() {
  const previewId = usePreviewId();

  return (
    <Field data-invalid>
      <FieldLabel htmlFor={`${previewId}-input-invalid`}>
        Invalid Input
      </FieldLabel>
      <Input
        id={`${previewId}-input-invalid`}
        placeholder="Error"
        aria-invalid
      />
      <FieldDescription>
        This field contains validation errors.
      </FieldDescription>
    </Field>
  );
}

export default InputInvalid;
