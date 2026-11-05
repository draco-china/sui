"use client";

import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { useMemo } from "react";
import { DataFormFields } from "../../data-form/fields";
import {
  DataFormCollapseToggle,
  DataFormFooter,
  DataFormReset,
  DataFormRoot,
  DataFormSubmit,
} from "../../data-form/parts";
import { useDataForm } from "../../data-form/use-data-form";
import { tableFormLabels } from "../columns";
import { useDataTableContext } from "../context";
import {
  flatValues,
  nestedValues,
  searchField,
  useFormFromTable,
} from "../form-fields";
import type { DataTableInstance, DataTablePlugin } from "../types";

export interface QueryFormOptions {
  /** Start with only the first fields visible. */
  readonly collapsed?: boolean;
  /** Fields shown while collapsed; defaults to 3. */
  readonly collapsedCount?: number;
  /** Grid columns on wide screens; defaults to 4. */
  readonly columns?: 2 | 3 | 4;
}

function searchColumns(table: DataTableInstance<unknown>) {
  return table.columns
    .filter((column) => column.search)
    .map((column, index) => ({ column, index }))
    .sort(
      (a, b) =>
        (a.column.search?.order ?? a.index) -
        (b.column.search?.order ?? b.index),
    )
    .map((entry) => entry.column);
}

function initialSearch(columns: ReturnType<typeof searchColumns>) {
  const initial: Record<string, unknown> = {};
  for (const column of columns)
    if (column.search?.initialValue !== undefined)
      initial[column.id] = column.search.initialValue;
  return initial;
}

function QueryForm({ options }: { options: QueryFormOptions }) {
  const table = useDataTableContext();
  const mobile = useIsMobile();
  // biome-ignore lint/correctness/useExhaustiveDependencies: columns change with `table.columns`.
  const columns = useMemo(() => searchColumns(table), [table.columns]);
  const ids = useMemo(() => columns.map((column) => column.id), [columns]);
  const fields = useMemo(
    () => columns.map((column) => searchField(column, ids)),
    [columns, ids],
  );
  const labels = tableFormLabels(table.labels);
  const applied = table.state.query.search;
  const form = useDataForm({
    fields,
    labels,
    defaultValues: nestedValues(applied, ids),
    // Values already hold what the table stores, such as date strings.
    dateFormatter: false,
    onFinish: (values) => table.setSearch(flatValues(values, ids)),
  });
  // The table's search is the source of truth: a change from outside, such
  // as a removed chip, Clear all or the address bar, replaces the draft.
  useFormFromTable(form, nestedValues(applied, ids));
  const hasFields = fields.length > 0;
  if (!hasFields) return null;
  return (
    // DataForm animates the fields as they collapse and expand.
    <DataFormRoot
      form={form}
      layout="grid"
      columns={options.columns ?? 4}
      collapse={{
        // Phones keep one field so the rows stay in view.
        count: mobile ? 1 : (options.collapsedCount ?? 3),
        defaultCollapsed: options.collapsed ?? true,
      }}
      data-slot="data-table-query-form"
      className="shrink-0 rounded-xl border bg-card p-4"
    >
      <DataFormFields className="items-end">
        <DataFormFooter className="@lg/data-form:col-end-[-1]">
          <DataFormCollapseToggle />
          <DataFormReset
            onClick={(event) => {
              // Back to each field's `initialValue`, not the last search.
              event.preventDefault();
              const initial = initialSearch(columns);
              form.reset(nestedValues(initial, ids));
              table.setSearch(initial);
            }}
          />
          <DataFormSubmit>{labels.query}</DataFormSubmit>
        </DataFormFooter>
      </DataFormFields>
    </DataFormRoot>
  );
}

/**
 * A collapsible multi-field query form above the toolbar, built from columns
 * with `search`. Conditions apply together when the form is submitted.
 */
export function queryForm<TData>(
  options: QueryFormOptions = {},
): DataTablePlugin<TData> {
  return {
    name: "queryForm",
    slots: { header: () => <QueryForm options={options} /> },
  };
}
