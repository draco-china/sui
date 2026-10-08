import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@workspace/ui/components/field";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { useId as usePreviewId } from "react";

export default function FieldChoiceCard() {
  const previewId = usePreviewId();

  return (
    <FieldGroup className="w-full max-w-xs">
      <FieldSet>
        <FieldLegend variant="label">Compute Environment</FieldLegend>
        <FieldDescription>
          Select the compute environment for your cluster.
        </FieldDescription>
        <RadioGroup defaultValue="kubernetes">
          <FieldLabel htmlFor={`${previewId}-kubernetes-r2h`}>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Kubernetes</FieldTitle>
                <FieldDescription>
                  Run GPU workloads on a K8s cluster.
                </FieldDescription>
              </FieldContent>
              <RadioGroupItem
                value="kubernetes"
                id={`${previewId}-kubernetes-r2h`}
              />
            </Field>
          </FieldLabel>
          <FieldLabel htmlFor={`${previewId}-vm-z4k`}>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Virtual Machine</FieldTitle>
                <FieldDescription>
                  Access a cluster to run GPU workloads.
                </FieldDescription>
              </FieldContent>
              <RadioGroupItem value="vm" id={`${previewId}-vm-z4k`} />
            </Field>
          </FieldLabel>
        </RadioGroup>
      </FieldSet>
    </FieldGroup>
  );
}
