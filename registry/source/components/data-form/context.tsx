"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import type { DataFormInstance, DataFormPluginStore } from "@/components/ui/data-form/types";

const DataFormContext = createContext<DataFormInstance | null>(null);

export function DataFormProvider({
  form,
  children,
}: {
  form: DataFormInstance;
  children: ReactNode;
}) {
  return (
    <DataFormContext.Provider value={form}>{children}</DataFormContext.Provider>
  );
}

export function useDataFormContext(): DataFormInstance {
  const form = useContext(DataFormContext);
  if (!form)
    throw new Error(
      "DataForm parts must be used inside <DataForm> or <DataFormRoot>.",
    );
  return form;
}

export type DataFormLayout = "vertical" | "horizontal" | "grid" | "light";

export interface DataFormLayoutState {
  readonly layout: DataFormLayout;
  /** Grid columns on wide containers, for `layout="grid"`. */
  readonly columns: 1 | 2 | 3 | 4;
  /** Fields shown while collapsed; undefined when the form can't collapse. */
  readonly collapseCount?: number;
  readonly collapsed?: boolean;
  /** `sm` matches compact toolbars: 32px controls in light rows. */
  readonly size?: "sm" | "default";
}

const LayoutContext = createContext<DataFormLayoutState>({
  layout: "vertical",
  columns: 1,
});

export function DataFormLayoutProvider({
  value,
  children,
}: {
  value: DataFormLayoutState;
  children: ReactNode;
}) {
  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

export function useDataFormLayout() {
  return useContext(LayoutContext);
}

const FillContext = createContext(false);

/**
 * Marks a fixed-height frame such as a dialog: the form fills it, its
 * fields scroll and its footer stays in view. Each part lays itself out.
 */
export function DataFormFill({ children }: { children: ReactNode }) {
  return <FillContext.Provider value>{children}</FillContext.Provider>;
}

export function useDataFormFill() {
  return useContext(FillContext);
}

export function createPluginStore(): DataFormPluginStore {
  const state = new Map<string, unknown>();
  const listeners = new Set<() => void>();
  return {
    get: <T,>(key: string) => state.get(key) as T | undefined,
    set: (key, value) => {
      if (Object.is(state.get(key), value)) return;
      state.set(key, value);
      for (const listener of listeners) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** State a plugin keeps on the form, such as the current step. */
export function usePluginState<T>(
  form: DataFormInstance,
  key: string,
  initial: T,
): [T, (value: T) => void] {
  const store = form.pluginStore;
  // Only this key's value: other plugins' state doesn't render this one.
  const read = () => store.get<T>(key);
  const value = useSyncExternalStore(store.subscribe, read, read) ?? initial;
  const set = useCallback((next: T) => store.set(key, next), [store, key]);
  return [value, set];
}

/**
 * Calls `callback` once values stop changing for `delay` ms. Only value
 * changes count, not submitting or validation.
 */
export function useValuesSettled(
  form: DataFormInstance,
  callback: () => void,
  delay: number,
) {
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    let last = form.api.state.values;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscription = form.api.store.subscribe(() => {
      const values = form.api.state.values;
      if (values === last) return;
      last = values;
      clearTimeout(timer);
      timer = setTimeout(() => latest.current(), delay);
    });
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [form, delay]);
}
