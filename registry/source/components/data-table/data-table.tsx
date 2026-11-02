"use client";

import { cn } from "cn";
import { type ReactNode, type Ref, useImperativeHandle } from "react";
import { DataTableContent } from "@/components/ui/data-table/content";
import { DataTableProvider } from "@/components/ui/data-table/context";
import { DataTablePagination } from "@/components/ui/data-table/pagination";
import { DataTableSlotContent, DataTableToolbar } from "@/components/ui/data-table/toolbar";
import type { DataTableActions, DataTableInstance } from "@/components/ui/data-table/types";
import { type UseDataTableOptions, useDataTable } from "@/components/ui/data-table/use-data-table";

interface DataTableFrameProps {
  /** Shown at the start of the toolbar. */
  readonly title?: ReactNode;
  /** Buttons at the end of the toolbar, before plugin controls. */
  readonly toolbar?: ReactNode;
  /**
   * `fill` takes the parent's height: the table is as tall as its rows up to
   * the space left, then scrolls, and the pagination stays at the bottom.
   * `auto` grows with its rows.
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
            {/* A few rows keep their own height; the space goes between the
                table and the pagination rather than into an empty table. */}
            <DataTableContent
              responsive={responsive}
              className={cn("rounded-xl border", fill && "flex-initial")}
            />
            {table.paginated && (
              <DataTablePagination className={cn(fill && "mt-auto")} />
            )}
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
