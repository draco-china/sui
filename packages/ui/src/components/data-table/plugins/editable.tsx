"use client";

import { useSelector } from "@tanstack/react-form";
import { Button } from "@workspace/ui/components/button";
import { FieldError } from "@workspace/ui/components/field";
import { Loader } from "@workspace/ui/components/loader";
import { CheckIcon, PencilIcon, XIcon } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  createPluginStore,
  DataFormLayoutProvider,
  DataFormProvider,
} from "../../data-form/context";
import { readServerErrors } from "../../data-form/engine";
import { pickPaths } from "../../data-form/path";
import type {
  DataFormFieldConfig,
  DataFormInstance,
  DataFormPluginStore,
  DataFormValues,
} from "../../data-form/types";
import { useDataForm } from "../../data-form/use-data-form";
import { useFieldRuntime } from "../../data-form/use-field";
import { renderControl, ValueRead } from "../../data-form/value-types";
import { tableFormLabels, utilityColumn } from "../columns";
import { useDataTableContext } from "../context";
import { columnField, toFormFields } from "../form-fields";
import { DataTableIconTooltip } from "../icon-tooltip";
import type { DataTableInstance, DataTablePlugin } from "../types";

export interface EditableOptions<TData> {
  /**
   * Saves a row. Return or throw `{ fields, form }` to show errors in the
   * row; the row stays open until a save succeeds.
   */
  readonly onSave: (row: TData, values: DataFormValues) => unknown;
  /** Whether a row can be edited; defaults to every row. */
  readonly canEdit?: (row: TData) => boolean;
}

interface OpenRow {
  readonly id: string;
  readonly row: unknown;
}

const OPEN = "open";
const FORM = "form";

function openRow(store: DataFormPluginStore) {
  return store.get<OpenRow>(OPEN);
}

/** Whether this row is open; a cell renders again only when that flips. */
function useIsOpen(store: DataFormPluginStore, id: string) {
  const read = () => openRow(store)?.id === id;
  return useSyncExternalStore(store.subscribe, read, read);
}

function close(store: DataFormPluginStore) {
  store.set<OpenRow | undefined>(OPEN, undefined);
}

/** Owns the open row's form, so every cell of the row binds to it. */
function useEditForm<TData>(
  table: DataTableInstance<TData>,
  store: DataFormPluginStore,
  options: EditableOptions<TData>,
) {
  const open = useSyncExternalStore(
    store.subscribe,
    () => openRow(store),
    () => undefined,
  );
  const fields = useMemo(
    () => toFormFields(table.columns.map((column) => column.config)),
    [table.columns],
  );
  const form = useDataForm({
    fields,
    labels: tableFormLabels(table.labels),
    access: table.access,
    onFinish: async (values) => {
      const result = await options.onSave(openRow(store)?.row as TData, values);
      if (!readServerErrors(result)) close(store);
      return result;
    },
  }) as unknown as DataFormInstance;
  useEffect(() => store.set(FORM, form), [form, store]);
  // Opening a row loads its values; closing clears them.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only the open row matters.
  useEffect(() => {
    form.reset(
      open
        ? pickPaths<DataFormValues>(
            open.row,
            fields.map((field) => field.name),
          )
        : {},
    );
  }, [open?.id]);
}

const formLayout = { layout: "vertical" as const, columns: 1 as const };

/**
 * Enter saves and Escape cancels, as in a spreadsheet, for keys from the
 * cell's own control. A popup's keys (an option list, a calendar) and a
 * key that opens one belong to that control.
 */
function rowKey(event: KeyboardEvent<HTMLElement>) {
  if (event.defaultPrevented || event.nativeEvent.isComposing) return undefined;
  const target = event.target as HTMLElement;
  // Portaled popups bubble here through React, not through the cell.
  if (!event.currentTarget.contains(target)) return undefined;
  if (target.getAttribute("aria-expanded") === "true") return undefined;
  if (event.key === "Escape") return "cancel";
  const textEntry =
    target instanceof HTMLInputElement &&
    target.getAttribute("role") !== "combobox";
  if (event.key === "Enter" && textEntry) return "save";
  return undefined;
}

function EditField({ config }: { config: DataFormFieldConfig }) {
  const runtime = useFieldRuntime(config);
  const { state, type, ids, errors, editProps } = runtime;
  if (state.readonly) return <ValueRead type={type} {...runtime.readProps} />;
  return (
    <div className="flex min-w-32 flex-col gap-1 whitespace-normal">
      {renderControl(config.render, type, config.valueType, {
        ...editProps,
        // A cell has no visible label; the control names itself.
        labelledBy: "",
        describedBy: errors.length ? ids.error : undefined,
      })}
      {errors.length ? (
        <FieldError
          id={ids.error}
          errors={errors.map((message) => ({ message }))}
        />
      ) : null}
    </div>
  );
}

