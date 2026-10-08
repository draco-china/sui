import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { useId as usePreviewId } from "react";

export function RadioGroupDescription() {
  const previewId = usePreviewId();

  return (
    <RadioGroup defaultValue="comfortable" className="w-fit">
      <Field orientation="horizontal">
        <RadioGroupItem value="default" id={`${previewId}-desc-r1`} />
        <FieldContent>
          <FieldLabel htmlFor={`${previewId}-desc-r1`}>Default</FieldLabel>
          <FieldDescription>
            Standard spacing for most use cases.
          </FieldDescription>
        </FieldContent>
      </Field>
      <Field orientation="horizontal">
        <RadioGroupItem value="comfortable" id={`${previewId}-desc-r2`} />
        <FieldContent>
          <FieldLabel htmlFor={`${previewId}-desc-r2`}>Comfortable</FieldLabel>
          <FieldDescription>More space between elements.</FieldDescription>
        </FieldContent>
      </Field>
      <Field orientation="horizontal">
        <RadioGroupItem value="compact" id={`${previewId}-desc-r3`} />
        <FieldContent>
          <FieldLabel htmlFor={`${previewId}-desc-r3`}>Compact</FieldLabel>
          <FieldDescription>
            Minimal spacing for dense layouts.
          </FieldDescription>
        </FieldContent>
      </Field>
    </RadioGroup>
  );
}

export default RadioGroupDescription;
