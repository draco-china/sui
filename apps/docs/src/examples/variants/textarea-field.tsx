import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Textarea } from "@workspace/ui/components/textarea";
import { useId as usePreviewId } from "react";

export function TextareaField() {
  const previewId = usePreviewId();

  return (
    <Field>
      <FieldLabel htmlFor={`${previewId}-textarea-message`}>Message</FieldLabel>
      <FieldDescription>Enter your message below.</FieldDescription>
      <Textarea
        id={`${previewId}-textarea-message`}
        placeholder="Type your message here."
      />
    </Field>
  );
}

export default TextareaField;
