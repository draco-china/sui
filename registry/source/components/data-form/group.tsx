"use client";

import {
  FieldDescription,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { cn } from "cn";
import {
  Children,
  type ComponentProps,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { FieldShell } from "@/components/ui/data-form/field-shell";
import { useFieldsClass } from "@/components/ui/data-form/fields";
import type { DataFormFieldConfig } from "@/components/ui/data-form/types";
import { useFieldRuntime } from "@/components/ui/data-form/use-field";
import { asList } from "@/components/ui/data-form/value-types/shared";

/**
 * A titled group of fields, laid out like the rest of the form. Groups are
 * separated by space, not by cards.
 */
export function DataFormGroup({
  title,
  description,
  className,
  children,
  ...props
}: Omit<ComponentProps<"fieldset">, "title"> & {
  readonly title?: ReactNode;
  readonly description?: ReactNode;
}) {
  const fieldsClass = useFieldsClass();
  return (
    <FieldSet
      data-slot="data-form-group"
      className={cn("gap-4", className)}
      {...props}
    >
      {title ? <FieldLegend>{title}</FieldLegend> : null}
      {description ? (
        <FieldDescription className="-mt-2">{description}</FieldDescription>
      ) : null}
      <div className={fieldsClass}>{children}</div>
    </FieldSet>
  );
}

type ChildProps = Record<string, unknown>;

export interface DataFormFieldSetProps
  extends Omit<DataFormFieldConfig, "render" | "valueType" | "options"> {
  /** One control per part of the value, such as an area code and a number. */
  readonly children: ReactNode;
}

/**
 * Several controls that make one value, stored as an array: the first
 * control edits `value[0]`, the second `value[1]`.
 */
export function DataFormFieldSet({
  children,
  ...config
}: DataFormFieldSetProps) {
  const runtime = useFieldRuntime(config);
  const { field, ids, editProps } = runtime;
  const parts = asList(field.state.value);
  const controls = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<ChildProps>[];
  const update = (index: number, next: unknown) => {
    const value = controls.map((_, position) =>
      position === index ? next : parts[position],
    );
    runtime.onChange(
      value.every((item) => item === undefined) ? undefined : value,
    );
  };
  return (
    <FieldShell
      runtime={runtime}
      label={config.label}
      description={config.description}
      tooltip={config.tooltip}
      labelTarget="group"
      colSpan={config.colSpan}
      className={config.className}
    >
      <fieldset
        aria-labelledby={ids.label}
        aria-describedby={editProps.describedBy}
        className="m-0 flex min-w-0 items-center gap-2 border-0 p-0"
      >
        {controls.map((control, index) =>
          cloneElement(control, {
            key: control.key ?? index,
            id: index === 0 ? ids.control : undefined,
            value: parts[index] ?? "",
            disabled: editProps.disabled,
            "aria-invalid": editProps.invalid || undefined,
            onChange: (event: { target: { value: string } }) =>
              update(
                index,
                event.target.value === "" ? undefined : event.target.value,
              ),
            onBlur: field.handleBlur,
          }),
        )}
      </fieldset>
    </FieldShell>
  );
}
