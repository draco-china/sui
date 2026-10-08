import { Checkbox } from "@workspace/ui/components/checkbox";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { useId as usePreviewId } from "react";

export function CheckboxBasic() {
  const previewId = usePreviewId();

  return (
    <FieldGroup className="mx-auto w-56">
      <Field orientation="horizontal">
        <Checkbox
          id={`${previewId}-terms-checkbox-basic`}
          name="terms-checkbox-basic"
        />
        <FieldLabel htmlFor={`${previewId}-terms-checkbox-basic`}>
          Accept terms and conditions
        </FieldLabel>
      </Field>
    </FieldGroup>
  );
}

export default CheckboxBasic;
