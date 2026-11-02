"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { DataTableInstance, DataTablePlugin } from "@/components/ui/data-table/types";

const DataTableContext = createContext<DataTableInstance<unknown> | null>(null);

export function DataTableProvider<TData>({
  table,
  children,
}: {
  table: DataTableInstance<TData>;
  children: ReactNode;
}) {
  return (
    <DataTableContext.Provider value={table as DataTableInstance<unknown>}>
      {table.plugins.map(
        (plugin) =>
          plugin.setup && (
            <PluginSetup key={plugin.name} plugin={plugin} table={table} />
          ),
      )}
      {children}
    </DataTableContext.Provider>
  );
}

/** Each plugin's hooks live in their own component, so plugins can change. */
function PluginSetup<TData>({
  plugin,
  table,
}: {
  plugin: DataTablePlugin<TData>;
  table: DataTableInstance<TData>;
}) {
  plugin.setup?.(table);
  return null;
}

/** The table from the nearest DataTable or DataTableProvider. */
export function useDataTableContext<TData = unknown>() {
  const table = useContext(DataTableContext);
  if (!table) throw new Error("DataTable parts must render inside DataTable");
  return table as DataTableInstance<TData>;
}
