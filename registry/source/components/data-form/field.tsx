"use client";

import { memo } from "react";
import { useDataFormLayout } from "@/components/ui/data-form/context";
import { FieldShell, FieldValue } from "@/components/ui/data-form/field-shell";
import { LightField } from "@/components/ui/data-form/light-field";
import type { DataFormFieldConfig } from "@/components/ui/data-form/types";
import { useFieldRuntime } from "@/components/ui/data-form/use-field";
import { renderControl } from "@/components/ui/data-form/value-types";

export interface DataFormFieldProps extends DataFormFieldConfig {}

/**
 * One field by its value type, the same shape as an item of `fields`:
 * `<DataFormField name="role" valueType="select" valueEnum={roles} />`.
 */
export const DataFormField = memo(function DataFormField(
  props: DataFormFieldProps,
) {
  const { layout } = useDataFormLayout();
  const runtime = useFieldRuntime(props);
  const { state, type } = runtime;

  if (layout === "light")
    return <LightField config={props} runtime={runtime} />;

  return (
    <FieldShell
      runtime={runtime}
      label={props.label ?? props.name}
      description={props.description}
      tooltip={props.tooltip}
      labelTarget={props.render ? "control" : type.labelTarget}
      inline={type.inline}
      colSpan={props.colSpan}
      className={props.className}
    >
      {state.readonly ? (
        <FieldValue runtime={runtime} />
      ) : (
        renderControl(props.render, type, props.valueType, runtime.editProps)
      )}
    </FieldShell>
  );
});
