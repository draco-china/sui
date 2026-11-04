import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  isStaleModuleError,
  reloadForStaleModule,
} from "@workspace/ui/lib/stale-module";

const globals = globalThis as unknown as Record<string, unknown>;
const saved = {
  sessionStorage: globals.sessionStorage,
  window: globals.window,
};

afterEach(() => {
  globals.sessionStorage = saved.sessionStorage;
  globals.window = saved.window;
});

describe("isStaleModuleError", () => {
  test("knows each browser's failed dynamic import", () => {
    for (const message of [
      "Failed to fetch dynamically imported module: /assets/chart-1a2b.js",
      "Importing a module script failed.",
      "error loading dynamically imported module: /assets/chart.js",
    ])
      expect(isStaleModuleError(new TypeError(message))).toBe(true);
  });

  test("leaves other errors alone", () => {
    expect(isStaleModuleError(new Error("Request failed with 500"))).toBe(
      false,
    );
    expect(isStaleModuleError(undefined)).toBe(false);
  });
});

describe("reloadForStaleModule", () => {
  test("reloads once a minute at most", () => {
    const store = new Map<string, string>();
    const reload = mock(() => {});
    globals.sessionStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    };
    globals.window = { location: { reload } };
    expect(reloadForStaleModule()).toBe(true);
    expect(reloadForStaleModule()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  test("keeps the error showing when storage is unavailable", () => {
    const reload = mock(() => {});
    globals.sessionStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
    };
    globals.window = { location: { reload } };
    expect(reloadForStaleModule()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
