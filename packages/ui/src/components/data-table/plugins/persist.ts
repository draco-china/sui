"use client";

import { useEffect } from "react";
import type {
  DataTableColumnState,
  DataTableDensity,
  DataTableInstance,
  DataTablePlugin,
  DataTableView,
} from "../types";

export interface PersistOptions {
  /** Storage key; use one per table. */
  readonly key: string;
  readonly storage?: () => Storage | undefined;
}

interface Stored {
  readonly columns?: DataTableColumnState;
  readonly density?: DataTableDensity;
  readonly view?: DataTableView;
}

const browserStorage = () =>
  typeof window === "undefined" ? undefined : window.localStorage;

function read(options: PersistOptions): Stored {
  try {
    const value = (options.storage ?? browserStorage)()?.getItem(options.key);
    return value ? (JSON.parse(value) as Stored) : {};
  } catch {
    return {};
  }
}

function usePersist<TData>(
  table: DataTableInstance<TData>,
  options: PersistOptions,
) {
  const { columnState, density } = table;
  // Only a table with other views has a choice to keep
  const view = table.hasPlugin("views") ? table.view : undefined;
  const { key, storage = browserStorage } = options;
  useEffect(() => {
    try {
      storage()?.setItem(
        key,
        JSON.stringify({
          columns: columnState,
          density,
          view,
        } satisfies Stored),
      );
    } catch {
      // Private browsing or a full quota; the table keeps working unsaved.
    }
  }, [columnState, density, view, key, storage]);
}

/** Remembers column visibility, order, pinning, widths, density and view. */
export function persist<TData>(
  options: PersistOptions,
): DataTablePlugin<TData> {
  return {
    name: "persist",
    initialColumnState: () => read(options).columns,
    initialDensity: () => read(options).density,
    initialView: () => read(options).view,
    setup: (table) => usePersist(table, options),
  };
}