function EditableCell({
  store,
  field,
  row,
  index,
  original,
}: {
  store: DataFormPluginStore;
  field: DataFormFieldConfig;
  row: unknown;
  index: number;
  original: (row: unknown, index: number) => ReactNode;
}) {
  const table = useDataTableContext();
  const open = useIsOpen(store, table.getRowId(row as never, index));
  const form = store.get<DataFormInstance>(FORM);
  if (!open || !form) return original(row, index);
  const keyDown = (event: KeyboardEvent<HTMLElement>) => {
    const action = rowKey(event);
    if (action === "save") {
      event.preventDefault();
      void form.submit();
    }
    if (action === "cancel") close(store);
  };
  return (
    <DataFormProvider form={form}>
      <DataFormLayoutProvider value={formLayout}>
        {/* Keys from the control inside; see `rowKey`. */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: see above. */}
        <div onKeyDown={keyDown}>
          <EditField config={field} />
        </div>
      </DataFormLayoutProvider>
    </DataFormProvider>
  );
}

/** Cancel and Save for the open row; only that row follows the form. */
function OpenRowActions({
  store,
  form,
}: {
  store: DataFormPluginStore;
  form: DataFormInstance;
}) {
  const { labels } = useDataTableContext();
  const submitting = useSelector(form.api.store, (state) => state.isSubmitting);
  return (
    <div className="flex items-center justify-end gap-1">
      <DataTableIconTooltip
        label={labels.cancelEdit}
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={labels.cancelEdit}
            disabled={submitting}
            onClick={() => close(store)}
          />
        }
      >
        <XIcon aria-hidden />
      </DataTableIconTooltip>
      <DataTableIconTooltip
        label={labels.save}
        render={
          <Button
            size="icon-sm"
            aria-label={labels.save}
            aria-busy={submitting || undefined}
            disabled={submitting}
            onClick={() => void form.submit()}
          />
        }
      >
        {submitting ? (
          <Loader size="sm" label={labels.save} />
        ) : (
          <CheckIcon aria-hidden />
        )}
      </DataTableIconTooltip>
    </div>
  );
}

function RowActions<TData>({
  store,
  row,
  index,
  options,
}: {
  store: DataFormPluginStore;
  row: TData;
  index: number;
  options: EditableOptions<TData>;
}) {
  const table = useDataTableContext() as DataTableInstance<TData>;
  const id = table.getRowId(row, index);
  const open = useIsOpen(store, id);
  const form = store.get<DataFormInstance>(FORM);
  if (open && form) return <OpenRowActions store={store} form={form} />;
  const { labels } = table;
  return (
    <DataTableIconTooltip
      label={labels.edit}
      render={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={labels.edit}
          disabled={options.canEdit ? !options.canEdit(row) : false}
          onClick={() => store.set<OpenRow>(OPEN, { id, row })}
        />
      }
    >
      <PencilIcon aria-hidden />
    </DataTableIconTooltip>
  );
}

/**
 * Edits a row in place. Each data column becomes the control of its value
 * type, validated and linked like any DataForm field; `form` on a column
 * adds field options or leaves it read-only (`form: false`), and the
 * table's `access` applies. One row is open at a time.
 */
export function editable<TData>(
  options: EditableOptions<TData>,
): DataTablePlugin<TData> {
  const store = createPluginStore();
  return {
    name: "editable",
    setup: (table) => useEditForm(table, store, options),
    columns: (columns) => [
      ...columns.map((column) => {
        // Built once per column, not per cell.
        const field = columnField(column.config);
        if (!field) return column;
        const original = column.renderCell as (
          row: unknown,
          index: number,
        ) => ReactNode;
        return {
          ...column,
          renderCell: (row: TData, index: number) => (
            <EditableCell
              store={store}
              field={field}
              row={row}
              index={index}
              original={original}
            />
          ),
        };
      }),
      utilityColumn<TData>(
        "__edit",
        (row, index) => (
          <RowActions store={store} row={row} index={index} options={options} />
        ),
        "",
        // Pinned to the end, so the row's actions stay in reach of a wide table.
        { width: 96, align: "end", fixed: "end" },
      ),
    ],
  };
}
