import {
  Field,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { useId as usePreviewId } from "react";

export function FieldRadio() {
  const previewId = usePreviewId();

  return (
    <FieldSet className="w-full max-w-xs">
      <FieldLegend variant="label">Subscription Plan</FieldLegend>
      <FieldDescription>
        Yearly and lifetime plans offer significant savings.
      </FieldDescription>
      <RadioGroup defaultValue="monthly">
        <Field orientation="horizontal">
          <RadioGroupItem value="monthly" id={`${previewId}-plan-monthly`} />
          <FieldLabel
            htmlFor={`${previewId}-plan-monthly`}
            className="font-normal"
          >
            Monthly ($9.99/month)
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <RadioGroupItem value="yearly" id={`${previewId}-plan-yearly`} />
          <FieldLabel
            htmlFor={`${previewId}-plan-yearly`}
            className="font-normal"
          >
            Yearly ($99.99/year)
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <RadioGroupItem value="lifetime" id={`${previewId}-plan-lifetime`} />
          <FieldLabel
            htmlFor={`${previewId}-plan-lifetime`}
            className="font-normal"
          >
            Lifetime ($299.99)
          </FieldLabel>
        </Field>
      </RadioGroup>
    </FieldSet>
  );
}

export default FieldRadio;
