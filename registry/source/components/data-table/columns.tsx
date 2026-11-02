"use client";

import { Badge } from "@/components/ui/badge";
import { InlineCopyText } from "@/components/ui/inline-copy-text";
import { LongText } from "@/components/ui/long-text";
import type { ReactNode } from "react";
import { getPath, isEmptyValue, toTime } from "@/components/ui/data-table/engine";
import type { DataTableLabels } from "@/components/ui/data-table/labels";
import type {
  DataTableColumn,
  DataTableDataColumn,
  DataTableDisplayColumn,
  DataTableOption,
  DataTableSearchType,
  DataTableValueType,
  NormalizedColumn,
} from "@/components/ui/data-table/types";

type Format = DataTableDataColumn<unknown>["format"];

interface FormatContext {
  readonly locale: string | undefined;
  readonly labels: DataTableLabels;
  readonly format: Format;
  readonly valueEnum?: readonly DataTableOption[];
}

function formatNumber(value: unknown, locale?: string, options?: Format) {
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return new Intl.NumberFormat(locale, options).format(number);
}

// toTime reads a calendar date as local midnight, so it formats as that day.
function formatDate(value: unknown, locale?: string, options?: Format) {
  const time = toTime(value);
  if (time === undefined) return String(value);
  return new Intl.DateTimeFormat(locale, options).format(time);
}

function optionLabel(value: unknown, options?: readonly DataTableOption[]) {
  return options?.find((option) => option.value === String(value));
}

/** Plain text of a value, shared by cells, chips and CSV exports. */
const textFormatters: Record<
  DataTableValueType,
  (value: unknown, context: FormatContext) => string
> = {
  text: (value) => String(value),
  number: (value, { locale, format }) => formatNumber(value, locale, format),
  money: (value, { locale, format }) =>
    formatNumber(value, locale, {
      style: "currency",
      currency: "USD",
      ...format,
    }),
  percent: (value, { locale, format }) =>
    formatNumber(Number(value) / 100, locale, {
      style: "percent",
      maximumFractionDigits: 2,
      ...format,
    }),
  date: (value, { locale, format }) =>
    formatDate(value, locale, format ?? { dateStyle: "medium" }),
  datetime: (value, { locale, format }) =>
    formatDate(
      value,
      locale,
      format ?? { dateStyle: "medium", timeStyle: "short" },
    ),
  enum: (value, { valueEnum }) => {
    const label = optionLabel(value, valueEnum)?.label;
    return typeof label === "string" ? label : String(value);
  },
  boolean: (value, { labels }) => (value ? labels.yes : labels.no),
};

export function formatValue(
  valueType: DataTableValueType,
  value: unknown,
  context: FormatContext,
) {
  if (isEmptyValue(value)) return "";
  return textFormatters[valueType](value, context);
}

function renderEnum(value: unknown, options?: readonly DataTableOption[]) {
  const option = optionLabel(value, options);
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
  const locale = labels.locale;
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
      locale,
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
      if (column.copyable) return <InlineCopyText>{text}</InlineCopyText>;
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
      filter: column.filter ?? (valueType === "enum" && !!column.valueEnum),
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

/** A fixed-width column for plugin controls such as checkboxes and handles. */
export function utilityColumn<TData>(
  id: string,
  renderCell: (row: TData, index: number) => ReactNode,
  title: ReactNode = "",
): NormalizedColumn<TData> {
  return {
    id,
    title,
    titleText: "",
    valueType: "text",
    display: true,
    utility: true,
    config: { id, width: 40, render: () => null },
    sortable: false,
    keyword: false,
    filter: false,
    searchOnly: false,
    getValue: () => undefined,
    exportText: () => "",
    renderCell,
  };
}
