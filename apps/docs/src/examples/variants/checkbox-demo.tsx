"use client";

import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@workspace/ui/components/field";
import { Label } from "@workspace/ui/components/label";
import { useId as usePreviewId } from "react";

export default function CheckboxDemo() {
  const previewId = usePreviewId();

  return (
    <FieldGroup className="max-w-sm">
      <Field orientation="horizontal">
        <Checkbox id={`${previewId}-terms-checkbox`} name="terms-checkbox" />
        <Label htmlFor={`${previewId}-terms-checkbox`}>
          Accept terms and conditions
        </Label>
      </Field>
      <Field orientation="horizontal">
        <Checkbox
          id={`${previewId}-terms-checkbox-2`}
          name="terms-checkbox-2"
          defaultChecked
        />
        <FieldContent>
          <FieldLabel htmlFor={`${previewId}-terms-checkbox-2`}>
            Accept terms and conditions
          </FieldLabel>
          <FieldDescription>
            By clicking this checkbox, you agree to the terms.
          </FieldDescription>
        </FieldContent>
      </Field>
      <Field orientation="horizontal" data-disabled>
        <Checkbox
          id={`${previewId}-toggle-checkbox`}
          name="toggle-checkbox"
          disabled
        />
        <FieldLabel htmlFor={`${previewId}-toggle-checkbox`}>
          Enable notifications
        </FieldLabel>
      </Field>
      <FieldLabel>
        <Field orientation="horizontal">
          <Checkbox
            id={`${previewId}-toggle-checkbox-2`}
            name="toggle-checkbox-2"
          />
          <FieldContent>
            <FieldTitle>Enable notifications</FieldTitle>
            <FieldDescription>
              You can enable or disable notifications at any time.
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldLabel>
    </FieldGroup>
  );
}
