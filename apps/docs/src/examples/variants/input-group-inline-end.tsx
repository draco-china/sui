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
import { EyeOffIcon } from "lucide-react";
import { useId as usePreviewId } from "react";

export function InputGroupInlineEnd() {
  const previewId = usePreviewId();

  return (
    <Field className="max-w-sm">
      <FieldLabel htmlFor={`${previewId}-inline-end-input`}>Input</FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={`${previewId}-inline-end-input`}
          type="password"
          placeholder="Enter password"
        />
        <InputGroupAddon align="inline-end">
          <EyeOffIcon />
        </InputGroupAddon>
      </InputGroup>
      <FieldDescription>Icon positioned at the end.</FieldDescription>
    </Field>
  );
}

export default InputGroupInlineEnd;
