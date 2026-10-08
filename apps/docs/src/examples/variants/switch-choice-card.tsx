import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@workspace/ui/components/field";
import { Switch } from "@workspace/ui/components/switch";
import { useId as usePreviewId } from "react";

export function SwitchChoiceCard() {
  const previewId = usePreviewId();

  return (
    <FieldGroup className="w-full max-w-sm">
      <FieldLabel htmlFor={`${previewId}-switch-share`}>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Share across devices</FieldTitle>
            <FieldDescription>
              Focus is shared across devices, and turns off when you leave the
              app.
            </FieldDescription>
          </FieldContent>
          <Switch id={`${previewId}-switch-share`} />
        </Field>
      </FieldLabel>
      <FieldLabel htmlFor={`${previewId}-switch-notifications`}>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Enable notifications</FieldTitle>
            <FieldDescription>
              Receive notifications when focus mode is enabled or disabled.
            </FieldDescription>
          </FieldContent>
          <Switch id={`${previewId}-switch-notifications`} defaultChecked />
        </Field>
      </FieldLabel>
    </FieldGroup>
  );
}

export default SwitchChoiceCard;
