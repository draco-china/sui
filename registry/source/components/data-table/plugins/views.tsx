"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";
import { LayoutGrid, List, Table2 } from "lucide-react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { DataTableStatus } from "@/components/ui/data-table/content";
import { useDataTableContext } from "@/components/ui/data-table/context";
import { DataTableIconTooltip } from "@/components/ui/data-table/icon-tooltip";
import { menuWidth } from "@/components/ui/data-table/menu";
import type {
  DataTableInstance,
  DataTablePlugin,
  DataTableView,
  NormalizedColumn,
} from "@/components/ui/data-table/types";

export interface ViewsOptions<TData> {
  /** Each row as a card: with it the rows can also show as a grid of cards. */
  readonly grid?: (
    row: TData,
    index: number,
    table: DataTableInstance<TData>,
  ) => ReactNode;
  /** SUI's list, built from the columns; `false` leaves it out. */
  readonly list?: boolean;
  /** The view a reader starts with until they pick one (then `persist` keeps theirs). */
  readonly defaultView?: DataTableView;
  /** Opens a row from the list or a card, as a row click does in the table. */
  readonly onOpen?: (row: TData) => void;
}

const icons: Record<DataTableView, ReactNode> = {
  table: <Table2 />,
  list: <List />,
  grid: <LayoutGrid />,
};

function viewLabel(table: DataTableInstance<unknown>, view: DataTableView) {
  const { labels } = table;
  const names: Record<DataTableView, string> = {
    table: labels.viewTable,
    list: labels.viewList,
    grid: labels.viewGrid,
  };
  return names[view];
}

/** Clicks on a control inside a row or card stay with that control. */
function interactive(target: EventTarget | null) {
  return (
    target instanceof Element &&
    !!target.closest(
      "button,a,input,select,textarea,[role=checkbox],[role=switch],[role=button],[contenteditable]",
    )
  );
}

/**
 * One icon to change views: with two it switches to the other (its icon and
 * tooltip name the view it opens), with three it opens a menu of them.
 */
