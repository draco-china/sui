import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { useId as usePreviewId } from "react";

export function CheckboxDescription() {
  const previewId = usePreviewId();

  return (
    <FieldGroup className="mx-auto w-72">
      <Field orientation="horizontal">
        <Checkbox
          id={`${previewId}-terms-checkbox-desc`}
          name="terms-checkbox-desc"
          defaultChecked
        />
        <FieldContent>
          <FieldLabel htmlFor={`${previewId}-terms-checkbox-desc`}>
            Accept terms and conditions
          </FieldLabel>
          <FieldDescription>
            By clicking this checkbox, you agree to the terms and conditions.
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldGroup>
  );
}

export default CheckboxDescription;
