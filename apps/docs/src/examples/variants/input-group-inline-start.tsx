import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { SearchIcon } from "lucide-react";
import { useId as usePreviewId } from "react";

export function InputGroupInlineStart() {
  const previewId = usePreviewId();

  return (
    <Field className="max-w-sm">
      <FieldLabel htmlFor={`${previewId}-inline-start-input`}>Input</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={`${previewId}-inline-start-input`}
          placeholder="Search..."
        />
        <InputGroupAddon align="inline-start">
          <SearchIcon className="text-muted-foreground" />
        </InputGroupAddon>
      </InputGroup>
      <FieldDescription>Icon positioned at the start.</FieldDescription>
    </Field>
  );
}

export default InputGroupInlineStart;
