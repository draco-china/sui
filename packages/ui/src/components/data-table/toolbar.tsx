"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@workspace/ui/components/command";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { useMediaQuery } from "@workspace/ui/hooks/use-media-query";
import { cn } from "cn";
import { ChevronDown, CirclePlus, Filter, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import { formatValue, optionText } from "./columns";
import { useDataTableContext } from "./context";
import { DataTableDateRangeField } from "./date-field";
import { isEmptyValue } from "./engine";
import { DataTableIconTooltip } from "./icon-tooltip";
import { menuLabel, menuPanel, menuWidth, panelList } from "./menu";
import type {
  DataTableInstance,
  DataTableOption,
  DataTableSlot,
  NormalizedColumn,
} from "./types";

/** The plain text of an element tree, such as a label passed as a badge. */
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
    <InputGroup
      // On phones it gives way (down to min-w-24) so the row keeps 筛选 and the actions
      className={cn("h-8 w-40 min-w-24 sm:w-64 sm:shrink-0", className)}
    >
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
                  {optionText(option)}
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

/** A date range filter on the toolbar row, as wide as the search box. */
export function DataTableRangeFilter({ column: columnId }: { column: string }) {
  const table = useDataTableContext();
  const column = table.columns.find((entry) => entry.id === columnId);
  if (!column) return null;
  const { [columnId]: _current, ...others } = table.state.query.search;
  return (
    <DataTableDateRangeField
      label={column.titleText}
      time={column.search?.type === "datetimeRange"}
      presets={column.search?.presets}
      className="h-8 w-40 shrink-0 sm:w-64"
      value={table.state.query.search[columnId]}
      onChange={(next) =>
        table.setSearch(
          next === undefined ? others : { ...others, [columnId]: next },
        )
      }
    />
  );
}

/** Columns whose search config is a date range: rows of the 筛选 panel. */
export function isRangeColumn(column: NormalizedColumn<unknown>) {
  return (
    column.search?.type === "dateRange" ||
    column.search?.type === "datetimeRange"
  );
}

/**
 * The filters that do not fit on the toolbar row, behind one button: quick
 * filters past the first few and date ranges, one labelled row each,
 * applied together with Apply.
 */
export function DataTableMoreFilters({
  columns: columnIds,
}: {
  columns: readonly string[];
}) {
  const table = useDataTableContext();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const columns = columnIds.flatMap((id) => {
    const column = table.columns.find((entry) => entry.id === id);
    return column ? [column] : [];
  });
  const { filters, search } = table.state.query;
  const current = (column: NormalizedColumn<unknown>) =>
    isRangeColumn(column) ? search[column.id] : (filters[column.id] ?? []);
  const applied = columns.filter(
    (column) => !isEmptyValue(current(column)),
  ).length;
  const apply = () => {
    table.setState((state) => {
      const nextFilters = { ...state.query.filters };
      const nextSearch = { ...state.query.search };
      for (const column of columns) {
        const value = draft[column.id];
        if (isRangeColumn(column)) {
          if (isEmptyValue(value)) delete nextSearch[column.id];
          else nextSearch[column.id] = value;
        } else nextFilters[column.id] = [...((value as string[]) ?? [])];
      }
      return {
        ...state,
        page: 1,
        query: { ...state.query, filters: nextFilters, search: nextSearch },
      };
    });
    setOpen(false);
  };
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next)
          setDraft(
            Object.fromEntries(
              columns.map((column) => [column.id, current(column)]),
            ),
          );
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed px-2.5 sm:px-3"
          />
        }
      >
        <Filter />
        {/* Icon only on phones; the name stays for screen readers */}
        <span className="sr-only sm:not-sr-only">
          {table.labels.moreFilters}
        </span>
        {applied > 0 && (
          <Badge variant="secondary" className="ms-1">
            {applied}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        // A date range needs room for both of its dates.
        className={cn(
          columns.some(isRangeColumn)
            ? "w-[min(30rem,calc(100vw-2rem))]"
            : "w-80",
          menuPanel,
        )}
      >
        <div className={menuLabel}>{table.labels.moreFilters}</div>
        <form
          className="space-y-3 px-3 pt-2 pb-3"
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
        >
          <DataTableFilterFields
            idPrefix="more-filter"
            columns={columns}
            value={draft}
            onChange={(id, next) =>
              setDraft((values) => ({ ...values, [id]: next }))
            }
          />
          {/* As SUI's query form and advanced filter: Reset, then Apply. */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDraft(
                  Object.fromEntries(
                    columns.map((column) => [
                      column.id,
                      isRangeColumn(column) ? undefined : [],
                    ]),
                  ),
                )
              }
            >
              {table.labels.reset}
            </Button>
            <Button type="submit" size="sm">
              {table.labels.applyFilter}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Conditions in a filter panel, one row each: the label beside a date range
 * or a dropdown of checkable options.
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
          <Fragment key={column.id}>
            <Label htmlFor={id} className="font-normal text-muted-foreground">
              {column.title}
            </Label>
            {isRangeColumn(column) ? (
              <DataTableDateRangeField
                id={id}
                label={column.titleText}
                time={column.search?.type === "datetimeRange"}
                presets={column.search?.presets}
                className="h-8 w-full"
                value={value[column.id]}
                onChange={(next) => onChange(column.id, next)}
              />
            ) : (
              <DataTableOptionSelect
                id={id}
                options={column.valueEnum ?? []}
                value={(value[column.id] as readonly string[]) ?? []}
                onChange={(next) => onChange(column.id, next)}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

/** A filter condition's dropdown of checkable options. */
export function DataTableOptionSelect({
  id,
  options,
  value,
  onChange,
}: {
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
            className="flex h-8 w-full items-center justify-between gap-1.5 whitespace-nowrap rounded-3xl border border-transparent bg-input/50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
          />
        }
      >
        <span
          className={cn(
            "flex min-w-0 items-center gap-2 overflow-hidden",
            !selected.length && "text-muted-foreground",
          )}
        >
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
 * A single choice for the right of the toolbar (a unit, a period, the sort
 * order), drawn like SUI's own toolbar buttons: an icon that opens a menu.
 */
export function DataTableChoiceMenu<TValue extends string>({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  value: TValue;
  options: readonly { value: TValue; label: ReactNode }[];
  onChange: (value: TValue) => void;
}) {
  return (
    <DropdownMenu>
      <DataTableIconTooltip
        label={label}
        render={
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label={label} />
            }
          />
        }
      >
        {icon}
      </DataTableIconTooltip>
      <DropdownMenuContent align="end" className={menuWidth}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(next) => onChange(next as TValue)}
          >
            {options.map((option) => (
              <DropdownMenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
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

/** Below `sm`, where the toolbar row has room for little beside the search. */
function useNarrow() {
  return !!useMediaQuery("(max-width: 639px)");
}

/**
 * The toolbar row. Without children it shows keyword search and quick
 * filters from the column configuration, plugin controls, and `actions`.
 * It never wraps: past `maxFilters` filters the first stays and the rest
 * share one 筛选 button, and when space still runs out the search and filters
 * scroll sideways while the actions stay at the end.
 * Each control shows and clears its own value, so active conditions get one
 * clear-all button on the row rather than a row of chips; `chips` brings the
 * chip row back.
 */
export function DataTableToolbar({
  title,
  actions,
  chips = false,
  maxFilters = 2,
  children,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  /**
   * Filters on the row (date ranges and quick filters): past this the first
   * stays and the rest share one 筛选 button.
   */
  maxFilters?: number;
  /** Lists active conditions as removable chips below the row. */
  chips?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const table = useDataTableContext();
  // The chip row carries its own clear-all button; on phones the 筛选 and
  // 高级筛选 panels' Reset does it, as the row has no room.
  const narrow = useNarrow();
  const clearable = !chips && !narrow && activeChips(table).length > 0;
  const keyword =
    !table.hasPlugin("queryForm") &&
    table.columns.some((column) => column.keyword);
  // Date ranges first, then quick filters. Up to `maxFilters` of them sit on
  // the row; past that the first stays and the rest share one 筛选 button.
  // The query form already holds the search fields, date ranges among them.
  const items = [
    ...(table.hasPlugin("queryForm")
      ? []
      : table.columns.filter(isRangeColumn)),
    ...table.columns.filter((column) => column.filter),
  ];
  // On phones the row keeps the search: every filter waits in 筛选.
  const inline = narrow ? [] : items;
  const limit = Math.max(0, Math.floor(maxFilters));
  const shown =
    inline.length > limit ? inline.slice(0, Math.max(0, limit - 1)) : inline;
  const more = items.filter((column) => !shown.includes(column));
  return (
    <div data-slot="data-table-toolbar" className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        {title && (
          <div className="me-2 shrink-0 font-semibold text-base">{title}</div>
        )}
        {/* Padding keeps focus rings inside the scrolling strip. */}
        <div
          data-slot="data-table-toolbar-filters"
          className="-m-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overflow-y-hidden p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {children ?? (
            <>
              {keyword && <DataTableSearch />}
              <DataTableSlotContent slot="toolbarSearch" />
              {shown.map((column) =>
                isRangeColumn(column) ? (
                  <DataTableRangeFilter key={column.id} column={column.id} />
                ) : (
                  <DataTableFacetedFilter key={column.id} column={column.id} />
                ),
              )}
              {more.length > 0 && (
                <DataTableMoreFilters
                  columns={more.map((column) => column.id)}
                />
              )}
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
        </div>
        <div
          data-slot="data-table-toolbar-actions"
          className="flex shrink-0 items-center gap-1.5"
        >
          {actions}
          <DataTableSlotContent slot="toolbarEnd" />
        </div>
      </div>
      {chips && <DataTableFilterChips />}
    </div>
  );
}
