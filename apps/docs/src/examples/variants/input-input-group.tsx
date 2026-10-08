import { Field, FieldLabel } from "@workspace/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@workspace/ui/components/input-group";
import { InfoIcon } from "lucide-react";
import { useId as usePreviewId } from "react";

export function InputInputGroup() {
  const previewId = usePreviewId();

  return (
    <Field>
      <FieldLabel htmlFor={`${previewId}-input-group-url`}>
        Website URL
      </FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={`${previewId}-input-group-url`}
          placeholder="example.com"
        />
        <InputGroupAddon>
          <InputGroupText>https://</InputGroupText>
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">
          <InfoIcon />
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}

export default InputInputGroup;
