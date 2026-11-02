export type ValueFormatter = (value: number) => string;

/** Wraps `Intl.NumberFormat`, e.g. `numberFormatter({ notation: "compact" })`. */
export function numberFormatter(
  options?: Intl.NumberFormatOptions,
  locale?: string,
): ValueFormatter {
  const format = new Intl.NumberFormat(locale, options);
  return (value) => format.format(value);
}

export const defaultValueFormatter = numberFormatter();

/** Formats a tooltip or axis value, leaving non-numbers as they are. */
export function formatValue(value: unknown, formatter: ValueFormatter) {
  return typeof value === "number" ? formatter(value) : String(value ?? "");
}
