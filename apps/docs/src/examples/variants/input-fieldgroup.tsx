import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useId as usePreviewId } from "react";

export function InputFieldgroup() {
  const previewId = usePreviewId();

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${previewId}-fieldgroup-name`}>Name</FieldLabel>
        <Input id={`${previewId}-fieldgroup-name`} placeholder="Jordan Lee" />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${previewId}-fieldgroup-email`}>Email</FieldLabel>
        <Input
          id={`${previewId}-fieldgroup-email`}
          type="email"
          placeholder="name@example.com"
        />
        <FieldDescription>
          We&apos;ll send updates to this address.
        </FieldDescription>
      </Field>
      <Field orientation="horizontal">
        <Button type="reset" variant="outline">
          Reset
        </Button>
        <Button type="submit">Submit</Button>
      </Field>
    </FieldGroup>
  );
}

export default InputFieldgroup;
