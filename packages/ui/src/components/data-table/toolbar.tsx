"use client";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
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
import { cn } from "cn";
import { Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, type ReactNode, useEffect, useRef, useState } from "react";
import { formatValue } from "./columns";
import { useDataTableContext } from "./context";
import { isEmptyValue } from "./engine";
import { DataTableIconTooltip } from "./icon-tooltip";
import { menuWidth } from "./menu";
import { DataTableLightFilters, useNarrowToolbar } from "./plugins/light-form";
import type {
  DataTableInstance,
  DataTableSlot,
  NormalizedColumn,
} from "./types";

/** The plain text of an element tree, such as a label passed as a badge. */
/** Renders every plugin's content for a slot. */
export function DataTableSlotContent({
  slot,
  fallback = null,
}: {
  slot: DataTableSlot;
  /** Shown when no plugin fills the slot. */
  fallback?: ReactNode;
}) {
  const table = useDataTableContext();
  const filled = table.plugins.filter((plugin) => plugin.slots?.[slot]);
  if (filled.length === 0) return fallback;
  return filled.map((plugin) => (
    <Fragment key={plugin.name}>{plugin.slots?.[slot]?.(table)}</Fragment>
  ));
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
      return item === true || item === "true"
        ? table.labels.yes
        : table.labels.no;
    return (
      formatValue(
        column.valueType === "enum" ? "text" : column.valueType,
        item,
        { labels: table.labels, format: undefined },
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
  const narrow = useNarrowToolbar();
  const clearable = !chips && !narrow && activeChips(table).length > 0;
  const keyword =
    !table.hasPlugin("queryForm") &&
    table.columns.some((column) => column.keyword);
  // A plugin such as lightForm() fills the filters; without one the row
  // still gets the default filters.
  const filters = (
    <DataTableSlotContent
      slot="toolbarFilters"
      fallback={<DataTableLightFilters maxFilters={maxFilters} />}
    />
  );
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
              {filters}
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
