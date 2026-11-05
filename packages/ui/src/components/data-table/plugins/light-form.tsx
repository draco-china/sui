"use client";

import { Label } from "@workspace/ui/components/label";
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query";
import { type ReactNode, useMemo } from "react";
import { isEmptyValue } from "../../data-form/conditions";
import { useDataFormLayout } from "../../data-form/context";
import { DataFormFields } from "../../data-form/fields";
import { DataFormRoot } from "../../data-form/parts";
import { getPath, setPath } from "../../data-form/path";
import type {
  DataFormFieldConfig,
  DataFormValues,
} from "../../data-form/types";
import { useDataForm } from "../../data-form/use-data-form";
import {
  builtInValueTypes,
  type ValueEditProps,
  type ValueTypeMap,
} from "../../data-form/value-types";
import { ariaProps } from "../../data-form/value-types/shared";
import { tableFormLabels } from "../columns";
import { useDataTableContext } from "../context";
import {
  DataTableOptionList,
  DataTableOptionSelect,
  DataTableValueControl,
  isRangeColumn,
} from "../filter-controls";
import { sameValues, useFormFromTable } from "../form-fields";
import type {
  DataTableInstance,
  DataTableOption,
  DataTablePlugin,
  NormalizedColumn,
} from "../types";

export interface LightFormOptions {
  /**
   * Filters on the toolbar row; past this the first stays and the rest
   * share one Filters button. Defaults to 2.
   */
  readonly maxFilters?: number;
}

/** Below `sm`, where the toolbar row has room for little beside the search. */
export function useNarrowToolbar() {
  return !!useMediaQuery("(max-width: 639px)");
}

/**
 * A quick filter's options: a searchable list with counts in its popover on
 * the row, a dropdown of checkable options inline (label inside) and in the
 * Filters panel.
 */
function FacetEdit(props: ValueEditProps) {
  const { layout } = useDataFormLayout();
  const table = useDataTableContext();
  const column = String(props.fieldProps.column ?? props.name);
  const value = Array.isArray(props.value) ? props.value.map(String) : [];
  const onChange = (next: string[]) =>
    props.onChange(next.length ? next : undefined);
  const options = props.options as readonly DataTableOption[];
  if (layout === "light" && !props.prefix)
    return (
      <DataTableOptionList
        options={options}
        value={value}
        counts={table.getFacets(column)}
        onChange={onChange}
      />
    );
  return (
    <DataTableOptionSelect
      id={props.id}
      // Its name: inline, the prefix is only seen, so the label is read.
      {...ariaProps(props)}
      options={options}
      value={value}
      onChange={onChange}
      prefix={props.prefix}
      // On the row it is about as wide as a quick filter button.
      className={props.prefix ? "w-auto min-w-40" : undefined}
    />
  );
}

/** The quick filter as a value type, so light rows treat it like the rest. */
const facetValueTypes: ValueTypeMap = {
  tableFacet: {
    edit: (props) => <FacetEdit {...props} />,
    text: builtInValueTypes.multiSelect.text,
    prefix: true,
    clears: true,
  },
};

interface Overrides {
  readonly label?: ReactNode;
  readonly options?: readonly DataTableOption[];
}

/** Date ranges are `search.<id>`, quick filters `filters.<id>`. */
function fieldName(column: NormalizedColumn<unknown>) {
  return `${isRangeColumn(column) ? "search" : "filters"}.${column.id}`;
}

function lightField(
  column: NormalizedColumn<unknown>,
  overrides: Overrides | undefined,
): DataFormFieldConfig {
  const label = overrides?.label ?? column.title;
  if (isRangeColumn(column))
    return {
      name: fieldName(column),
      label,
      // `dateRange` or `datetimeRange`, names DataForm registers too.
      valueType: column.search?.type,
      lightMode: column.search?.lightMode,
      fieldProps: {
        valueFormat: "string",
        presets: column.search?.presets,
        // As wide as the search box, so the row lines up.
        className: "w-40 shrink-0 sm:w-64",
      },
    };
  return {
    name: fieldName(column),
    label,
    valueType: "tableFacet",
    lightMode: column.filterMode,
    options: overrides?.options ?? column.valueEnum ?? [],
    fieldProps: { column: column.id },
  };
}

/** The table's current values for these filters, in form shape. */
function formValues(
  table: DataTableInstance<unknown>,
  columns: readonly NormalizedColumn<unknown>[],
) {
  const { search, filters } = table.state.query;
  let values: DataFormValues = {};
  for (const column of columns) {
    let value: unknown = search[column.id];
    if (!isRangeColumn(column)) value = filters[column.id];
    if (!isEmptyValue(value))
      values = setPath(values, fieldName(column), value);
  }
  return values;
}

export interface DataTableLightFiltersProps {
  /** Column ids; defaults to date ranges, then quick filters. */
  readonly columns?: readonly string[];
  readonly maxFilters?: number;
  /** Per-column label and options, such as for a standalone filter. */
  readonly overrides?: Readonly<Record<string, Overrides>>;
}

/**
 * Toolbar filters as a light DataForm: each condition is a compact button
 * that applies at once, date ranges sit on the row, and filters past
 * `maxFilters` share one Filters panel that applies them together. The
 * table's query stays the single source of the values.
 */
