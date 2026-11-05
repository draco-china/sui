"use client";

import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";
import { isEmptyValue } from "@/components/ui/data-form/conditions";
import { asText, controlProps, plainText } from "@/components/ui/data-form/value-types/shared";
import type { ValueEditProps, ValueTypeMap } from "@/components/ui/data-form/value-types/types";

function emptyAsUndefined(value: string) {
  return value === "" ? undefined : value;
}

/**
 * An input, or with `prefix` an input group whose label sits inside the
 * field, before the value, as light filter rows show it.
 */
export function PrefixedInput({
  prefix,
  size,
  className,
  ...props
}: Omit<ComponentProps<"input">, "prefix" | "size"> & {
  prefix?: ReactNode;
  size?: "sm" | "default";
}) {
  const height = size === "sm" ? "h-8" : undefined;
  if (!prefix) return <Input className={cn(height, className)} {...props} />;
  return (
    // Sized for a light row, beside its other filters.
    <InputGroup className={cn("w-56 max-w-full", height)}>
      <InputGroupAddon className="whitespace-nowrap text-muted-foreground">
        {prefix}
      </InputGroupAddon>
      <InputGroupInput className={className} {...props} />
    </InputGroup>
  );
}

function TextEdit(props: ValueEditProps & { type?: string }) {
  return (
    <PrefixedInput
      type={props.type ?? "text"}
      placeholder={props.placeholder}
      prefix={props.prefix}
      size={props.size}
      {...props.fieldProps}
      {...controlProps(props)}
      value={asText(props.value)}
      onBlur={props.onBlur}
      onChange={(event) => props.onChange(emptyAsUndefined(event.target.value))}
    />
  );
}

export const textValueTypes: ValueTypeMap = {
  text: {
    edit: (props) => <TextEdit {...props} />,
    text: plainText,
    prefix: true,
  },
  password: {
    edit: (props) => (
      <TextEdit
        {...props}
        type="password"
        fieldProps={{ autoComplete: "current-password", ...props.fieldProps }}
      />
    ),
    text: ({ value }) => (isEmptyValue(value) ? "" : "••••••"),
    prefix: true,
    persist: false,
  },
  textarea: {
    edit: (props) => (
      <Textarea
        placeholder={props.placeholder}
        {...props.fieldProps}
        {...controlProps(props)}
        value={asText(props.value)}
        onBlur={props.onBlur}
        onChange={(event) =>
          props.onChange(emptyAsUndefined(event.target.value))
        }
      />
    ),
    text: plainText,
    read: ({ value }) => (
      <span className="whitespace-pre-wrap">{asText(value)}</span>
    ),
  },
};
