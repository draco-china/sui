"use client";

import type { RowData } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { cn } from "cn";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { TableFilterSelect } from "./filter-controls";
import { defaultTableLabels, type TableLabels } from "./labels";
import type { Column, ColumnFiltersState, Table } from "./types";

export interface DataTableSearchProps<TData extends RowData> {
  table: Table<TData>;
  disabled?: boolean;
  labels?: TableLabels;
  layout?: "inline" | "stacked";
  className?: string;
}

/** Independently placed search and filter controls with explicit apply/reset. */
export function DataTableSearch<TData extends RowData>({
  table,
  disabled = false,
  labels = defaultTableLabels,
  layout = "stacked",
  className,
}: Readonly<DataTableSearchProps<TData>>) {
  const inline = layout === "inline";
  const inputClassName = inline ? "w-50 max-w-full" : "w-full md:w-50";
  const searchColumns = getTableSearchColumns(table);
  const appliedFilters = table.store.state.columnFilters;
  const [draftFilters, setDraftFilters] =
    useState<ColumnFiltersState>(appliedFilters);
  const filterColumns = table
    .getAllLeafColumns()
    .filter((column) => column.columnDef.meta?.filter !== undefined);

  useEffect(() => setDraftFilters(appliedFilters), [appliedFilters]);

  if (searchColumns.length === 0 && filterColumns.length === 0) return null;

  const setDraftFilterValue = (columnId: string, value: unknown) => {
    setDraftFilters((current) => {
      const next = current.filter((filter) => filter.id !== columnId);
      if (isEmptyFilterValue(value)) return next;
      return [...next, { id: columnId, value }];
    });
  };
  const applyFilters = () => table.setColumnFilters(draftFilters);
  const hasConditions = draftFilters.length > 0 || appliedFilters.length > 0;

  return (
    <search
      className={cn(
        "flex min-w-0 max-w-full shrink-0 gap-2",
        inline
          ? "flex-wrap items-center"
          : "w-full flex-col md:flex-row md:items-center md:justify-between",
        className,
      )}
      onKeyDown={(event) => {
        if (
          event.key !== "Enter" ||
          !(event.target instanceof HTMLInputElement) ||
          !event.target.hasAttribute("data-ui-table-search-input")
        ) {
          return;
        }
        event.preventDefault();
        applyFilters();
      }}
    >
      <div
        className={cn(
          "flex min-w-0 max-w-full flex-wrap items-center gap-2",
          !inline && "flex-1",
        )}
      >
        {searchColumns.map((column) => {
          const rawValue = draftFilters.find(
            (filter) => filter.id === column.id,
          )?.value;
          const value = typeof rawValue === "string" ? rawValue : "";
          const configuredSearch = column.columnDef.meta?.search;
          const placeholder = getSearchPlaceholder(
            column,
            typeof configuredSearch === "object"
              ? configuredSearch.placeholder
              : undefined,
            labels,
          );

          const searchOptions =
            typeof configuredSearch === "object" ? configuredSearch : undefined;
          const fieldDisabled = disabled || searchOptions?.disabled === true;
          if (searchOptions?.render) {
            return (
              <div key={column.id} className={inputClassName}>
                {searchOptions.render({
                  value,
                  onChange: (next) => setDraftFilterValue(column.id, next),
                  disabled: fieldDisabled,
                })}
              </div>
            );
          }
          return (
            <Input
              type={searchOptions?.type ?? "text"}
              key={`search-${column.id}`}
              data-ui-table-search-input=""
              aria-label={placeholder}
              placeholder={placeholder}
              value={value}
              onChange={(event) =>
                setDraftFilterValue(column.id, event.target.value)
              }
              disabled={fieldDisabled}
              className={inputClassName}
            />
          );
        })}
        {filterColumns.map((column) => {
          const filter = column.columnDef.meta?.filter;
          if (!filter) return null;
          const rawValue = draftFilters.find(
            (item) => item.id === column.id,
          )?.value;
          const values = Array.isArray(rawValue)
            ? rawValue.filter(
                (item): item is string => typeof item === "string",
              )
            : [];

          return (
            <TableFilterSelect
              labels={labels}
              key={`filter-${column.id}`}
              options={filter.options.map((option) => {
                const count = table.options.manualFiltering
                  ? undefined
                  : column.getFacetedUniqueValues().get(option.value);
                return {
                  ...option,
                  textValue: option.label,
                  label:
                    count === undefined ? (
                      option.label
                    ) : (
                      <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                        <span className="truncate">{option.label}</span>
                        <span className="shrink-0 font-mono text-muted-foreground text-xs">
                          {count}
                        </span>
                      </span>
                    ),
                };
              })}
              placeholder={filter.placeholder ?? column.id}
              multiple={filter.multiple}
              searchable
              allowClear
              disabled={disabled || filter.disabled}
              value={getFilterValue(rawValue, values)}
              onChange={(value) => setDraftFilterValue(column.id, value)}
              className={inline ? "w-45 max-w-full" : "w-full md:w-45"}
            />
          );
        })}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2">
        {hasConditions && (
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={() => {
              setDraftFilters([]);
              table.resetColumnFilters();
            }}
          >
            <X data-icon="inline-start" />
            {labels.reset}
          </Button>
        )}
        <Button type="button" disabled={disabled} onClick={applyFilters}>
          <Search data-icon="inline-start" />
          {labels.search}
        </Button>
      </div>
    </search>
  );
}

function getTableSearchColumns<TData extends RowData>(table: Table<TData>) {
  return table
    .getAllLeafColumns()
    .filter(
      (column) =>
        column.columnDef.meta?.search !== undefined &&
        column.columnDef.meta.search !== false,
    );
}

function getSearchPlaceholder<TData extends RowData>(
  column: Column<TData, unknown>,
  configuredPlaceholder: string | undefined,
  labels: TableLabels,
) {
  return configuredPlaceholder ?? labels.searchPlaceholder(column.id);
}

function getFilterValue(rawValue: unknown, values: string[]) {
  if (typeof rawValue === "string") return rawValue;
  if (Array.isArray(rawValue) && values.length === rawValue.length)
    return values;
  return undefined;
}

function isEmptyFilterValue(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}
