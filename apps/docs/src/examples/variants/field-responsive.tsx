import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useId as usePreviewId } from "react";

export function FieldResponsive() {
  const previewId = usePreviewId();

  return (
    <div className="w-full max-w-lg">
      <form>
        <FieldSet>
          <FieldLegend>Profile</FieldLegend>
          <FieldDescription>Fill in your profile information.</FieldDescription>
          <FieldGroup>
            <Field orientation="responsive">
              <FieldContent>
                <FieldLabel htmlFor={`${previewId}-name`}>Name</FieldLabel>
                <FieldDescription>
                  Provide your full name for identification
                </FieldDescription>
              </FieldContent>
              <Input
                id={`${previewId}-name`}
                placeholder="Evil Rabbit"
                required
              />
            </Field>
            <Field orientation="responsive">
              <Button type="submit">Submit</Button>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Field>
          </FieldGroup>
        </FieldSet>
      </form>
    </div>
  );
}

export default FieldResponsive;
