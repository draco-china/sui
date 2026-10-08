import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@workspace/ui/components/field";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Textarea } from "@workspace/ui/components/textarea";
import { BotIcon, ChevronDownIcon } from "lucide-react";
import { useId as usePreviewId } from "react";

export default function ButtonGroupPopover() {
  const previewId = usePreviewId();

  return (
    <ButtonGroup>
      <Button variant="outline">
        <BotIcon /> Copilot
      </Button>
      <Popover>
        <PopoverTrigger
          render={
            <Button variant="outline" size="icon" aria-label="Open Popover" />
          }
        >
          <ChevronDownIcon />
        </PopoverTrigger>
        <PopoverContent align="end" className="rounded-xl text-sm">
          <PopoverHeader>
            <PopoverTitle>Start a new task with Copilot</PopoverTitle>
            <PopoverDescription>
              Describe your task in natural language.
            </PopoverDescription>
          </PopoverHeader>
          <Field>
            <FieldLabel htmlFor={`${previewId}-task`} className="sr-only">
              Task Description
            </FieldLabel>
            <Textarea
              id={`${previewId}-task`}
              placeholder="I need to..."
              className="resize-none"
            />
            <FieldDescription>
              Copilot will open a pull request for review.
            </FieldDescription>
          </Field>
        </PopoverContent>
      </Popover>
    </ButtonGroup>
  );
}
