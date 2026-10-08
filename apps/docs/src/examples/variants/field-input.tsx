import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { useId as usePreviewId } from "react";

export default function FieldInput() {
  const previewId = usePreviewId();

  return (
    <FieldSet className="w-full max-w-xs">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${previewId}-username`}>Username</FieldLabel>
          <Input
            id={`${previewId}-username`}
            type="text"
            placeholder="Max Leiter"
          />
          <FieldDescription>
            Choose a unique username for your account.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${previewId}-password`}>Password</FieldLabel>
          <FieldDescription>
            Must be at least 8 characters long.
          </FieldDescription>
          <Input
            id={`${previewId}-password`}
            type="password"
            placeholder="••••••••"
          />
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}
