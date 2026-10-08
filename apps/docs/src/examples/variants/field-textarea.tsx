import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@workspace/ui/components/field";
import { Textarea } from "@workspace/ui/components/textarea";
import { useId as usePreviewId } from "react";

export default function FieldTextarea() {
  const previewId = usePreviewId();

  return (
    <FieldSet className="w-full max-w-xs">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${previewId}-feedback`}>Feedback</FieldLabel>
          <Textarea
            id={`${previewId}-feedback`}
            placeholder="Your feedback helps us improve..."
            rows={4}
          />
          <FieldDescription>
            Share your thoughts about our service.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}
