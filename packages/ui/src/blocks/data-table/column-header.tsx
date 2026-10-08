import type { RowData } from "@tanstack/react-table";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "cn";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  EyeOffIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { defaultTableLabels, type TableLabels } from "./labels";
import type { Column } from "./types";

export function DataTableColumnHeader<TData extends RowData, TValue>({
  column,
  title,
  sortable = true,
  align = "start",
  disableHiding = false,
  labels = defaultTableLabels,
  className,
}: {
  column: Column<TData, TValue>;
  title: ReactNode;
  sortable?: boolean;
  align?: "start" | "center" | "end";
  disableHiding?: boolean;
  labels?: TableLabels;
  className?: string;
}) {
  if (!sortable || !column.getCanSort())
    return (
      <div
        className={cn(
          "flex min-w-0 items-center",
          align === "center" && "justify-center",
          align === "end" && "justify-end",
          className,
        )}
      >
        {title}
      </div>
    );
  const sorted = column.getIsSorted();
  const SortIcon = sorted
    ? { asc: ArrowUpIcon, desc: ArrowDownIcon }[sorted]
    : ArrowUpDownIcon;

  return (
    <div
      className={cn(
        "flex min-w-0 items-center",
        align === "center" && "justify-center",
        align === "end" && "justify-end",
        className,
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "relative min-w-0 border-0 px-2",
                align === "start" && "-ms-2",
                align === "end" && "-me-2 flex-row-reverse",
              )}
            />
          }
        >
          <span data-slot="data-table-header-label" className="truncate">
            {title}
          </span>
          <SortIcon
            className={cn(
              "size-3.5 shrink-0",
              align === "center" && "absolute -end-3.5",
            )}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
              <ArrowUpIcon />
              {labels.sortAscending}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
              <ArrowDownIcon />
              {labels.sortDescending}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!sorted}
              onClick={() => column.clearSorting()}
            >
              {labels.clearSorting}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {column.getCanHide() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  disabled={disableHiding}
                  onClick={() => column.toggleVisibility(false)}
                >
                  <EyeOffIcon />
                  {labels.hideColumn}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
