import { useEffect } from "react";
import { getPath, setPath } from "@/components/ui/data-form/path";
import type {
  DataFormFieldConfig,
  DataFormInstance,
  DataFormValues,
} from "@/components/ui/data-form/types";
import { useLatest } from "@/components/ui/data-form/use-field";
import { builtInValueTypes } from "@/components/ui/data-form/value-types";
import type {
  DataTableColumn,
  DataTableDataColumn,
  NormalizedColumn,
} from "@/components/ui/data-table/types";

/** Table state keys values by column id; reads them back out of a form. */
export function flatValues(
  values: DataFormValues,
  ids: readonly string[],
  prefix = "",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const id of ids) {
    const value = getPath(values, prefix + id);
    if (value !== undefined) result[id] = value;
  }
  return result;
}

/** Puts values keyed by column id into a form, where ids may be paths. */
export function nestedValues(
  flat: Readonly<Record<string, unknown>>,
  ids: readonly string[],
  prefix = "",
): DataFormValues {
  let result: DataFormValues = {};
  for (const id of ids)
    if (flat[id] !== undefined) result = setPath(result, prefix + id, flat[id]);
  return result;
}

/**
 * Keeps a form on values the table owns: when they change elsewhere (Clear
 * all, a chip, the address bar) the form resets to them; equal content is
 * left alone, so the form and the table never loop.
 */
export function useFormFromTable(
  form: DataFormInstance,
  values: DataFormValues,
) {
  const key = JSON.stringify(values);
  const latest = useLatest({ form, values });
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for `values`.
  useEffect(() => {
    const current = latest.current;
    if (JSON.stringify(current.form.api.state.values) !== key)
      current.form.reset(current.values);
  }, [key]);
}

/** Compares two value objects by content, to stop form-table sync loops. */
export function sameValues(a: unknown, b: unknown) {
  return JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});
}

/**
 * A DataForm field for a column's `search`. Values stay in the shapes the
 * table stores, such as local date strings, and functions keep receiving
 * values keyed by column id.
 */
export function searchField<TData>(
  column: NormalizedColumn<TData>,
  ids: readonly string[],
  prefix = "",
): DataFormFieldConfig {
  const search = column.search;
  if (!search) return { name: prefix + column.id };
  const {
    type,
    label,
    placeholder,
    initialValue: _initialValue,
    order: _order,
    colSpan,
    options,
    dependencies,
    presets,
    transform: _transform,
    match: _match,
    render,
    valueType: ownType,
    fieldProps,
    ...rest
  } = search;
  const flat = (values: DataFormValues) => flatValues(values, ids, prefix);
  // DataForm registers the table's search types under the same names.
  const valueType = ownType ?? (type === "custom" ? undefined : type);
  const base: Record<string, unknown> = {};
  if (valueType && builtInValueTypes[valueType]?.dateMode) {
    // Dates stay the local strings the table filters and URLs hold.
    base.valueFormat = "string";
    if (presets && valueType.endsWith("Range")) base.presets = presets;
  }
  return {
    ...rest,
    name: prefix + column.id,
    label: label ?? column.title,
    placeholder,
    valueType,
    colSpan,
    options:
      typeof options === "function"
        ? (values: DataFormValues) => options(flat(values))
        : options,
    dependencies: dependencies?.map((id) => prefix + id),
    clearOnChange: dependencies?.length ? true : rest.clearOnChange,
    fieldProps:
      typeof fieldProps === "function"
        ? (values: DataFormValues) => ({ ...base, ...fieldProps(values) })
        : { ...base, ...fieldProps },
    render: render
      ? (props) => render({ ...props, values: flat(props.values) })
      : undefined,
  };
}

/** The DataForm field for one data column, or undefined when it has none. */
export function columnField<TData>(
  config: DataTableColumn<TData>,
): DataFormFieldConfig | undefined {
  if (config.key === undefined) return undefined;
  const column = config as DataTableDataColumn<TData>;
  if (column.form === false) return undefined;
  const key = String(column.key);
  const valueType = column.valueType ?? (column.valueEnum ? "enum" : "text");
  return {
    name: key,
    label: column.title ?? key,
    tooltip: column.tooltip,
    // The table's names are DataForm value types too; a yes/no column edits
    // as a switch rather than a select.
    valueType: valueType === "boolean" ? "switch" : valueType,
    valueEnum: column.valueEnum,
    fieldProps: column.format ? { format: column.format } : undefined,
    ...column.form,
  };
}

/**
 * Fields for a create or edit form from the table's own columns, so one
 * definition serves the table, its filters and its forms. Display columns
 * and columns with `form: false` are left out.
 */
export function toFormFields<TData>(
  columns: readonly DataTableColumn<TData>[],
): DataFormFieldConfig[] {
  return columns.flatMap((config) => {
    const field = columnField(config);
    return field ? [field] : [];
  });
}
