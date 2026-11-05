"use client";

import { useSelector } from "@tanstack/react-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FunnelIcon } from "lucide-react";
import { useState } from "react";
import { isEmptyValue } from "@/components/ui/data-form/conditions";
import { useDataFormContext, useDataFormLayout } from "@/components/ui/data-form/context";
import { DataFormFields } from "@/components/ui/data-form/fields";
import { DataFormFooter, DataFormRoot, DataFormSubmit } from "@/components/ui/data-form/parts";
import { getPath, pickPaths } from "@/components/ui/data-form/path";
import type { DataFormFieldConfig, DataFormValues } from "@/components/ui/data-form/types";
import { useDataForm } from "@/components/ui/data-form/use-data-form";

/** A draft of the overflow fields; Apply writes them back in one change. */
function DraftForm({
  fields,
  onDone,
}: {
  fields: readonly DataFormFieldConfig[];
  onDone: () => void;
}) {
  const outer = useDataFormContext();
  const draft = useDataForm({
    fields,
    defaultValues: pickPaths<DataFormValues>(
      outer.api.state.values,
      fields.map((field) => field.name),
    ),
    labels: outer.labels,
    valueTypes: outer.valueTypes,
    access: outer.access,
    onFinish: () => {
      const values = draft.api.state.values;
      for (const field of fields)
        outer.api.setFieldValue(field.name, getPath(values, field.name));
      onDone();
      if (outer.submitOn !== "change") void outer.submit();
    },
  });
  return (
    <DataFormRoot form={draft} className="gap-4">
      <DataFormFields />
      <DataFormFooter>
        <Button
          type="button"
          variant="outline"
          size="sm"
          // Empty values, which Apply then writes back.
          onClick={() => draft.reset({})}
        >
          {outer.labels.clearField}
        </Button>
        <DataFormSubmit size="sm">{outer.labels.apply}</DataFormSubmit>
      </DataFormFooter>
    </DataFormRoot>
  );
}

/**
 * The fields past `collapse.count` in `layout="light"`: one Filters button
 * with the number in use, and a draft form that applies them together.
 */
export function LightOverflow({
  fields,
}: {
  fields: readonly DataFormFieldConfig[];
}) {
  const form = useDataFormContext();
  // As tall as the row's other buttons.
  const size = useDataFormLayout().size === "sm" ? "sm" : "default";
  const [open, setOpen] = useState(false);
  const active = useSelector(
    form.api.store,
    (state) =>
      fields.filter((field) => !isEmptyValue(getPath(state.values, field.name)))
        .length,
  );
  if (fields.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={size}
            data-slot="data-form-more-filters"
          />
        }
      >
        <FunnelIcon aria-hidden />
        {form.labels.filters}
        {active ? (
          <Badge variant="secondary" className="tabular-nums">
            {active}
          </Badge>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-80 flex-col gap-4">
        <PopoverHeader>
          <PopoverTitle>{form.labels.filters}</PopoverTitle>
        </PopoverHeader>
        <DraftForm fields={fields} onDone={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
