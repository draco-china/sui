import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Switch } from "@workspace/ui/components/switch";
import { useId as usePreviewId } from "react";

export function SwitchSizes() {
  const previewId = usePreviewId();

  return (
    <FieldGroup className="w-full max-w-[10rem]">
      <Field orientation="horizontal">
        <Switch id={`${previewId}-switch-size-sm`} size="sm" />
        <FieldLabel htmlFor={`${previewId}-switch-size-sm`}>Small</FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <Switch id={`${previewId}-switch-size-default`} size="default" />
        <FieldLabel htmlFor={`${previewId}-switch-size-default`}>
          Default
        </FieldLabel>
      </Field>
    </FieldGroup>
  );
}

export default SwitchSizes;
