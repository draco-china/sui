"use client";

import { ColorPicker } from "@workspace/ui/components/color-picker";
import { Slider } from "@workspace/ui/components/slider";
import { TagInput } from "@workspace/ui/components/tag-input";
import { cn } from "cn";
import { isEmptyValue } from "../conditions";
import { asList, controlProps, fieldSurface, plainText } from "./shared";
import type { ValueEditProps, ValueReadProps, ValueTypeMap } from "./types";

function SliderEdit(props: ValueEditProps) {
  const min =
    typeof props.fieldProps.min === "number" ? props.fieldProps.min : 0;
  const value = isEmptyValue(props.value) ? min : props.value;
  return (
    <div className="flex items-center gap-3">
      <Slider
        aria-labelledby={props.labelledBy}
        aria-describedby={props.describedBy}
        disabled={props.disabled}
        name={props.name}
        {...props.fieldProps}
        value={value as number | number[]}
        onValueChange={(next) => props.onChange(next)}
        onValueCommitted={() => props.onBlur()}
      />
      <output
        aria-hidden
        className="min-w-10 text-end text-muted-foreground text-sm tabular-nums"
      >
        {asList(value).join(" – ")}
      </output>
    </div>
  );
}

function ColorSwatch({ value }: ValueReadProps) {
  if (isEmptyValue(value)) return "";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="size-4 rounded-full ring-1 ring-foreground/10"
        style={{ background: String(value) }}
      />
      <span className="font-mono text-xs">{String(value)}</span>
    </span>
  );
}

export const miscValueTypes: ValueTypeMap = {
  slider: {
    edit: (props) => <SliderEdit {...props} />,
    text: ({ value }) => asList(value).join(" – "),
    labelTarget: "group",
  },
  color: {
    edit: (props) => (
      <ColorPicker
        {...controlProps(props)}
        // Filled like the other fields of a form, not an outlined button.
        className={cn("w-full justify-start", fieldSurface)}
        {...props.fieldProps}
        value={isEmptyValue(props.value) ? undefined : String(props.value)}
        onValueChange={(next) => props.onChange(next)}
        onBlur={props.onBlur}
      />
    ),
    read: ColorSwatch,
    text: plainText,
  },
  tags: {
    edit: (props) => (
      <TagInput
        placeholder={props.placeholder}
        {...controlProps(props)}
        {...props.fieldProps}
        value={asList(props.value).map(String)}
        onValueChange={(next) => props.onChange(next.length ? next : undefined)}
        onBlur={props.onBlur}
      />
    ),
    text: plainText,
  },
};
