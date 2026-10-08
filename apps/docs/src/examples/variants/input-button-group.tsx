import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useId as usePreviewId } from "react";

export function InputButtonGroup() {
  const previewId = usePreviewId();

  return (
    <Field>
      <FieldLabel htmlFor={`${previewId}-input-button-group`}>
        Search
      </FieldLabel>
      <ButtonGroup>
        <Input
          id={`${previewId}-input-button-group`}
          placeholder="Type to search..."
        />
        <Button variant="outline">Search</Button>
      </ButtonGroup>
    </Field>
  );
}

export default InputButtonGroup;
