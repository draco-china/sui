import { Field, FieldLabel } from "@workspace/ui/components/field";
import { Switch } from "@workspace/ui/components/switch";
import { useId as usePreviewId } from "react";

export function SwitchDisabled() {
  const previewId = usePreviewId();

  return (
    <Field orientation="horizontal" data-disabled className="w-fit">
      <Switch id={`${previewId}-switch-disabled-unchecked`} disabled />
      <FieldLabel htmlFor={`${previewId}-switch-disabled-unchecked`}>
        Disabled
      </FieldLabel>
    </Field>
  );
}

export default SwitchDisabled;
