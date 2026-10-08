import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useId as usePreviewId } from "react";

export function InputFile() {
  const previewId = usePreviewId();

  return (
    <Field>
      <FieldLabel htmlFor={`${previewId}-picture`}>Picture</FieldLabel>
      <Input id={`${previewId}-picture`} type="file" />
      <FieldDescription>Select a picture to upload.</FieldDescription>
    </Field>
  );
}

export default InputFile;
