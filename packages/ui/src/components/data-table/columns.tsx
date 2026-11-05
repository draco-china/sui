"use client";

import { Badge } from "@workspace/ui/components/badge";
import { CopyText } from "@workspace/ui/components/copy-text";
import { LongText } from "@workspace/ui/components/long-text";
import type { ReactNode } from "react";
import {
  type DataFormLabels,
  dataFormLabelsZhCN,
  resolveDataFormLabels,
} from "../data-form/labels";
import { builtInValueTypes, valueText } from "../data-form/value-types";
import { findOption, nodeText } from "../data-form/value-types/shared";
import { getPath, isEmptyValue } from "./engine";
import type { DataTableLabels } from "./labels";
import type {
  DataTableColumn,
  DataTableDataColumn,
  DataTableDisplayColumn,
  DataTableOption,
  DataTableSearchType,
  DataTableValueType,
  NormalizedColumn,
} from "./types";

type Format = DataTableDataColumn<unknown>["format"];

interface FormatContext {
  readonly labels: DataTableLabels;
  readonly format: Format;
  readonly valueEnum?: readonly DataTableOption[];
}

const formLabelCache = new WeakMap<DataTableLabels, DataFormLabels>();

/** DataForm's labels with the table's locale and its shared words. */
export function tableFormLabels(labels: DataTableLabels): DataFormLabels {
  let cached = formLabelCache.get(labels);
  if (!cached) {
    const base = resolveDataFormLabels(
      labels.locale?.startsWith("zh") ? dataFormLabelsZhCN : undefined,
    );
    cached = {
      ...base,
      locale: labels.locale,
      yes: labels.yes,
      no: labels.no,
      any: labels.any,
      reset: labels.reset,
      query: labels.query,
      expand: labels.expand,
      collapse: labels.collapse,
      filters: labels.moreFilters,
      apply: labels.applyFilter,
      rangeStart: labels.rangeStart,
      rangeEnd: labels.rangeEnd,
      search: labels.optionSearch,
      noOptions: labels.noOptions,
      selected: labels.selected,
    };
    formLabelCache.set(labels, cached);
  }
  return cached;
}

const noFieldProps = {};

/**
 * Plain text of a value, shared by cells, chips and CSV exports. It goes
 * through DataForm's value types, which register the table's type names,
 * so a value reads the same in a table and in a read-only form.
 */
export function formatValue(
  valueType: DataTableValueType,
  value: unknown,
  context: FormatContext,
) {
  if (isEmptyValue(value)) return "";
  return valueText(builtInValueTypes[valueType], {
    value,
    options: context.valueEnum ?? [],
    fieldProps: context.format ? { format: context.format } : noFieldProps,
    labels: tableFormLabels(context.labels),
  });
}

function renderEnum(value: unknown, options?: readonly DataTableOption[]) {
  const option = options && findOption(options, value);
  if (!option) return String(value);
  return <Badge variant={option.color ?? "secondary"}>{option.label}</Badge>;
}

const defaultSearchTypes: Record<DataTableValueType, DataTableSearchType> = {
  text: "text",
  number: "numberRange",
  money: "numberRange",
  percent: "numberRange",
  date: "dateRange",
  datetime: "datetimeRange",
  enum: "select",
  boolean: "boolean",
};

/** Filter controls list an option by its text; table cells keep its label. */
export function optionText(option: DataTableOption) {
  return nodeText(option.label) || option.value;
}

function textOf(node: ReactNode, fallback: string) {
  return typeof node === "string" || typeof node === "number"
    ? String(node)
    : fallback;
}

/** Applies defaults: `valueEnum` implies an enum column with a quick filter. */
export function normalizeColumns<TData>(
  columns: readonly DataTableColumn<TData>[],
  labels: DataTableLabels,
): NormalizedColumn<TData>[] {
  return columns.map((config) => {
    if (config.key === undefined) {
      const display = config as DataTableDisplayColumn<TData>;
      return {
        id: display.id,
        title: display.title ?? "",
        titleText: textOf(display.title, display.id),
        valueType: "text",
        display: true,
        config,
        sortable: false,
        keyword: false,
        filter: false,
        searchOnly: false,
        renderCell: display.render,
        getValue: () => undefined,
        exportText: () => "",
      } satisfies NormalizedColumn<TData>;
    }
    const column = config as DataTableDataColumn<TData>;
    const key = String(column.key);
    const id = column.id ?? key;
    const valueType: DataTableValueType =
      column.valueType ?? (column.valueEnum ? "enum" : "text");
    const context: FormatContext = {
      labels,
      format: column.format,
      valueEnum: column.valueEnum,
    };
    const getValue = (row: TData) => getPath(row, key);
    const searchConfig =
      typeof column.search === "object" ? column.search : undefined;
    const search =
      column.search || column.searchOnly
        ? {
            ...searchConfig,
            type: searchConfig?.type ?? defaultSearchTypes[valueType],
            options: searchConfig?.options ?? column.valueEnum,
          }
        : undefined;
    const render = column.render as
      | ((value: unknown, row: TData, index: number) => ReactNode)
      | undefined;
    const exportValue = column.exportValue as
      | ((value: unknown, row: TData) => string)
      | undefined;
    function renderCell(row: TData, index: number): ReactNode {
      const value = getValue(row);
      if (render) return render(value, row, index);
      if (isEmptyValue(value))
        return <span className="text-muted-foreground">-</span>;
      if (valueType === "enum") return renderEnum(value, column.valueEnum);
      const text = formatValue(valueType, value, context);
      if (column.copyable) return <CopyText>{text}</CopyText>;
      if (column.ellipsis) return <LongText>{text}</LongText>;
      return text;
    }
    return {
      id,
      key,
      title: column.title ?? key,
      titleText: textOf(column.title, key),
      valueType,
      valueEnum: column.valueEnum,
      display: false,
      config,
      search,
      sortable: !!column.sortable || !!column.sorter,
      keyword: !!column.keyword,
      filter:
        column.filter === undefined
          ? valueType === "enum" && !!column.valueEnum
          : column.filter !== false,
      filterMode: typeof column.filter === "string" ? column.filter : undefined,
      searchOnly: !!column.searchOnly,
      renderCell,
      getValue,
      exportText: (row) => {
        const value = getValue(row);
        if (exportValue) return exportValue(value, row);
        return formatValue(valueType, value, context);
      },
    } satisfies NormalizedColumn<TData>;
  });
}

/**
 * A fixed-width column for plugin controls such as checkboxes and handles,
 * left out of column settings and exports. It sits at the start unless
 * `layout.fixed` is `"end"`.
 */
export function utilityColumn<TData>(
  id: string,
  renderCell: (row: TData, index: number) => ReactNode,
  title: ReactNode = "",
  layout: Pick<DataTableDisplayColumn<TData>, "width" | "align" | "fixed"> = {},
): NormalizedColumn<TData> {
  return {
    id,
    title,
    titleText: "",
    valueType: "text",
    display: true,
    utility: true,
    config: { id, width: 40, render: () => null, ...layout },
    sortable: false,
    keyword: false,
    filter: false,
    searchOnly: false,
    getValue: () => undefined,
    exportText: () => "",
    renderCell,
  };
}
