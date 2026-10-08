import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@workspace/ui/components/input-group";
import { useId as usePreviewId } from "react";

export function InputGroupBlockEnd() {
  const previewId = usePreviewId();

  return (
    <FieldGroup className="max-w-sm">
      <Field>
        <FieldLabel htmlFor={`${previewId}-block-end-input`}>Input</FieldLabel>
        <InputGroup className="h-auto">
          <InputGroupInput
            id={`${previewId}-block-end-input`}
            placeholder="Enter amount"
          />
          <InputGroupAddon align="block-end">
            <InputGroupText>USD</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <FieldDescription>Footer positioned below the input.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${previewId}-block-end-textarea`}>
          Textarea
        </FieldLabel>
        <InputGroup>
          <InputGroupTextarea
            id={`${previewId}-block-end-textarea`}
            placeholder="Write a comment..."
          />
          <InputGroupAddon align="block-end">
            <InputGroupText>0/280</InputGroupText>
            <InputGroupButton variant="default" size="sm" className="ml-auto">
              Post
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <FieldDescription>
          Footer positioned below the textarea.
        </FieldDescription>
      </Field>
    </FieldGroup>
  );
}

export default InputGroupBlockEnd;
