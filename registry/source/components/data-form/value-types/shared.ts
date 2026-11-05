import { isValidElement, type ReactNode } from "react";
import { isEmptyValue } from "@/components/ui/data-form/conditions";
import type {
  DataFormOption,
  ValueEditProps,
  ValueEnum,
  ValueReadProps,
} from "@/components/ui/data-form/value-types/types";

const enumCache = new WeakMap<object, readonly DataFormOption[]>();

/** Turns any `valueEnum` shape into a list of options, once per object. */
export function enumOptions(valueEnum?: ValueEnum): readonly DataFormOption[] {
  if (!valueEnum) return [];
  if (Array.isArray(valueEnum)) return valueEnum;
  const cached = enumCache.get(valueEnum);
  if (cached) return cached;
  const options = Object.entries(valueEnum).map(([value, entry]) => {
    if (entry && typeof entry === "object" && "text" in entry) {
      const { text, color, disabled } = entry as {
        text: ReactNode;
        color?: DataFormOption["color"];
        disabled?: boolean;
      };
      return { value, label: text, color, disabled };
    }
    return { value, label: entry as ReactNode };
  });
  enumCache.set(valueEnum, options);
  return options;
}

/** The text inside a node, through elements such as a badge. */
export function nodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node))
    return nodeText(node.props.children);
  return "";
}

const optionIndex = new WeakMap<
  readonly DataFormOption[],
  ReadonlyMap<string, DataFormOption>
>();

/** An option by value; lists are indexed once, as they render per item. */
export function findOption(
  options: readonly DataFormOption[],
  value: unknown,
): DataFormOption | undefined {
  let index = optionIndex.get(options);
  if (!index) {
    index = new Map(options.map((option) => [option.value, option]));
    optionIndex.set(options, index);
  }
  return index.get(String(value));
}

export function optionText(options: readonly DataFormOption[], value: unknown) {
  const option = findOption(options, value);
  if (!option) return String(value);
  return nodeText(option.label) || option.value;
}

export function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isEmptyValue(value)) return [];
  return [value];
}

/** Reads a `[start, end]` pair; either end may be empty. */
export function asPair(value: unknown): [unknown, unknown] {
  const [start, end] = Array.isArray(value) ? value : [];
  return [start, end];
}

/** Writes a pair, or `undefined` when both ends are empty. */
export function toPair(start: unknown, end: unknown): unknown {
  if (isEmptyValue(start) && isEmptyValue(end)) return undefined;
  return [
    isEmptyValue(start) ? undefined : start,
    isEmptyValue(end) ? undefined : end,
  ];
}

export function joinRange(start: string, end: string) {
  if (!start && !end) return "";
  return `${start || "…"} – ${end || "…"}`;
}

/** Plain text of a value, the default read view. */
export function plainText({ value }: ValueReadProps) {
  if (isEmptyValue(value)) return "";
  if (Array.isArray(value))
    return value.filter((item) => !isEmptyValue(item)).join(", ");
  return String(value);
}

/** The accessibility attributes every control shares. */
export function ariaProps(props: ValueEditProps) {
  return {
    "aria-invalid": props.invalid || undefined,
    "aria-required": props.required || undefined,
    "aria-describedby": props.describedBy,
    // Without a visible label (a table cell) the control names itself;
    // beside one that `for` cannot reach, it points at it.
    "aria-label": props.labelledBy ? undefined : props.label,
    "aria-labelledby": props.labelledBy || undefined,
  };
}

/** Props every editable control shares. */
export function controlProps(props: ValueEditProps) {
  return {
    id: props.id,
    name: props.name,
    disabled: props.disabled,
    ...ariaProps(props),
  };
}

export function asText(value: unknown) {
  return isEmptyValue(value) ? "" : String(value);
}

/**
 * The filled surface of inputs and select triggers, for a Button that acts
 * as a field (a light filter, a color trigger) rather than an action.
 */
export const fieldSurface =
  "rounded-3xl border-transparent bg-input/50 px-3 font-normal hover:bg-input/50 aria-expanded:bg-input/50 dark:bg-input/50 dark:hover:bg-input/50";

/**
 * `fieldProps` for an editing control, without the keys only read views
 * use (`format`), so they never reach a DOM element.
 */
export function editFieldProps(
  fieldProps: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  if (!("format" in fieldProps)) return fieldProps;
  const { format: _format, ...rest } = fieldProps;
  return rest;
}

const formatters = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

/** One formatter per locale and options: building them is the slow part. */
function cachedFormat<T extends Intl.NumberFormat | Intl.DateTimeFormat>(
  kind: string,
  locale: string | undefined,
  options: object,
  create: () => T,
): T {
  const key = `${kind}|${locale ?? ""}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key) as T | undefined;
  if (!formatter) {
    if (formatters.size > 200) formatters.clear();
    formatter = create();
    formatters.set(key, formatter);
  }
  return formatter;
}

export function numberFormat(
  locale: string | undefined,
  options: Intl.NumberFormatOptions,
) {
  return cachedFormat(
    "number",
    locale,
    options,
    () => new Intl.NumberFormat(locale, options),
  );
}

export function dateFormat(
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
) {
  return cachedFormat(
    "date",
    locale,
    options,
    () => new Intl.DateTimeFormat(locale, options),
  );
}
