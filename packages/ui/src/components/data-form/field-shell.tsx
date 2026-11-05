"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@workspace/ui/components/field";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "cn";
import { InfoIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  type DataFormLayout,
  useDataFormContext,
  useDataFormLayout,
} from "./context";
import type { DataFormLabels } from "./labels";
import type { FieldRuntime } from "./use-field";
import { ValueRead } from "./value-types";

// Grid spans by the form's container width; see `DataFormFields`.
const spans: Record<number, string> = {
  2: "@lg/data-form:col-span-2",
  3: "@lg/data-form:col-span-2 @3xl/data-form:col-span-3",
  4: "@lg/data-form:col-span-2 @3xl/data-form:col-span-3 @5xl/data-form:col-span-4",
};

export function spanClass(layout: DataFormLayout, colSpan?: number) {
  if (layout !== "grid" || !colSpan || colSpan < 2) return undefined;
  return spans[Math.min(colSpan, 4)];
}

function orientationOf(layout: DataFormLayout) {
  return layout === "horizontal" ? "responsive" : "vertical";
}

export interface FieldShellProps {
  readonly runtime: FieldRuntime;
  readonly label?: ReactNode;
  readonly description?: ReactNode;
  readonly tooltip?: ReactNode;
  /** `group` labels a control made of several inputs by id. */
  readonly labelTarget?: "control" | "group";
  /** Places the control beside the label, as for a checkbox or switch. */
  readonly inline?: "start" | "end";
  readonly colSpan?: number;
  readonly className?: string;
  /** The control, or the read-only value. */
  readonly children: ReactNode;
}

function LabelText({
  label,
  tooltip,
  required,
  labels,
}: {
  label: ReactNode;
  tooltip?: ReactNode;
  required: boolean;
  labels: DataFormLabels;
}) {
  return (
    <>
      {label}
      {required ? (
        <>
          <span aria-hidden className="text-destructive">
            *
          </span>
          <span className="sr-only">{labels.requiredMark}</span>
        </>
      ) : null}
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={labels.moreInfo}
                className="-my-1 text-muted-foreground"
              />
            }
          >
            <InfoIcon aria-hidden />
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : null}
    </>
  );
}

/**
 * One field's frame: label, control, description and error, in the order
 * the Field component lays them out. Read-only fields keep the label and
 * show the value in place of the control.
 */
export function FieldShell({
  runtime,
  label,
  description,
  tooltip,
  labelTarget = "control",
  inline,
  colSpan,
  className,
  children,
}: FieldShellProps) {
  const { layout } = useDataFormLayout();
  const { labels, loading } = useDataFormContext();
  const { state, ids, errors } = runtime;
  if (state.hidden) return null;
  const invalid = errors.length > 0;
  const readOnly = state.readonly;
  const labelContent =
    label == null ? null : (
      <LabelText
        label={label}
        tooltip={tooltip}
        required={state.required && !readOnly}
        labels={labels}
      />
    );
  // A group control (a date picker, a radio group) is named through
  // `aria-labelledby`, so its label carries an id but no `for`.
  let labelNode: ReactNode = null;
  if (labelContent && readOnly)
    labelNode = <FieldTitle id={ids.label}>{labelContent}</FieldTitle>;
  else if (labelContent)
    labelNode = (
      <FieldLabel
        id={ids.label}
        htmlFor={labelTarget === "group" ? undefined : ids.control}
      >
        {labelContent}
      </FieldLabel>
    );
  const descriptionNode = description ? (
    <FieldDescription id={ids.description}>{description}</FieldDescription>
  ) : null;
  const errorNode = invalid ? (
    <FieldError
      id={ids.error}
      errors={errors.map((message) => ({ message }))}
    />
  ) : null;
  const control = loading ? (
    <Skeleton className="h-9 w-full rounded-3xl" />
  ) : (
    children
  );
  const shared = {
    "data-slot": "data-form-field",
    "data-invalid": invalid || undefined,
    "data-disabled": state.disabled || undefined,
    "data-readonly": readOnly || undefined,
    hidden: !runtime.shown || undefined,
    className: cn("gap-2", spanClass(layout, colSpan), className),
  };

  if (inline && !readOnly)
    return (
      <Field {...shared} orientation="horizontal">
        {inline === "start" ? control : null}
        <FieldContent>
          {labelNode}
          {descriptionNode}
          {errorNode}
        </FieldContent>
        {inline === "end" ? control : null}
      </Field>
    );

  return (
    <Field {...shared} orientation={orientationOf(layout)}>
      {labelNode}
      {layout === "horizontal" ? (
        <FieldContent>
          {control}
          {descriptionNode}
          {errorNode}
        </FieldContent>
      ) : (
        <>
          {control}
          {descriptionNode}
          {errorNode}
        </>
      )}
    </Field>
  );
}

/** A field's read-only value, in the space its control would take. */
export function FieldValue({ runtime }: { runtime: FieldRuntime }) {
  return (
    <div data-slot="data-form-value" className="min-h-9 py-2 text-sm">
      <ValueRead type={runtime.type} {...runtime.readProps} />
    </div>
  );
}
