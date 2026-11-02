import type { DataTablePlugin } from "../types";

export interface VirtualOptions {
  /** Estimated row height in pixels; rows should not wrap. */
  readonly rowHeight?: number;
  readonly overscan?: number;
}

/**
 * Renders only the rows in view. Use it with `pagination={false}` for large
 * local lists; it turns off row layout animation.
 */
export function virtual<TData>(
  options: VirtualOptions = {},
): DataTablePlugin<TData> {
  return {
    name: "virtual",
    features: {
      virtual: {
        rowHeight: options.rowHeight ?? 41,
        overscan: options.overscan ?? 8,
      },
    },
  };
}
