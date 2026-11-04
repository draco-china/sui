"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "cn";
import { Download, RotateCw, Rows3 } from "lucide-react";
import { useDataTableContext } from "@/components/ui/data-table/context";
import { downloadText, toCsv } from "@/components/ui/data-table/engine";
import { DataTableIconTooltip } from "@/components/ui/data-table/icon-tooltip";
import { menuWidth } from "@/components/ui/data-table/menu";
import type { DataTableDensity, DataTablePlugin } from "@/components/ui/data-table/types";

function ReloadButton() {
  const table = useDataTableContext();
  return (
    <DataTableIconTooltip
      label={table.labels.reload}
      render={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={table.labels.reload}
          disabled={table.loading}
          onClick={table.reload}
        />
      }
    >
      <RotateCw className={cn(table.loading && "animate-spin")} />
    </DataTableIconTooltip>
  );
}

/** A toolbar button that reloads remote rows. */
export function reload<TData>(): DataTablePlugin<TData> {
  return { name: "reload", slots: { toolbarEnd: () => <ReloadButton /> } };
}

function DensityMenu() {
  const table = useDataTableContext();
  const { labels } = table;
  const options: [DataTableDensity, string][] = [
    ["compact", labels.densityCompact],
    ["default", labels.densityDefault],
    ["comfortable", labels.densityComfortable],
  ];
  return (
    <DropdownMenu>
      <DataTableIconTooltip
        label={labels.density}
        render={
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={labels.density}
                // Phones have one density worth having
                className="hidden sm:inline-flex"
              />
            }
          />
        }
      >
        <Rows3 />
      </DataTableIconTooltip>
      <DropdownMenuContent align="end" className={menuWidth}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{labels.density}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={table.density}
            onValueChange={(value) =>
              table.setDensity(value as DataTableDensity)
            }
          >
            {options.map(([value, label]) => (
              <DropdownMenuRadioItem key={value} value={value}>
                {label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** A toolbar menu for row spacing. */
export function density<TData>(): DataTablePlugin<TData> {
  return { name: "density", slots: { toolbarEnd: () => <DensityMenu /> } };
}

export interface ExportCsvOptions {
  /** File name without extension; defaults to `export`. */
  readonly filename?: string;
}

function ExportMenu({ filename }: { filename: string }) {
  const table = useDataTableContext();
  const { labels } = table;
  const columns = table.visibleColumns.filter((column) => !column.utility);
  const save = (rows: readonly unknown[]) =>
    downloadText(
      toCsv(rows, columns),
      `${filename}.csv`,
      "text/csv;charset=utf-8",
    );
  const selected = table.selection?.rows ?? [];
  return (
    <DropdownMenu>
      <DataTableIconTooltip
        label={labels.export}
        render={
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={labels.export}
              />
            }
          />
        }
      >
        <Download />
      </DataTableIconTooltip>
      <DropdownMenuContent align="end" className={menuWidth}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{labels.export}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => save(table.rows)}>
            {labels.exportPage}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => save(await table.getAllRows())}
          >
            {labels.exportAll}
          </DropdownMenuItem>
          {table.selection && (
            <DropdownMenuItem
              disabled={selected.length === 0}
              onClick={() => save(selected)}
            >
              {labels.exportSelected}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Exports visible columns as CSV: the current page, every matching row
 * (remote tables request them) or the selected rows.
 */
export function exportCsv<TData>(
  options: ExportCsvOptions = {},
): DataTablePlugin<TData> {
  const filename = options.filename ?? "export";
  return {
    name: "exportCsv",
    slots: { toolbarEnd: () => <ExportMenu filename={filename} /> },
  };
}
