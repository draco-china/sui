"use client";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "cn";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  EyeOff,
  Info,
  X,
} from "lucide-react";
import { useDataTableContext } from "./context";
import { menuWidth } from "./menu";
import type { NormalizedColumn, SortOrder } from "./types";

function SortIcon({ order }: { order: SortOrder | undefined }) {
  if (order === "asc") return <ArrowUp />;
  if (order === "desc") return <ArrowDown />;
  return <ChevronsUpDown className="opacity-50" />;
}

function HeaderTitle({ column }: { column: NormalizedColumn<unknown> }) {
  const tooltip = column.config.tooltip;
  return (
    <span className="inline-flex min-w-0 shrink-0 items-center gap-1">
      <span className="min-w-0 truncate">{column.title}</span>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger
            render={<span className="inline-flex text-muted-foreground" />}
          >
            <Info className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}

/** Column title with a sort and hide menu for sortable columns. */
export function DataTableColumnHeader({
  column,
  className,
}: {
  column: NormalizedColumn<unknown>;
  className?: string;
}) {
  const table = useDataTableContext();
  const { labels } = table;
  if (!column.sortable || table.features.dragSort)
    return (
      <div className={cn("flex items-center", className)}>
        <HeaderTitle column={column} />
      </div>
    );
  const order = table.state.sort.find((item) => item.key === column.id)?.order;
  const sortBy = (next: SortOrder | undefined) =>
    table.setSort(next ? [{ key: column.id, order: next }] : []);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "-ms-2 h-8 max-w-full gap-1 px-2 font-medium data-popup-open:bg-accent",
              className,
            )}
          />
        }
      >
        <HeaderTitle column={column} />
        <SortIcon order={order} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={menuWidth}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{column.title}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuItem onClick={() => sortBy("asc")}>
          <ArrowUp />
          {labels.sortAscending}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => sortBy("desc")}>
          <ArrowDown />
          {labels.sortDescending}
        </DropdownMenuItem>
        {order && (
          <DropdownMenuItem onClick={() => sortBy(undefined)}>
            <X />
            {labels.clearSorting}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            table.setColumnState((current) => ({
              ...current,
              visibility: { ...current.visibility, [column.id]: false },
            }))
          }
        >
          <EyeOff />
          {labels.hideColumn}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
