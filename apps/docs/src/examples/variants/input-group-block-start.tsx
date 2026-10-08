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
import { CopyIcon, FileCodeIcon } from "lucide-react";
import { useId as usePreviewId } from "react";

export function InputGroupBlockStart() {
  const previewId = usePreviewId();

  return (
    <FieldGroup className="max-w-sm">
      <Field>
        <FieldLabel htmlFor={`${previewId}-block-start-input`}>
          Input
        </FieldLabel>
        <InputGroup className="h-auto">
          <InputGroupInput
            id={`${previewId}-block-start-input`}
            placeholder="Enter your name"
          />
          <InputGroupAddon align="block-start">
            <InputGroupText>Full Name</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <FieldDescription>Header positioned above the input.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor={`${previewId}-block-start-textarea`}>
          Textarea
        </FieldLabel>
        <InputGroup>
          <InputGroupTextarea
            id={`${previewId}-block-start-textarea`}
            placeholder="console.log('Hello, world!');"
            className="font-mono text-sm"
          />
          <InputGroupAddon align="block-start">
            <FileCodeIcon className="text-muted-foreground" />
            <InputGroupText className="font-mono">script.js</InputGroupText>
            <InputGroupButton size="icon-xs" className="ml-auto">
              <CopyIcon />
              <span className="sr-only">Copy</span>
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <FieldDescription>
          Header positioned above the textarea.
        </FieldDescription>
      </Field>
    </FieldGroup>
  );
}

export default InputGroupBlockStart;
