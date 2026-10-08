import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Switch } from "@workspace/ui/components/switch";
import { useId as usePreviewId } from "react";

export function SwitchInvalid() {
  const previewId = usePreviewId();

  return (
    <Field orientation="horizontal" className="max-w-sm" data-invalid>
      <FieldContent>
        <FieldLabel htmlFor={`${previewId}-switch-terms`}>
          Accept terms and conditions
        </FieldLabel>
        <FieldDescription>
          You must accept the terms and conditions to continue.
        </FieldDescription>
      </FieldContent>
      <Switch id={`${previewId}-switch-terms`} aria-invalid />
    </Field>
  );
}

export default SwitchInvalid;
