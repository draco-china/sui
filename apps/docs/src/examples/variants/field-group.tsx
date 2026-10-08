import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
} from "@workspace/ui/components/field";
import { useId as usePreviewId } from "react";

export default function FieldGroupExample() {
  const previewId = usePreviewId();

  return (
    <FieldGroup className="w-full max-w-xs">
      <FieldSet>
        <FieldLabel>Responses</FieldLabel>
        <FieldDescription>
          Get notified when ChatGPT responds to requests that take time, like
          research or image generation.
        </FieldDescription>
        <FieldGroup data-slot="checkbox-group">
          <Field orientation="horizontal">
            <Checkbox id={`${previewId}-push`} defaultChecked disabled />
            <FieldLabel htmlFor={`${previewId}-push`} className="font-normal">
              Push notifications
            </FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSeparator />
      <FieldSet>
        <FieldLabel>Tasks</FieldLabel>
        <FieldDescription>
          Get notified when tasks you&apos;ve created have updates.{" "}
          <a href="/docs">Manage tasks</a>
        </FieldDescription>
        <FieldGroup data-slot="checkbox-group">
          <Field orientation="horizontal">
            <Checkbox id={`${previewId}-push-tasks`} />
            <FieldLabel
              htmlFor={`${previewId}-push-tasks`}
              className="font-normal"
            >
              Push notifications
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id={`${previewId}-email-tasks`} />
            <FieldLabel
              htmlFor={`${previewId}-email-tasks`}
              className="font-normal"
            >
              Email notifications
            </FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>
    </FieldGroup>
  );
}
