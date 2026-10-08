"use client";

import { Calendar } from "@workspace/ui/components/calendar";
import { Card, CardContent, CardFooter } from "@workspace/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { Clock2Icon } from "lucide-react";
import * as React from "react";
import { useId as usePreviewId } from "react";

export function CalendarWithTime() {
  const previewId = usePreviewId();

  const [date, setDate] = React.useState<Date | undefined>(
    new Date(
      new Date(2025, 5, 12).getFullYear(),
      new Date(2025, 5, 12).getMonth(),
      12,
    ),
  );

  return (
    <Card size="sm" className="mx-auto w-fit">
      <CardContent>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="p-0"
        />
      </CardContent>
      <CardFooter className="border-t bg-card">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`${previewId}-time-from`}>
              Start Time
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                id={`${previewId}-time-from`}
                type="time"
                step="1"
                defaultValue="10:30:00"
                className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
              />
              <InputGroupAddon>
                <Clock2Icon className="text-muted-foreground" />
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${previewId}-time-to`}>End Time</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id={`${previewId}-time-to`}
                type="time"
                step="1"
                defaultValue="12:30:00"
                className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
              />
              <InputGroupAddon>
                <Clock2Icon className="text-muted-foreground" />
              </InputGroupAddon>
            </InputGroup>
          </Field>
        </FieldGroup>
      </CardFooter>
    </Card>
  );
}

export default CalendarWithTime;
