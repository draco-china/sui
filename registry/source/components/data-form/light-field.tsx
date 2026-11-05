"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "cn";
import { ChevronDownIcon } from "lucide-react";
import { isEmptyValue } from "@/components/ui/data-form/conditions";
import { useDataFormLayout } from "@/components/ui/data-form/context";
import type { DataFormFieldConfig } from "@/components/ui/data-form/types";
import type { FieldRuntime } from "@/components/ui/data-form/use-field";
import { renderControl, valueText } from "@/components/ui/data-form/value-types";
import { fieldSurface } from "@/components/ui/data-form/value-types/shared";

/** "Any" when empty; past two choices, a count, as quick filters show it. */
function lightSummary(
  value: unknown,
  summary: string,
  labels: { any: string; selected: (count: number) => string },
) {
  if (isEmptyValue(value)) return labels.any;
  if (Array.isArray(value) && value.length > 2)
    return labels.selected(value.length);
  return summary;
}

/**
 * A field in `layout="light"`: by default a compact button that names the
 * field and sums up its value, opening the control in a popover beside it;
 * with `lightMode: "inline"`, the control itself on the row.
 */
export function LightField({
  config,
  runtime,
}: {
  config: DataFormFieldConfig;
  runtime: FieldRuntime;
}) {
  const { size } = useDataFormLayout();
  const { state, type, ids, editProps, readProps } = runtime;
  if (state.hidden || !runtime.shown) return null;
  const label = config.label ?? config.name;
  const empty = isEmptyValue(readProps.value);
  const mode =
    config.lightMode ??
    (config.render ? undefined : type.lightMode) ??
    "popover";

  // Inline, a control that takes a prefix shows the label inside, as the
  // buttons do; the rest keep it beside them.
  if (mode === "inline") {
    const inside = Boolean(type.prefix) && !config.render;
    return (
      <div
        data-slot="data-form-light-field"
        data-mode="inline"
        className="flex shrink-0 items-center gap-2"
      >
        {inside ? null : (
          <span
            id={ids.label}
            className="whitespace-nowrap text-muted-foreground text-sm"
          >
            {label}
          </span>
        )}
        {renderControl(config.render, type, config.valueType, {
          ...editProps,
          // The control names itself; the visible prefix is not read twice.
          labelledBy: inside ? "" : ids.label,
          prefix: inside ? <span aria-hidden>{label}</span> : undefined,
          describedBy: undefined,
        })}
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size={size === "sm" ? "sm" : "default"}
            data-slot="data-form-light-field"
            data-active={!empty || undefined}
            aria-invalid={editProps.invalid || undefined}
            disabled={editProps.disabled}
            // Filled like the inputs and select triggers beside it: it is a
            // field, not an action.
            className={cn("max-w-72", fieldSurface)}
          />
        }
      >
        <span id={ids.label} className="text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "truncate tabular-nums",
            empty ? "text-muted-foreground" : "text-foreground",
          )}
        >
          {lightSummary(
            readProps.value,
            valueText(type, readProps),
            editProps.labels,
          )}
        </span>
        <ChevronDownIcon aria-hidden className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-72 flex-col gap-3">
        {renderControl(config.render, type, config.valueType, {
          ...editProps,
          describedBy: undefined,
          size: "default",
        })}
        {/* Custom controls, such as an option list, carry their own reset. */}
        {config.render || type.clears ? null : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-end"
            disabled={empty}
            onClick={() => runtime.onChange(undefined)}
          >
            {editProps.labels.clearField}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