function ViewSwitch({
  views,
  current,
}: {
  views: readonly DataTableView[];
  current: DataTableView;
}) {
  const table = useDataTableContext();
  if (views.length === 2) {
    const next = views.find((view) => view !== current) ?? views[0];
    const label = viewLabel(table, next);
    return (
      <DataTableIconTooltip
        label={label}
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            onClick={() => table.setView(next)}
          />
        }
      >
        {icons[next]}
      </DataTableIconTooltip>
    );
  }
  return (
    <DropdownMenu>
      <DataTableIconTooltip
        label={table.labels.view}
        render={
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={table.labels.view}
              />
            }
          />
        }
      >
        {icons[current]}
      </DataTableIconTooltip>
      <DropdownMenuContent align="end" className={menuWidth}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{table.labels.view}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={current}
            onValueChange={(value) => table.setView(value as DataTableView)}
          >
            {views.map((view) => (
              <DropdownMenuRadioItem key={view} value={view}>
                {icons[view]}
                {viewLabel(table, view)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Failed and empty loads as the table shows them; `null` when there are rows to show. */
function useStatus() {
  const table = useDataTableContext();
  if (table.error)
    return (
      <DataTableStatus
        error
        title={table.labels.loadFailed}
        onRetry={table.reload}
      />
    );
  if (!table.loading && table.rows.length === 0)
    return <DataTableStatus title={table.labels.noData} />;
  return null;
}

/**
 * SUI's list: one row per record on the table's bordered surface. The primary
 * column leads, the other shown columns follow as labelled values, and the
 * actions column stays at the end.
 */
function ListView<TData>({ onOpen }: { onOpen?: (row: TData) => void }) {
  const table = useDataTableContext() as DataTableInstance<TData>;
  const status = useStatus();
  const columns = table.visibleColumns.filter((column) => !column.utility);
  const trailing = columns.filter(
    (column) => column.display && column.config.fixed === "end",
  );
  const primary =
    columns.find((column) => column.config.primary) ??
    columns.find((column) => !trailing.includes(column));
  const rest = columns.filter(
    (column) => column !== primary && !trailing.includes(column),
  );
  if (status) return status;
  if (table.loading && table.rows.length === 0)
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity.
          <Skeleton key={index} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  return (
    <ul
      data-slot="data-table-list"
      aria-busy={table.loading}
      className="min-h-0 flex-1 divide-y overflow-auto rounded-xl border"
    >
      {table.rows.map((row, index) => {
        const id = table.getRowId(row, index);
        const selected = table.selection?.isSelected(id) ?? false;
        return (
          <li
            key={id}
            data-state={selected ? "selected" : undefined}
            tabIndex={onOpen ? 0 : undefined}
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm outline-none hover:bg-muted focus-visible:bg-muted data-[state=selected]:bg-accent",
              onOpen && "cursor-pointer",
            )}
            onClick={
              onOpen
                ? (event: MouseEvent) => {
                    if (!interactive(event.target)) onOpen(row);
                  }
                : undefined
            }
            onKeyDown={
              onOpen
                ? (event: KeyboardEvent) => {
                    if (
                      event.target === event.currentTarget &&
                      event.key === "Enter"
                    ) {
                      event.preventDefault();
                      onOpen(row);
                    }
                  }
                : undefined
            }
          >
            {table.selection && (
              <Checkbox
                aria-label={table.labels.selectRow}
                checked={selected}
                disabled={table.selection.isDisabled(row)}
                onCheckedChange={() => table.selection?.toggle(id, row)}
              />
            )}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="truncate font-medium">
                {primary?.renderCell(row, index)}
              </div>
              {rest.length > 0 && (
                <dl className="flex flex-wrap gap-x-4 gap-y-1">
                  {rest.map((column: NormalizedColumn<TData>) => (
                    <div key={column.id} className="flex min-w-0 gap-1.5">
                      <dt className="shrink-0 text-muted-foreground">
                        {column.title}
                      </dt>
                      <dd className="min-w-0 truncate">
                        {column.renderCell(row, index)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            {trailing.map((column) => (
              <div key={column.id} className="shrink-0">
                {column.renderCell(row, index)}
              </div>
            ))}
          </li>
        );
      })}
    </ul>
  );
}

/** The rows as cards in a grid, with the table's loading, empty and failed states. */
function GridView<TData>({
  card,
  onOpen,
}: {
  card: NonNullable<ViewsOptions<TData>["grid"]>;
  onOpen?: (row: TData) => void;
}) {
  const table = useDataTableContext() as DataTableInstance<TData>;
  const status = useStatus();
  if (status) return status;
  return (
    <div
      data-slot="data-table-grid"
      aria-busy={table.loading}
      // Scrolls inside a bounded table (layout="fill"), as the list does
      className="grid min-h-0 flex-1 content-start gap-4 overflow-auto p-0.5 sm:grid-cols-2 xl:grid-cols-3"
    >
      {table.rows.length
        ? table.rows.map((row, index) => (
            // Keyboard users open a card through the controls inside it
            // biome-ignore lint/a11y/noStaticElementInteractions: a click on the card's surface is a shortcut, not the only way in.
            // biome-ignore lint/a11y/useKeyWithClickEvents: as above.
            <div
              key={table.getRowId(row, index)}
              className={cn("min-w-0 *:h-full", onOpen && "cursor-pointer")}
              onClick={
                onOpen
                  ? (event) => {
                      if (!interactive(event.target)) onOpen(row);
                    }
                  : undefined
              }
            >
              {card(row, index, table)}
            </div>
          ))
        : Array.from({ length: 6 }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: placeholders have no identity.
            <Skeleton key={index} className="h-56 rounded-xl" />
          ))}
    </div>
  );
}

/**
 * Other views of the same rows beside the table: SUI's list and, with a
 * `grid` card, a grid of cards. The toolbar gets one icon to change view; the
 * search, filters, sorting, paging and selection stay as they are.
 */
export function views<TData>(
  options: ViewsOptions<TData> = {},
): DataTablePlugin<TData> {
  const available: DataTableView[] = [
    "table",
    ...(options.list === false ? [] : (["list"] as const)),
    ...(options.grid ? (["grid"] as const) : []),
  ];
  const fallback =
    options.defaultView && available.includes(options.defaultView)
      ? options.defaultView
      : "table";
  // A view saved for this table that it no longer offers falls back
  const current = (table: DataTableInstance<TData>) =>
    available.includes(table.view) ? table.view : fallback;
  return {
    name: "views",
    // The starting view; a view persist restored for this reader wins over it
    defaultView: options.defaultView,
    slots: {
      toolbarEnd: (table) =>
        available.length > 1 ? (
          <ViewSwitch views={available} current={current(table)} />
        ) : null,
    },
    renderView: (_, table) => {
      const view = current(table);
      if (view === "grid" && options.grid)
        return <GridView card={options.grid} onOpen={options.onOpen} />;
      if (view === "list") return <ListView onOpen={options.onOpen} />;
      return undefined;
    },
  };
}
