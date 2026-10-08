import { Field, FieldLabel } from "@workspace/ui/components/field";
import { Textarea } from "@workspace/ui/components/textarea";
import { useId as usePreviewId } from "react";

export function TextareaDisabled() {
  const previewId = usePreviewId();

  return (
    <Field data-disabled>
      <FieldLabel htmlFor={`${previewId}-textarea-disabled`}>
        Message
      </FieldLabel>
      <Textarea
        id={`${previewId}-textarea-disabled`}
        placeholder="Type your message here."
        disabled
      />
    </Field>
  );
}

export default TextareaDisabled;
