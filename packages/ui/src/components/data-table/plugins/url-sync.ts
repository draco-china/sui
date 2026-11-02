"use client";

import { useEffect, useRef } from "react";
import { isEmptyValue, isFilterOperator } from "../engine";
import type {
  DataTableInstance,
  DataTablePlugin,
  DataTableQuery,
  DataTableState,
  FilterGroup,
  FilterRule,
  SortItem,
} from "../types";

export interface UrlSyncOptions {
  /** Prefix for parameter names when a page has several tables. */
  readonly prefix?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A JSON object from a parameter; anything else in a hand-edited URL is dropped. */
function parseRecord(value: string | null) {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function parseFilters(
  value: string | null,
): Record<string, string[]> | undefined {
  const record = parseRecord(value);
  if (!record) return undefined;
  return Object.fromEntries(
    Object.entries(record).flatMap(([key, values]) =>
      Array.isArray(values) ? [[key, values.map(String)]] : [],
    ),
  );
}

function parseAdvanced(value: string | null): FilterGroup | undefined {
  const record = parseRecord(value);
  if (!record || !Array.isArray(record.rules)) return undefined;
  const rules = record.rules.flatMap((rule: unknown, index): FilterRule[] => {
    if (!isRecord(rule) || typeof rule.field !== "string") return [];
    if (!isFilterOperator(rule.operator)) return [];
    const id = typeof rule.id === "string" ? rule.id : String(index);
    return [
      { id, field: rule.field, operator: rule.operator, value: rule.value },
    ];
  });
  return { logic: record.logic === "or" ? "or" : "and", rules };
}

function parseSort(value: string | null): SortItem[] | undefined {
  if (!value) return undefined;
  return value.split(",").flatMap((part) => {
    const index = part.lastIndexOf(".");
    const order = part.slice(index + 1);
    if (index < 1 || (order !== "asc" && order !== "desc")) return [];
    return [{ key: part.slice(0, index), order }];
  });
}

function compact(record: Readonly<Record<string, unknown>>) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => !isEmptyValue(value)),
  );
}

/** Reads table state from search parameters; missing ones stay unset. */
export function readUrlState(
  search: string,
  prefix = "",
): Partial<DataTableState> {
  const params = new URLSearchParams(search);
  const get = (name: string) => params.get(`${prefix}${name}`);
  const page = Number(get("page"));
  const pageSize = Number(get("size"));
  const sort = parseSort(get("sort"));
  const query: Partial<Record<keyof DataTableQuery, unknown>> = {};
  const keyword = get("q");
  const values = parseRecord(get("search"));
  const filters = parseFilters(get("filters"));
  const advanced = parseAdvanced(get("advanced"));
  if (keyword) query.keyword = keyword;
  if (values) query.search = values;
  if (filters) query.filters = filters;
  if (advanced) query.advanced = advanced;
  const state: Partial<DataTableState> = {};
  if (page > 0) Object.assign(state, { page });
  if (pageSize > 0) Object.assign(state, { pageSize });
  if (sort) Object.assign(state, { sort });
  if (Object.keys(query).length > 0)
    Object.assign(state, { query: query as DataTableQuery });
  return state;
}

/** Writes table state into search parameters, leaving others untouched. */
export function writeUrlState(
  search: string,
  state: DataTableState,
  prefix = "",
  defaultPageSize?: number,
) {
  const params = new URLSearchParams(search);
  const set = (name: string, value: string | undefined) => {
    if (value) params.set(`${prefix}${name}`, value);
    else params.delete(`${prefix}${name}`);
  };
  const searchValues = compact(state.query.search);
  const filters = compact(state.query.filters);
  set("page", state.page > 1 ? String(state.page) : undefined);
  set(
    "size",
    state.pageSize === defaultPageSize ? undefined : String(state.pageSize),
  );
  set("sort", state.sort.map((item) => `${item.key}.${item.order}`).join(","));
  set("q", state.query.keyword);
  set(
    "search",
    Object.keys(searchValues).length ? JSON.stringify(searchValues) : undefined,
  );
  set(
    "filters",
    Object.keys(filters).length ? JSON.stringify(filters) : undefined,
  );
  set(
    "advanced",
    state.query.advanced?.rules.length
      ? JSON.stringify(state.query.advanced)
      : undefined,
  );
  const result = params.toString();
  return result ? `?${result}` : "";
}

function useUrlSync<TData>(table: DataTableInstance<TData>, prefix: string) {
  const { state, setState, defaultPageSize } = table;
  const written = useRef("");
  useEffect(() => {
    const next = writeUrlState(
      window.location.search,
      state,
      prefix,
      defaultPageSize,
    );
    if (next === window.location.search) return;
    written.current = next;
    const url = `${window.location.pathname}${next}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", url);
  }, [state, prefix, defaultPageSize]);
  useEffect(() => {
    const restore = () => {
      if (window.location.search === written.current) return;
      const parsed = readUrlState(window.location.search, prefix);
      setState((current) => ({
        ...current,
        page: 1,
        pageSize: defaultPageSize,
        sort: [],
        ...parsed,
        query: {
          keyword: "",
          search: {},
          filters: {},
          advanced: undefined,
          ...parsed.query,
        },
      }));
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [prefix, setState, defaultPageSize]);
}

/**
 * Keeps pagination, sorting, keyword, query form, quick filters and
 * advanced rules in the address bar, without a router dependency.
 */
export function urlSync<TData>(
  options: UrlSyncOptions = {},
): DataTablePlugin<TData> {
  const prefix = options.prefix ?? "";
  return {
    name: "urlSync",
    initialState: () =>
      typeof window === "undefined"
        ? undefined
        : readUrlState(window.location.search, prefix),
    setup: (table) => useUrlSync(table, prefix),
  };
}
