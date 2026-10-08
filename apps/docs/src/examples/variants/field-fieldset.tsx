import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useId as usePreviewId } from "react";

export function FieldFieldset() {
  const previewId = usePreviewId();

  return (
    <FieldSet className="w-full max-w-sm">
      <FieldLegend>Address Information</FieldLegend>
      <FieldDescription>
        We need your address to deliver your order.
      </FieldDescription>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${previewId}-street`}>
            Street Address
          </FieldLabel>
          <Input
            id={`${previewId}-street`}
            type="text"
            placeholder="123 Main St"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor={`${previewId}-city`}>City</FieldLabel>
            <Input
              id={`${previewId}-city`}
              type="text"
              placeholder="New York"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${previewId}-zip`}>Postal Code</FieldLabel>
            <Input id={`${previewId}-zip`} type="text" placeholder="90502" />
          </Field>
        </div>
      </FieldGroup>
    </FieldSet>
  );
}

export default FieldFieldset;
