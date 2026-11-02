import type {
  DataTableQuery,
  DataTableSearchType,
  FilterGroup,
  FilterOperator,
  FilterRule,
  NormalizedColumn,
  SortItem,
} from "@/components/ui/data-table/types";

/** Reads a dot path such as `profile.city`. */
export function getPath(row: unknown, path: string): unknown {
  let value = row;
  for (const part of path.split(".")) {
    if (value === null || value === undefined) return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true;
  if (Array.isArray(value)) return value.every(isEmptyValue);
  return false;
}

export function toTime(value: unknown): number | undefined {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value !== "string" || value === "") return undefined;
  // Date-only strings parse as UTC midnight; read them as local days instead.
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (day) return new Date(+day[1], +day[2] - 1, +day[3]).getTime();
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : time;
}

function toNumber(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isNaN(number) ? undefined : number;
}

function includesText(cell: unknown, value: unknown) {
  return String(cell ?? "")
    .toLocaleLowerCase()
    .includes(String(value).toLocaleLowerCase());
}

/** A date input value covers its whole day; a datetime value is exact. */
function rangeEnd(value: unknown, wholeDay: boolean) {
  const time = toTime(value);
  if (time === undefined || !wholeDay) return time;
  return time + 24 * 60 * 60 * 1000 - 1;
}

function inRange(
  cell: number | undefined,
  start: number | undefined,
  end: number | undefined,
) {
  if (cell === undefined) return false;
  if (start !== undefined && cell < start) return false;
  if (end !== undefined && cell > end) return false;
  return true;
}

function asRange(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

const searchMatchers: Record<
  DataTableSearchType,
  (cell: unknown, value: unknown) => boolean
> = {
  text: includesText,
  number: (cell, value) => toNumber(cell) === toNumber(value),
  numberRange: (cell, value) => {
    const [start, end] = asRange(value);
    return inRange(toNumber(cell), toNumber(start), toNumber(end));
  },
  select: (cell, value) => String(cell) === String(value),
  multiSelect: (cell, value) =>
    asRange(value).some((item) => String(item) === String(cell)),
  date: (cell, value) =>
    inRange(toTime(cell), toTime(value), rangeEnd(value, true)),
  dateRange: (cell, value) => {
    const [start, end] = asRange(value);
    return inRange(toTime(cell), toTime(start), rangeEnd(end, true));
  },
  datetimeRange: (cell, value) => {
    const [start, end] = asRange(value);
    return inRange(toTime(cell), toTime(start), rangeEnd(end, false));
  },
  boolean: (cell, value) => String(Boolean(cell)) === String(value),
  custom: (cell, value) => String(cell) === String(value),
};

export function matchesSearch(
  type: DataTableSearchType,
  cell: unknown,
  value: unknown,
) {
  return searchMatchers[type](cell, value);
}

function compareValues(a: unknown, b: unknown) {
  const left = toNumber(a) ?? toTime(a);
  const right = toNumber(b) ?? toTime(b);
  if (left !== undefined && right !== undefined) return left - right;
  return String(a ?? "").localeCompare(String(b ?? ""));
}

const ruleMatchers: Record<
  FilterRule["operator"],
  (cell: unknown, value: unknown) => boolean
> = {
  eq: (cell, value) => compareValues(cell, value) === 0,
  neq: (cell, value) => compareValues(cell, value) !== 0,
  contains: includesText,
  startsWith: (cell, value) =>
    String(cell ?? "")
      .toLocaleLowerCase()
      .startsWith(String(value).toLocaleLowerCase()),
  gt: (cell, value) => compareValues(cell, value) > 0,
  gte: (cell, value) => compareValues(cell, value) >= 0,
  lt: (cell, value) => compareValues(cell, value) < 0,
  lte: (cell, value) => compareValues(cell, value) <= 0,
  between: (cell, value) => {
    const [start, end] = asRange(value);
    const afterStart = isEmptyValue(start) || compareValues(cell, start) >= 0;
    const beforeEnd = isEmptyValue(end) || compareValues(cell, end) <= 0;
    return afterStart && beforeEnd;
  },
  in: (cell, value) =>
    asRange(value).some((item) => String(item) === String(cell)),
  notIn: (cell, value) =>
    !asRange(value).some((item) => String(item) === String(cell)),
  isEmpty: (cell) => isEmptyValue(cell),
};

export function isFilterOperator(value: unknown): value is FilterOperator {
  return typeof value === "string" && Object.hasOwn(ruleMatchers, value);
}

export function matchesRule(rule: FilterRule, cell: unknown) {
  if (rule.operator !== "isEmpty" && isEmptyValue(rule.value)) return true;
  return ruleMatchers[rule.operator](cell, rule.value);
}

function matchesGroup<TData>(
  row: TData,
  group: FilterGroup,
  columns: ReadonlyMap<string, NormalizedColumn<TData>>,
) {
  const results = group.rules.map((rule) => {
    const column = columns.get(rule.field);
    return column ? matchesRule(rule, column.getValue(row)) : true;
  });
  if (results.length === 0) return true;
  return group.logic === "or" ? results.some(Boolean) : results.every(Boolean);
}

/** Applies keyword, query form, quick filters and advanced rules with AND. */
export function filterRows<TData>(
  rows: readonly TData[],
  columns: readonly NormalizedColumn<TData>[],
  query: DataTableQuery,
): TData[] {
  const byId = new Map(columns.map((column) => [column.id, column]));
  const keyword = query.keyword.trim();
  const keywordColumns = columns.filter((column) => column.keyword);
  const searches = Object.entries(query.search).flatMap(([id, value]) => {
    const column = byId.get(id);
    if (!column?.search || isEmptyValue(value)) return [];
    return [{ column, value, search: column.search }];
  });
  const filters = Object.entries(query.filters).flatMap(([id, values]) => {
    const column = byId.get(id);
    return column && values.length > 0 ? [{ column, values }] : [];
  });
  return rows.filter((row) => {
    if (
      keyword &&
      !keywordColumns.some((column) =>
        includesText(column.getValue(row), keyword),
      )
    )
      return false;
    for (const { column, value, search } of searches) {
      const cell = column.getValue(row);
      const matched = search.match
        ? search.match(cell, value)
        : matchesSearch(search.type, cell, value);
      if (!matched) return false;
    }
    for (const { column, values } of filters) {
      if (!values.includes(String(column.getValue(row)))) return false;
    }
    return query.advanced ? matchesGroup(row, query.advanced, byId) : true;
  });
}

export function sortRows<TData>(
  rows: readonly TData[],
  columns: readonly NormalizedColumn<TData>[],
  sort: readonly SortItem[],
): TData[] {
  const sorters = sort.flatMap((item) => {
    const column = columns.find((entry) => entry.id === item.key);
    if (!column) return [];
    const direction = item.order === "asc" ? 1 : -1;
    const config = column.config as { sorter?: (a: TData, b: TData) => number };
    const compare =
      config.sorter ??
      ((a: TData, b: TData) =>
        compareValues(column.getValue(a), column.getValue(b)));
    return [(a: TData, b: TData) => compare(a, b) * direction];
  });
  if (sorters.length === 0) return [...rows];
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      for (const sorter of sorters) {
        const result = sorter(a.row, b.row);
        if (result !== 0) return result;
      }
      return a.index - b.index;
    })
    .map((entry) => entry.row);
}

