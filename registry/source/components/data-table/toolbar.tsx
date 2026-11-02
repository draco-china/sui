"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "cn";
import { CirclePlus, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import { formatValue } from "@/components/ui/data-table/columns";
import { useDataTableContext } from "@/components/ui/data-table/context";
import { isEmptyValue } from "@/components/ui/data-table/engine";
import { menuLabel, menuPanel, menuWidth } from "@/components/ui/data-table/menu";
import type {
  DataTableInstance,
  DataTableOption,
  DataTableSlot,
  NormalizedColumn,
} from "@/components/ui/data-table/types";

/** Renders every plugin's content for a slot. */
export function DataTableSlotContent({ slot }: { slot: DataTableSlot }) {
  const table = useDataTableContext();
  return table.plugins.map((plugin) => {
    const render = plugin.slots?.[slot];
    return render ? (
      <Fragment key={plugin.name}>{render(table)}</Fragment>
    ) : null;
  });
}

/** Keyword input over the columns marked `keyword`, debounced by 300 ms. */
export function DataTableSearch({
  className,
  placeholder,
  delay = 300,
}: {
  className?: string;
  placeholder?: string;
  delay?: number;
}) {
  const table = useDataTableContext();
  const keyword = table.state.query.keyword;
  const [value, setValue] = useState(keyword);
  const applied = useRef(keyword);
  if (applied.current !== keyword) {
    applied.current = keyword;
    setValue(keyword);
  }
  const setKeyword = table.setKeyword;
  useEffect(() => {
    if (value === applied.current) return;
    const timer = setTimeout(() => {
      applied.current = value;
      setKeyword(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay, setKeyword]);
  return (
    <InputGroup className={cn("h-8 w-full sm:w-64", className)}>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        // The clear button below replaces the browser's own.
        className="[&::-webkit-search-cancel-button]:hidden"
        value={value}
        aria-label={placeholder ?? table.labels.keywordPlaceholder}
        placeholder={placeholder ?? table.labels.keywordPlaceholder}
        onChange={(event) => setValue(event.target.value)}
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label={table.labels.reset}
            onClick={() => setValue("")}
          >
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}

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
    <Command className="rounded-none bg-transparent p-0">
      {options.length > 7 && (
        <CommandInput placeholder={table.labels.optionSearch} />
      )}
      <CommandList>
        <CommandEmpty>{table.labels.noOptions}</CommandEmpty>
        <CommandGroup>
          {options.map((option) => {
            const checked = value.includes(option.value);
            return (
              <CommandItem
                key={option.value}
                value={`${option.value} ${typeof option.label === "string" ? option.label : ""}`}
                data-checked={checked}
                onSelect={() =>
                  onChange(
                    checked
                      ? value.filter((item) => item !== option.value)
                      : [...value, option.value],
                  )
                }
              >
                <span className="flex-1 truncate">{option.label}</span>
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

/** Quick multi-select filter for one column, with option counts. */
export function DataTableFacetedFilter({
  column: columnId,
  title,
  options,
}: {
  column: string;
  title?: ReactNode;
  options?: readonly DataTableOption[];
}) {
  const table = useDataTableContext();
  const column = table.columns.find((entry) => entry.id === columnId);
  const items = options ?? column?.valueEnum ?? [];
  const value = table.state.query.filters[columnId] ?? [];
  const selected = items.filter((option) => value.includes(option.value));
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="h-8 border-dashed" />
        }
      >
        <CirclePlus />
        {title ?? column?.title}
        {selected.length > 0 && (
          <span className="ms-1 flex gap-1 border-s ps-2">
            {selected.length > 2 ? (
              <Badge variant="secondary">
                {table.labels.selected(selected.length)}
              </Badge>
            ) : (
              selected.map((option) => (
                <Badge key={option.value} variant="secondary">
                  {option.label}
                </Badge>
              ))
            )}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className={cn(menuWidth, menuPanel)}>
        <div className={menuLabel}>{title ?? column?.title}</div>
        <DataTableOptionList
          options={items}
          value={value}
          counts={table.getFacets(columnId)}
          onChange={(next) => table.setFilter(columnId, next)}
        />
      </PopoverContent>
    </Popover>
  );
}

function describeSearch(
  table: DataTableInstance<unknown>,
  column: NormalizedColumn<unknown>,
  value: unknown,
) {
  const describe = (item: unknown) => {
    const option = column.search?.options;
    const list = typeof option === "function" ? undefined : option;
    const match = list?.find((entry) => entry.value === String(item));
    if (match && typeof match.label === "string") return match.label;
    if (column.search?.type === "boolean")
      return item === "true" ? table.labels.yes : table.labels.no;
    return (
      formatValue(
        column.valueType === "enum" ? "text" : column.valueType,
        item,
        {
          locale: table.locale,
          labels: table.labels,
          format: undefined,
        },
      ) || "…"
    );
  };
  if (!Array.isArray(value)) return describe(value);
  if (column.search?.type === "multiSelect")
    return value.map(describe).join(", ");
  return value.map(describe).join(" ~ ");
}

interface Chip {
  readonly id: string;
  readonly label: ReactNode;
  readonly value: string;
  readonly remove: () => void;
}

function activeChips(table: DataTableInstance<unknown>): Chip[] {
  const { query } = table.state;
  const byId = new Map(table.columns.map((column) => [column.id, column]));
  const chips: Chip[] = [];
  if (query.keyword)
    chips.push({
      id: "keyword",
      label: table.labels.query,
      value: query.keyword,
      remove: () => table.setKeyword(""),
    });
  for (const [id, value] of Object.entries(query.search)) {
    const column = byId.get(id);
    if (!column || isEmptyValue(value)) continue;
    chips.push({
      id: `search-${id}`,
      label: column.title,
      value: describeSearch(table, column, value),
      remove: () => table.setSearch({ ...query.search, [id]: undefined }),
    });
  }
  for (const [id, values] of Object.entries(query.filters)) {
    const column = byId.get(id);
    if (!column || values.length === 0) continue;
    const text = values.map((value) => {
      const label = column.valueEnum?.find(
        (option) => option.value === value,
      )?.label;
      return typeof label === "string" ? label : value;
    });
    chips.push({
      id: `filter-${id}`,
      label: column.title,
      value: text.join(", "),
      remove: () => table.setFilter(id, []),
    });
  }
  if (query.advanced && query.advanced.rules.length > 0)
    chips.push({
      id: "advanced",
      label: table.labels.advancedFilter,
      value: String(query.advanced.rules.length),
      remove: () => table.setAdvanced(undefined),
    });
  return chips;
}

/**
 * Removable chips for every active condition, with a clear-all action. The
 * toolbar shows it only with `chips`, since each control already shows its
 * own value.
 */
export function DataTableFilterChips({ className }: { className?: string }) {
  const table = useDataTableContext();
  const chips = activeChips(table);
  return (
    <AnimatePresence initial={false}>
      {chips.length > 0 && (
        <motion.div
          data-slot="data-table-filter-chips"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className={cn("overflow-hidden", className)}
        >
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <AnimatePresence initial={false} mode="popLayout">
              {chips.map((chip) => (
                <motion.span
                  key={chip.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="inline-flex h-7 max-w-72 items-center gap-1 rounded-full border bg-muted/50 ps-2.5 pe-1 text-xs"
                >
                  <span className="whitespace-nowrap text-muted-foreground">
                    {chip.label}:
                  </span>
                  <span className="truncate font-medium">{chip.value}</span>
                  <button
                    type="button"
                    aria-label={`${table.labels.reset} ${typeof chip.label === "string" ? chip.label : ""}`}
                    onClick={chip.remove}
                    className="grid size-5 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              onClick={table.resetQuery}
            >
              {table.labels.clearFilters}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * The toolbar row. Without children it shows keyword search and quick
 * filters from the column configuration, plugin controls, and `actions`.
 * Each control shows and clears its own value, so active conditions get one
 * clear-all button on the row rather than a row of chips; `chips` brings the
 * chip row back.
 */
export function DataTableToolbar({
  title,
  actions,
  chips = false,
  children,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  /** Lists active conditions as removable chips below the row. */
  chips?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const table = useDataTableContext();
  // The chip row carries its own clear-all button.
  const clearable = !chips && activeChips(table).length > 0;
  const keyword =
    !table.hasPlugin("queryForm") &&
    table.columns.some((column) => column.keyword);
  const filters = table.columns.filter((column) => column.filter);
  return (
    <div data-slot="data-table-toolbar" className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {title && <div className="me-2 font-semibold text-base">{title}</div>}
        {children ?? (
          <>
            {keyword && <DataTableSearch />}
            {filters.map((column) => (
              <DataTableFacetedFilter key={column.id} column={column.id} />
            ))}
            <DataTableSlotContent slot="toolbarStart" />
          </>
        )}
        {clearable && (
          <Button
            data-slot="data-table-clear-filters"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={table.resetQuery}
          >
            {table.labels.clearFilters}
          </Button>
        )}
        <div className="ms-auto flex items-center gap-1.5">
          {actions}
          <DataTableSlotContent slot="toolbarEnd" />
        </div>
      </div>
      {chips && <DataTableFilterChips />}
    </div>
  );
}
