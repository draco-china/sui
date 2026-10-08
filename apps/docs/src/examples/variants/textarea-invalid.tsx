import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Textarea } from "@workspace/ui/components/textarea";
import { useId as usePreviewId } from "react";

export function TextareaInvalid() {
  const previewId = usePreviewId();

  return (
    <Field data-invalid>
      <FieldLabel htmlFor={`${previewId}-textarea-invalid`}>Message</FieldLabel>
      <Textarea
        id={`${previewId}-textarea-invalid`}
        placeholder="Type your message here."
        aria-invalid
      />
      <FieldDescription>Please enter a valid message.</FieldDescription>
    </Field>
  );
}

export default TextareaInvalid;
