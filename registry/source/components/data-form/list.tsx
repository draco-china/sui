"use client";

import { type AnyFieldApi, useField, useSelector } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { FieldLegend, FieldSet } from "@/components/ui/field";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { useDataFormContext } from "@/components/ui/data-form/context";
import { DataFormField } from "@/components/ui/data-form/field";
import type { DataFormFieldConfig, DataFormValues } from "@/components/ui/data-form/types";

export interface DataFormListRow {
  readonly index: number;
  /** The full path of a key in this row: `name("email")` → `members[0].email`. */
  readonly name: (key: string) => string;
  readonly remove: () => void;
}

export interface DataFormListProps {
  readonly name: string;
  readonly label?: ReactNode;
  readonly description?: ReactNode;
  /** Fields of each row; `name` is the key inside the row. */
  readonly fields?: readonly DataFormFieldConfig[];
  /** Draws a row yourself instead of `fields`. */
  readonly children?: (row: DataFormListRow) => ReactNode;
  /** A new row's values. */
  readonly newRow?: () => DataFormValues;
  readonly min?: number;
  readonly max?: number;
  readonly sortable?: boolean;
  readonly className?: string;
}

function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Rows of the same fields, such as team members. Adding a row moves focus
 * into it and removing one returns focus to a neighbor; both are announced.
 */
export function DataFormList({
  name,
  label,
  description,
  fields = [],
  children,
  newRow = () => ({}),
  min = 0,
  max = Number.POSITIVE_INFINITY,
  sortable = false,
  className,
}: DataFormListProps) {
  const form = useDataFormContext();
  const { labels } = form;
  const list = useField({
    form: form.api,
    name,
    mode: "array",
  } as never) as unknown as AnyFieldApi;
  const length = useSelector(list.store, (state) =>
    Array.isArray(state.value) ? state.value.length : 0,
  );
  const rootRef = useRef<HTMLFieldSetElement>(null);
  const [announcement, setAnnouncement] = useState("");

  const focusRow = (index: number) =>
    requestAnimationFrame(() => {
      const row = rootRef.current?.querySelector(`[data-row-index="${index}"]`);
      row?.querySelector<HTMLElement>("input, button, [tabindex]")?.focus();
    });

  const add = () => {
    list.pushValue(newRow());
    setAnnouncement(labels.rowAdded(length + 1));
    focusRow(length);
  };
  const remove = (index: number) => {
    list.removeValue(index);
    setAnnouncement(labels.rowRemoved(index + 1));
    if (length > 1) focusRow(Math.max(0, index - 1));
    else
      requestAnimationFrame(() =>
        rootRef.current
          ?.querySelector<HTMLElement>("[data-slot=data-form-list-add]")
          ?.focus(),
      );
  };
  const move = (from: number, to: number) => {
    list.moveValue(from, to);
    focusRow(to);
  };

  return (
    <FieldSet
      ref={rootRef}
      data-slot="data-form-list"
      className={cn("gap-4", className)}
    >
      {label ? <FieldLegend variant="label">{label}</FieldLegend> : null}
      {description ? (
        <p className="-mt-2 text-muted-foreground text-sm">{description}</p>
      ) : null}
      {Array.from({ length }, (_, index) => {
        const row: DataFormListRow = {
          index,
          name: (key) => `${name}[${index}].${key}`,
          remove: () => remove(index),
        };
        return (
          <div
            // Rows are addressed by index, as TanStack Form's array fields are.
            // biome-ignore lint/suspicious/noArrayIndexKey: see above.
            key={index}
            data-slot="data-form-list-row"
            data-row-index={index}
            className="flex items-start gap-2"
          >
            <div className="grid min-w-0 flex-1 @lg/data-form:auto-cols-fr @lg/data-form:grid-flow-col gap-4">
              {children
                ? children(row)
                : fields.map((field) => (
                    <DataFormField
                      key={field.name}
                      {...field}
                      name={row.name(field.name)}
                    />
                  ))}
            </div>
            <div className="flex shrink-0 gap-1 pt-7">
              {sortable ? (
                <>
                  <IconAction
                    label={labels.moveUp}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    <ArrowUpIcon aria-hidden />
                  </IconAction>
                  <IconAction
                    label={labels.moveDown}
                    disabled={index === length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    <ArrowDownIcon aria-hidden />
                  </IconAction>
                </>
              ) : null}
              <IconAction
                label={labels.remove}
                disabled={length <= min}
                onClick={() => remove(index)}
              >
                <Trash2Icon aria-hidden />
              </IconAction>
            </div>
          </div>
        );
      })}
      <Button
        type="button"
        variant="outline"
        data-slot="data-form-list-add"
        className="self-start"
        disabled={length >= max}
        onClick={add}
      >
        <PlusIcon aria-hidden data-icon="inline-start" />
        {labels.add}
      </Button>
      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </FieldSet>
  );
}