export function countFacets<TData>(
  rows: readonly TData[],
  column: NormalizedColumn<TData>,
) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = String(column.getValue(row));
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/** Query form values as request parameters, after each field's transform. */
export function requestSearch<TData>(
  columns: readonly NormalizedColumn<TData>[],
  search: Readonly<Record<string, unknown>>,
) {
  const result: Record<string, unknown> = {};
  for (const [id, value] of Object.entries(search)) {
    if (isEmptyValue(value)) continue;
    const transform = columns.find((column) => column.id === id)?.search
      ?.transform;
    if (transform) Object.assign(result, transform(value));
    else result[id] = value;
  }
  return result;
}

// Spreadsheets run a cell that starts with =, +, @, a tab or a return as a
// formula, and one that starts with - when an operator follows; plain
// negative numbers stay numbers.
const formulaStart = /^[=+@\t\r]|^-.*[=+*/^&|!@(]/;

function csvCell(value: string) {
  const safe = formulaStart.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** CSV with a byte order mark so spreadsheet apps read UTF-8. */
export function toCsv<TData>(
  rows: readonly TData[],
  columns: readonly NormalizedColumn<TData>[],
) {
  const dataColumns = columns.filter((column) => !column.display);
  const lines = [
    dataColumns.map((column) => csvCell(column.titleText)).join(","),
    ...rows.map((row) =>
      dataColumns.map((column) => csvCell(column.exportText(row))).join(","),
    ),
  ];
  return `﻿${lines.join("\r\n")}`;
}

export function downloadText(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  // Revoking right away can cancel the download in Firefox and Safari.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
