import { Checkbox } from "@workspace/ui/components/checkbox";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { useId as usePreviewId } from "react";

export function CheckboxDisabled() {
  const previewId = usePreviewId();

  return (
    <FieldGroup className="mx-auto w-56">
      <Field orientation="horizontal" data-disabled>
        <Checkbox
          id={`${previewId}-toggle-checkbox-disabled`}
          name="toggle-checkbox-disabled"
          disabled
        />
        <FieldLabel htmlFor={`${previewId}-toggle-checkbox-disabled`}>
          Enable notifications
        </FieldLabel>
      </Field>
    </FieldGroup>
  );
}

export default CheckboxDisabled;
