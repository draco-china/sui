import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { useId as usePreviewId } from "react";

export function RadioGroupInvalid() {
  const previewId = usePreviewId();

  return (
    <FieldSet className="w-full max-w-xs">
      <FieldLegend variant="label">Notification Preferences</FieldLegend>
      <FieldDescription>
        Choose how you want to receive notifications.
      </FieldDescription>
      <RadioGroup defaultValue="email">
        <Field orientation="horizontal" data-invalid>
          <RadioGroupItem
            value="email"
            id={`${previewId}-invalid-email`}
            aria-invalid
          />
          <FieldLabel
            htmlFor={`${previewId}-invalid-email`}
            className="font-normal"
          >
            Email only
          </FieldLabel>
        </Field>
        <Field orientation="horizontal" data-invalid>
          <RadioGroupItem
            value="sms"
            id={`${previewId}-invalid-sms`}
            aria-invalid
          />
          <FieldLabel
            htmlFor={`${previewId}-invalid-sms`}
            className="font-normal"
          >
            SMS only
          </FieldLabel>
        </Field>
        <Field orientation="horizontal" data-invalid>
          <RadioGroupItem
            value="both"
            id={`${previewId}-invalid-both`}
            aria-invalid
          />
          <FieldLabel
            htmlFor={`${previewId}-invalid-both`}
            className="font-normal"
          >
            Both Email & SMS
          </FieldLabel>
        </Field>
      </RadioGroup>
    </FieldSet>
  );
}

export default RadioGroupInvalid;
