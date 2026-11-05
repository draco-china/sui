"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "cn";
import { ChevronDown } from "lucide-react";
import type { AriaAttributes, ReactNode } from "react";
import {
  builtInValueTypes,
  renderControl,
  ValuePrefix,
} from "@/components/ui/data-form/value-types";
import { optionText, tableFormLabels } from "@/components/ui/data-table/columns";
import { useDataTableContext } from "@/components/ui/data-table/context";
import { panelList } from "@/components/ui/data-table/menu";
import type { DataTableOption, NormalizedColumn } from "@/components/ui/data-table/types";

/** Searchable multi-select list, shared by quick filters and the query form. */
export function DataTableOptionList({
  options,
  value,
  onChange,
  counts,
}: {
  options: readonly DataTableOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  counts?: ReadonlyMap<string, number>;
}) {
  const table = useDataTableContext();
  return (
    <Command className="rounded-none bg-transparent p-0 [&_[data-slot=command-input-wrapper]]:px-0">
      {options.length > 7 && (
        <CommandInput placeholder={table.labels.optionSearch} />
      )}
      <CommandList className={panelList}>
        <CommandEmpty>{table.labels.noOptions}</CommandEmpty>
        <CommandGroup>
          {options.map((option) => {
            const checked = value.includes(option.value);
            return (
              <CommandItem
                key={option.value}
                value={`${option.value} ${optionText(option)}`}
                data-checked={checked}
                onSelect={() =>
                  onChange(
                    checked
                      ? value.filter((item) => item !== option.value)
                      : [...value, option.value],
                  )
                }
              >
                <span className="flex-1 truncate">{optionText(option)}</span>
                {counts?.has(option.value) && (
                  <span className="font-mono text-muted-foreground text-xs">
                    {counts.get(option.value)}
                  </span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>
        {value.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                className="justify-center"
                onSelect={() => onChange([])}
              >
                {table.labels.reset}
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  );
}

/** Columns whose search config is a date range: rows of the 筛选 panel. */
export function isRangeColumn(column: NormalizedColumn<unknown>) {
  return (
    column.search?.type === "dateRange" ||
    column.search?.type === "datetimeRange"
  );
}

/** A filter condition's dropdown of checkable options. */
export function DataTableOptionSelect({
  id,
  options,
  value,
  onChange,
  className,
  prefix,
  ...aria
}: AriaAttributes & {
  className?: string;
  /** A label inside the trigger, before the choices, as on a filter row. */
  prefix?: ReactNode;
  id: string;
  options: readonly DataTableOption[];
  value: readonly string[];
  onChange: (value: string[]) => void;
}) {
  const table = useDataTableContext();
  const selected = options.filter((option) => value.includes(option.value));
  // Chosen values sit side by side; past two, a count as on the quick filters.
  let summary: ReactNode = table.labels.any;
  if (selected.length > 2) summary = table.labels.selected(selected.length);
  else if (selected.length)
    summary = selected.map((option) => (
      <span key={option.value} className="truncate">
        {optionText(option)}
      </span>
    ));
  return (
    <DropdownMenu>
      {/* Drawn as SUI's small SelectTrigger, like the other panel fields. */}
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            id={id}
            {...aria}
            className={cn(
              "flex h-8 w-full items-center justify-between gap-1.5 whitespace-nowrap rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
              className,
            )}
          />
        }
      >
        <span
          className={cn(
            "flex min-w-0 items-center gap-2 overflow-hidden",
            !selected.length && "text-muted-foreground",
          )}
        >
          <ValuePrefix>{prefix}</ValuePrefix>
          {summary}
        </span>
        <ChevronDown className="opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-72 w-(--anchor-width) overflow-auto">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={value.includes(option.value)}
            closeOnClick={false}
            onCheckedChange={(checked) =>
              onChange(
                checked
                  ? [...value, option.value]
                  : value.filter((item) => item !== option.value),
              )
            }
          >
            {optionText(option)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * A shared value-type control (a date picker, a range) with the table's
 * labels and locale, writing the strings the table stores.
 */
export function DataTableValueControl({
  type,
  id,
  label,
  value,
  onChange,
  fieldProps,
}: {
  /** A DataForm value type, such as `dateRange` or `dateTime`. */
  type: string;
  id?: string;
  /** Names the control for screen readers. */
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  fieldProps?: Readonly<Record<string, unknown>>;
}) {
  const table = useDataTableContext();
  const definition = builtInValueTypes[type] ?? builtInValueTypes.text;
  return renderControl(undefined, definition, type, {
    ...standalone,
    id: id ?? "",
    name: id ?? type,
    value,
    onChange,
    label,
    fieldProps: { valueFormat: "string", ...fieldProps },
    labels: tableFormLabels(table.labels),
  });
}

/** What a control outside any form gets: no validation, toolbar size. */
const standalone = {
  values: {},
  onBlur: () => {},
  disabled: false,
  invalid: false,
  required: false,
  labelledBy: "",
  describedBy: undefined,
  placeholder: undefined,
  options: [],
  optionsLoading: false,
  size: "sm",
} as const;
