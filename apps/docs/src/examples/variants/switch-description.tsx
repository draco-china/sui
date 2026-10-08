import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Switch } from "@workspace/ui/components/switch";
import { useId as usePreviewId } from "react";

export function SwitchDescription() {
  const previewId = usePreviewId();

  return (
    <Field orientation="horizontal" className="max-w-sm">
      <FieldContent>
        <FieldLabel htmlFor={`${previewId}-switch-focus-mode`}>
          Share across devices
        </FieldLabel>
        <FieldDescription>
          Focus is shared across devices, and turns off when you leave the app.
        </FieldDescription>
      </FieldContent>
      <Switch id={`${previewId}-switch-focus-mode`} />
    </Field>
  );
}

export default SwitchDescription;
