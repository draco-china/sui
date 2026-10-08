import { Checkbox } from "@workspace/ui/components/checkbox";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { useId as usePreviewId } from "react";

export function CheckboxInvalid() {
  const previewId = usePreviewId();

  return (
    <FieldGroup className="mx-auto w-56">
      <Field orientation="horizontal" data-invalid>
        <Checkbox
          id={`${previewId}-terms-checkbox-invalid`}
          name="terms-checkbox-invalid"
          aria-invalid
        />
        <FieldLabel htmlFor={`${previewId}-terms-checkbox-invalid`}>
          Accept terms and conditions
        </FieldLabel>
      </Field>
    </FieldGroup>
  );
}

export default CheckboxInvalid;
