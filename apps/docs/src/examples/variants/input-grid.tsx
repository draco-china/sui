import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useId as usePreviewId } from "react";

export function InputGrid() {
  const previewId = usePreviewId();

  return (
    <FieldGroup className="grid max-w-sm grid-cols-2">
      <Field>
        <FieldLabel htmlFor={`${previewId}-first-name`}>First Name</FieldLabel>
        <Input id={`${previewId}-first-name`} placeholder="Jordan" />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${previewId}-last-name`}>Last Name</FieldLabel>
        <Input id={`${previewId}-last-name`} placeholder="Lee" />
      </Field>
    </FieldGroup>
  );
}

export default InputGrid;
