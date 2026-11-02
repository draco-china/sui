"use client";

import { useEffect } from "react";
import type {
  DataTableColumnState,
  DataTableDensity,
  DataTableInstance,
  DataTablePlugin,
} from "../types";

export interface PersistOptions {
  /** Storage key; use one per table. */
  readonly key: string;
  readonly storage?: () => Storage | undefined;
}

interface Stored {
  readonly columns?: DataTableColumnState;
  readonly density?: DataTableDensity;
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
  const { key, storage = browserStorage } = options;
  useEffect(() => {
    try {
      storage()?.setItem(
        key,
        JSON.stringify({ columns: columnState, density } satisfies Stored),
      );
    } catch {
      // Private browsing or a full quota; the table keeps working unsaved.
    }
  }, [columnState, density, key, storage]);
}

/** Remembers column visibility, order, pinning, widths and density. */
export function persist<TData>(
  options: PersistOptions,
): DataTablePlugin<TData> {
  return {
    name: "persist",
    initialColumnState: () => read(options).columns,
    initialDensity: () => read(options).density,
    setup: (table) => usePersist(table, options),
  };
}
