import { Field, FieldLabel } from "@workspace/ui/components/field";
import { Switch } from "@workspace/ui/components/switch";
import { useId as usePreviewId } from "react";

export default function FieldSwitch() {
  const previewId = usePreviewId();

  return (
    <Field orientation="horizontal" className="w-fit">
      <FieldLabel htmlFor={`${previewId}-2fa`}>
        Multi-factor authentication
      </FieldLabel>
      <Switch id={`${previewId}-2fa`} />
    </Field>
  );
}
