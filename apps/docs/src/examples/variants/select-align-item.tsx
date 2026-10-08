"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import * as React from "react";
import { useId as usePreviewId } from "react";

const items = [
  { label: "Select a fruit", value: null },
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Blueberry", value: "blueberry" },
  { label: "Grapes", value: "grapes" },
  { label: "Pineapple", value: "pineapple" },
];

export function SelectAlignItem() {
  const previewId = usePreviewId();

  const [alignItemWithTrigger, setAlignItemWithTrigger] = React.useState(true);

  return (
    <FieldGroup className="w-full max-w-xs">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldLabel htmlFor={`${previewId}-align-item`}>
            Align Item
          </FieldLabel>
          <FieldDescription>
            Toggle to align the item with the trigger.
          </FieldDescription>
        </FieldContent>
        <Switch
          id={`${previewId}-align-item`}
          checked={alignItemWithTrigger}
          onCheckedChange={setAlignItemWithTrigger}
        />
      </Field>
      <Field>
        <Select items={items} defaultValue="banana">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={alignItemWithTrigger}>
            <SelectGroup>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
    </FieldGroup>
  );
}

export default SelectAlignItem;
