"use client";

import { cn } from "cn";
import { type ReactNode, type Ref, useImperativeHandle } from "react";
import { DataTableContent } from "./content";
import { DataTableProvider } from "./context";
import { DataTablePagination } from "./pagination";
import { DataTableSlotContent, DataTableToolbar } from "./toolbar";
import type { DataTableActions, DataTableInstance } from "./types";
import { type UseDataTableOptions, useDataTable } from "./use-data-table";

interface DataTableFrameProps {
  /** Shown at the start of the toolbar. */
  readonly title?: ReactNode;
  /** Buttons at the end of the toolbar, before plugin controls. */
  readonly toolbar?: ReactNode;
  /**
   * `fill` takes the parent's height: the rows scroll and the pagination
   * stays at the bottom. `auto` grows with its rows.
   */
  readonly layout?: "fill" | "auto";
  /** Shows rows as cards on narrow screens; defaults to true. */
  readonly responsive?: boolean;
  readonly className?: string;
  readonly actionRef?: Ref<DataTableActions>;
  /** Replaces the default layout; compose DataTable parts inside. */
  readonly children?: ReactNode;
}

export type DataTableProps<TData> = DataTableFrameProps &
  (
    | (UseDataTableOptions<TData> & { readonly table?: undefined })
    | {
        /** A table from `useDataTable`, for state you read outside. */
        readonly table: DataTableInstance<TData>;
      }
  );

function DataTableFrame<TData>({
  table,
  title,
  toolbar,
  layout = "fill",
  responsive = true,
  className,
  actionRef,
  children,
}: DataTableFrameProps & { table: DataTableInstance<TData> }) {
  useImperativeHandle(
    actionRef,
    () => ({ reload: table.reload, reset: table.reset }),
    [table.reload, table.reset],
  );
  const fill = layout === "fill";
  return (
    <DataTableProvider table={table}>
      <div
        data-slot="data-table-root"
        data-layout={layout}
        className={cn(
          "relative flex min-w-0 flex-col gap-3",
          fill && "h-full min-h-0",
          className,
        )}
      >
        {children ?? (
          <>
            <DataTableSlotContent slot="header" />
            <DataTableToolbar title={title} actions={toolbar} />
            <DataTableContent
              responsive={responsive}
              className={cn("rounded-xl border", fill && "flex-1")}
            />
            {table.paginated && <DataTablePagination />}
          </>
        )}
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 z-30 flex justify-center",
            table.paginated ? "bottom-14" : "bottom-4",
          )}
        >
          <DataTableSlotContent slot="floating" />
        </div>
      </div>
    </DataTableProvider>
  );
}

function DataTableWithState<TData>({
  title,
  toolbar,
  layout,
  responsive,
  className,
  actionRef,
  children,
  ...options
}: DataTableFrameProps & UseDataTableOptions<TData>) {
  const table = useDataTable(options);
  return (
    <DataTableFrame
      table={table}
      title={title}
      toolbar={toolbar}
      layout={layout}
      responsive={responsive}
      className={className}
      actionRef={actionRef}
    >
      {children}
    </DataTableFrame>
  );
}

/**
 * A data table driven by field configuration: pass `columns` with `data` or
 * `request`, and add features with `plugins`.
 */
export function DataTable<TData>(props: DataTableProps<TData>) {
  if (props.table) return <DataTableFrame {...props} table={props.table} />;
  return <DataTableWithState {...props} />;
}
