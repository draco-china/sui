import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useId as usePreviewId } from "react";

export function InputDemo() {
  const previewId = usePreviewId();

  return (
    <Field>
      <FieldLabel htmlFor={`${previewId}-input-demo-api-key`}>
        API Key
      </FieldLabel>
      <Input
        id={`${previewId}-input-demo-api-key`}
        type="password"
        placeholder="sk-..."
      />
      <FieldDescription>
        Your API key is encrypted and stored securely.
      </FieldDescription>
    </Field>
  );
}

export default InputDemo;
