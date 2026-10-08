import { Button } from "@workspace/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { useId as usePreviewId } from "react";

export function PopoverForm() {
  const previewId = usePreviewId();

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>
        Open Popover
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <PopoverHeader>
          <PopoverTitle>Dimensions</PopoverTitle>
          <PopoverDescription>
            Set the dimensions for the layer.
          </PopoverDescription>
        </PopoverHeader>
        <FieldGroup className="gap-4">
          <Field orientation="horizontal">
            <FieldLabel htmlFor={`${previewId}-width`} className="w-1/2">
              Width
            </FieldLabel>
            <Input id={`${previewId}-width`} defaultValue="100%" />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel htmlFor={`${previewId}-height`} className="w-1/2">
              Height
            </FieldLabel>
            <Input id={`${previewId}-height`} defaultValue="25px" />
          </Field>
        </FieldGroup>
      </PopoverContent>
    </Popover>
  );
}

export default PopoverForm;
