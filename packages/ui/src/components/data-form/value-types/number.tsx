"use client";

import { Input } from "@workspace/ui/components/input";
import { cn } from "cn";
import { isEmptyValue, toNumber } from "../conditions";
import {
  asPair,
  asText,
  controlProps,
  joinRange,
  numberFormat,
  toPair,
} from "./shared";
import { PrefixedInput } from "./text";
import type { ValueEditProps, ValueReadProps, ValueTypeMap } from "./types";

function formatNumber(
  value: unknown,
  { labels, fieldProps }: ValueReadProps,
  defaults: Intl.NumberFormatOptions = {},
) {
  if (isEmptyValue(value)) return "";
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  const format = fieldProps.format as Intl.NumberFormatOptions | undefined;
  return numberFormat(labels.locale, { ...defaults, ...format }).format(number);
}

function DigitEdit(props: ValueEditProps) {
  return (
    <PrefixedInput
      prefix={props.prefix}
      size={props.size}
      type="number"
      inputMode="decimal"
      placeholder={props.placeholder}
      {...props.fieldProps}
      {...controlProps(props)}
      className="tabular-nums"
      value={asText(props.value)}
      onBlur={props.onBlur}
      onChange={(event) => props.onChange(toNumber(event.target.value))}
    />
  );
}

function DigitRangeEdit(props: ValueEditProps) {
  const [start, end] = asPair(props.value);
  const { labels } = props;
  const shared = {
    type: "number",
    inputMode: "decimal" as const,
    disabled: props.disabled,
    "aria-invalid": props.invalid || undefined,
    "aria-describedby": props.describedBy,
    className: cn("tabular-nums", props.size === "sm" && "h-8"),
    onBlur: props.onBlur,
  };
  return (
    <fieldset
      aria-labelledby={props.labelledBy || undefined}
      className="m-0 flex min-w-0 items-center gap-1.5 border-0 p-0"
    >
      <Input
        {...shared}
        id={props.id}
        name={`${props.name}.0`}
        aria-label={`${props.label} ${labels.rangeStart}`}
        placeholder={labels.rangeStart}
        value={asText(start)}
        onChange={(event) =>
          props.onChange(toPair(toNumber(event.target.value), end))
        }
      />
      <span aria-hidden className="text-muted-foreground">
        ~
      </span>
      <Input
        {...shared}
        name={`${props.name}.1`}
        aria-label={`${props.label} ${labels.rangeEnd}`}
        placeholder={labels.rangeEnd}
        value={asText(end)}
        onChange={(event) =>
          props.onChange(toPair(start, toNumber(event.target.value)))
        }
      />
    </fieldset>
  );
}

function numberRead(defaults?: Intl.NumberFormatOptions, scale = 1) {
  return (props: ValueReadProps) =>
    isEmptyValue(props.value)
      ? ""
      : formatNumber(Number(props.value) / scale, props, defaults);
}

const digit = {
  edit: (props: ValueEditProps) => <DigitEdit {...props} />,
  text: numberRead(),
  prefix: true,
};

const digitRange = {
  edit: (props: ValueEditProps) => <DigitRangeEdit {...props} />,
  text: (props: ValueReadProps) => {
    const [start, end] = asPair(props.value);
    return joinRange(formatNumber(start, props), formatNumber(end, props));
  },
  labelTarget: "group" as const,
};

export const numberValueTypes: ValueTypeMap = {
  digit,
  number: digit,
  digitRange,
  numberRange: digitRange,
  money: { ...digit, text: numberRead({ style: "currency", currency: "USD" }) },
  percent: {
    ...digit,
    text: numberRead({ style: "percent", maximumFractionDigits: 2 }, 100),
  },
};