export function DataTableLightFilters({
  columns: ids,
  maxFilters = 2,
  overrides,
}: DataTableLightFiltersProps) {
  const table = useDataTableContext() as DataTableInstance<unknown>;
  const narrow = useNarrowToolbar();
  const hasQueryForm = table.hasPlugin("queryForm");
  // Date ranges first, then quick filters; the query form already holds
  // the search fields, date ranges among them.
  const columns = useMemo(() => {
    if (ids)
      return ids.flatMap((id) => {
        const column = table.columns.find((entry) => entry.id === id);
        return column ? [column] : [];
      });
    return [
      ...(hasQueryForm ? [] : table.columns.filter(isRangeColumn)),
      ...table.columns.filter((column) => column.filter),
    ];
  }, [table.columns, ids, hasQueryForm]);
  const fields = useMemo(
    () => columns.map((column) => lightField(column, overrides?.[column.id])),
    [columns, overrides],
  );
  const current = formValues(table, columns);
  const form = useDataForm({
    fields,
    labels: tableFormLabels(table.labels),
    valueTypes: facetValueTypes,
    defaultValues: current,
    submitOn: "change",
    dateFormatter: false,
    onFinish: (values) =>
      table.setState((state) => {
        const filters = { ...state.query.filters };
        const search = { ...state.query.search };
        for (const column of columns) {
          const value = getPath(values, fieldName(column));
          if (!isRangeColumn(column))
            filters[column.id] = Array.isArray(value) ? value.map(String) : [];
          else if (isEmptyValue(value)) delete search[column.id];
          else search[column.id] = value;
        }
        const query = { ...state.query, filters, search };
        if (sameValues(query, state.query)) return state;
        return { ...state, page: 1, query };
      }),
  });
  useFormFromTable(form, current);

  if (columns.length === 0) return null;
  // On phones the row keeps the search: every filter waits in Filters.
  // Filters marked `more` never count toward the row.
  const onRow = columns.filter(
    (column) =>
      (isRangeColumn(column) ? column.search?.lightMode : column.filterMode) !==
      "more",
  ).length;
  const inline = narrow ? 0 : onRow;
  const limit = Math.max(0, Math.floor(maxFilters));
  const count = inline > limit ? Math.max(0, limit - 1) : inline;
  return (
    <DataFormRoot
      form={form}
      layout="light"
      size="sm"
      collapse={{ count }}
      data-slot="data-table-light-form"
      // The toolbar strip lays the filters out; the form adds no box.
      className="contents"
    >
      <DataFormFields className="contents" />
    </DataFormRoot>
  );
}

/** Quick multi-select filter for one column, with option counts. */
export function DataTableFacetedFilter({
  column,
  title,
  options,
}: {
  column: string;
  title?: ReactNode;
  options?: readonly DataTableOption[];
}) {
  const overrides = useMemo(
    () => ({ [column]: { label: title, options } }),
    [column, title, options],
  );
  const columns = useMemo(() => [column], [column]);
  return (
    <DataTableLightFilters
      columns={columns}
      maxFilters={1}
      overrides={overrides}
    />
  );
}

/** A date range filter on the toolbar row, as wide as the search box. */
export function DataTableRangeFilter({ column }: { column: string }) {
  const columns = useMemo(() => [column], [column]);
  return <DataTableLightFilters columns={columns} maxFilters={1} />;
}

/** Filters behind one button, applied together. */
export function DataTableMoreFilters({
  columns,
}: {
  columns: readonly string[];
}) {
  return <DataTableLightFilters columns={columns} maxFilters={0} />;
}

/**
 * Conditions in a filter panel, one row each: the label beside a date range
 * or a dropdown of checkable options. Controlled; for panels of your own.
 */
export function DataTableFilterFields({
  idPrefix,
  columns,
  value,
  onChange,
}: {
  idPrefix: string;
  columns: readonly NormalizedColumn<unknown>[];
  value: Record<string, unknown>;
  onChange: (column: string, value: unknown) => void;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2">
      {columns.map((column) => {
        const id = `${idPrefix}-${column.id}`;
        return (
          <div key={column.id} className="contents">
            <Label htmlFor={id} className="font-normal text-muted-foreground">
              {column.title}
            </Label>
            {isRangeColumn(column) ? (
              <DataTableValueControl
                id={id}
                type={column.search?.type ?? "dateRange"}
                label={column.titleText}
                value={value[column.id]}
                onChange={(next) => onChange(column.id, next)}
                fieldProps={{
                  presets: column.search?.presets,
                  className: "w-full",
                }}
              />
            ) : (
              <DataTableOptionSelect
                id={id}
                options={column.valueEnum ?? []}
                value={(value[column.id] as readonly string[]) ?? []}
                onChange={(next) => onChange(column.id, next)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Toolbar filters with options. The toolbar has them without the plugin;
 * add it to set `maxFilters` alongside other plugins.
 */
export function lightForm<TData>(
  options: LightFormOptions = {},
): DataTablePlugin<TData> {
  return {
    name: "lightForm",
    slots: {
      toolbarFilters: () => (
        <DataTableLightFilters maxFilters={options.maxFilters} />
      ),
    },
  };
}
