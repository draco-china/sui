import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@workspace/ui/components/field";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { useId as usePreviewId } from "react";

export function RadioGroupChoiceCard() {
  const previewId = usePreviewId();

  return (
    <RadioGroup defaultValue="plus" className="max-w-sm">
      <FieldLabel htmlFor={`${previewId}-plus-plan`}>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Plus</FieldTitle>
            <FieldDescription>
              For individuals and small teams.
            </FieldDescription>
          </FieldContent>
          <RadioGroupItem value="plus" id={`${previewId}-plus-plan`} />
        </Field>
      </FieldLabel>
      <FieldLabel htmlFor={`${previewId}-pro-plan`}>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Pro</FieldTitle>
            <FieldDescription>For growing businesses.</FieldDescription>
          </FieldContent>
          <RadioGroupItem value="pro" id={`${previewId}-pro-plan`} />
        </Field>
      </FieldLabel>
      <FieldLabel htmlFor={`${previewId}-enterprise-plan`}>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Enterprise</FieldTitle>
            <FieldDescription>
              For large teams and enterprises.
            </FieldDescription>
          </FieldContent>
          <RadioGroupItem
            value="enterprise"
            id={`${previewId}-enterprise-plan`}
          />
        </Field>
      </FieldLabel>
    </RadioGroup>
  );
}

export default RadioGroupChoiceCard;
