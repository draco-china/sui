import { Field, FieldLabel } from "@workspace/ui/components/field";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { useId as usePreviewId } from "react";

export function RadioGroupDisabled() {
  const previewId = usePreviewId();

  return (
    <RadioGroup defaultValue="option2" className="w-fit">
      <Field orientation="horizontal" data-disabled>
        <RadioGroupItem
          value="option1"
          id={`${previewId}-disabled-1`}
          disabled
        />
        <FieldLabel htmlFor={`${previewId}-disabled-1`} className="font-normal">
          Disabled
        </FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <RadioGroupItem value="option2" id={`${previewId}-disabled-2`} />
        <FieldLabel htmlFor={`${previewId}-disabled-2`} className="font-normal">
          Option 2
        </FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <RadioGroupItem value="option3" id={`${previewId}-disabled-3`} />
        <FieldLabel htmlFor={`${previewId}-disabled-3`} className="font-normal">
          Option 3
        </FieldLabel>
      </Field>
    </RadioGroup>
  );
}

export default RadioGroupDisabled;
