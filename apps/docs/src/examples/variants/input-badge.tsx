import { Badge } from "@workspace/ui/components/badge";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useId as usePreviewId } from "react";

export function InputBadge() {
  const previewId = usePreviewId();

  return (
    <Field>
      <FieldLabel htmlFor={`${previewId}-input-badge`}>
        Webhook URL{" "}
        <Badge variant="secondary" className="ml-auto">
          Beta
        </Badge>
      </FieldLabel>
      <Input
        id={`${previewId}-input-badge`}
        type="url"
        placeholder="https://api.example.com/webhook"
      />
    </Field>
  );
}

export default InputBadge;
