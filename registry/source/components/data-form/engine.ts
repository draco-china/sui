import type { StandardSchemaV1 } from "@tanstack/react-form";
import { formatLocalDate } from "@/lib/date-time";
import { conditionFields, evaluateCondition, isEmptyValue } from "@/components/ui/data-form/conditions";
import { getPath, isPathWithin, omitPath, setPath } from "@/components/ui/data-form/path";
import type {
  DataFormAccess,
  DataFormAccessMap,
  DataFormDateFormatter,
  DataFormDynamic,
  DataFormFieldConfig,
  DataFormFieldEntry,
  DataFormFieldState,
  DataFormReactionState,
  DataFormServerErrors,
  DataFormValidator,
  DataFormValues,
} from "@/components/ui/data-form/types";
import { enumOptions } from "@/components/ui/data-form/value-types/shared";
import type { DataFormOption } from "@/components/ui/data-form/value-types/types";

type StateKey = "hidden" | "required" | "disabled" | "readonly";
const stateKeys: readonly StateKey[] = [
  "hidden",
  "required",
  "disabled",
  "readonly",
];

function isFunction<T>(
  value: DataFormDynamic<T, DataFormValues> | undefined,
): value is (values: DataFormValues) => T {
  return typeof value === "function";
}

export function accessOf(
  access: DataFormAccessMap | undefined,
  name: string,
): DataFormAccess | undefined {
  if (!access) return undefined;
  return typeof access === "function" ? access(name) : access[name];
}

/** The reaction branches that apply to the current values, in order. */
export function activeReactions(
  field: Pick<DataFormFieldConfig, "reactions">,
  values: DataFormValues,
): DataFormReactionState[] {
  return (field.reactions ?? []).flatMap((reaction) => {
    const branch = evaluateCondition(reaction.when, values)
      ? reaction.fulfill
      : reaction.otherwise;
    return branch ? [branch] : [];
  });
}

interface FormState {
  readonly readonly?: boolean;
  readonly access?: DataFormAccessMap;
}

/** The four flags, layered as `resolveFieldState` describes. */
function resolveFlags(
  field: DataFormFieldConfig,
  values: DataFormValues,
  form: FormState,
  branches: readonly DataFormReactionState[],
): Record<StateKey, boolean> {
  const flags: Record<StateKey, boolean> = {
    hidden: false,
    required: false,
    disabled: false,
    readonly: false,
  };
  for (const key of stateKeys) {
    const value = field[key];
    if (!isFunction(value) && value !== undefined) flags[key] = value;
  }
  for (const branch of branches)
    for (const key of stateKeys) {
      const value = branch[key];
      if (value !== undefined) flags[key] = value;
    }
  for (const key of stateKeys) {
    const value = field[key];
    if (isFunction(value)) flags[key] = Boolean(value(values));
  }
  if (form.readonly) flags.readonly = true;
  const access = accessOf(form.access, field.name);
  if (access === "hidden") flags.hidden = true;
  if (access === "readonly") flags.readonly = true;
  if (access === "edit") flags.readonly = false;
  if (flags.readonly) flags.required = false;
  return flags;
}

/**
 * A field's state for the current values. Each layer overrides the one
 * before it: static props, JSON reactions, function props, the form's
 * `readonly`, then `access`.
 */
export function resolveFieldState(
  field: DataFormFieldConfig,
  values: DataFormValues,
  form: FormState = {},
): DataFormFieldState {
  const branches = activeReactions(field, values);
  const flags = resolveFlags(field, values, form, branches);
  let fieldProps = isFunction(field.fieldProps) ? {} : (field.fieldProps ?? {});
  let options: readonly DataFormOption[] | undefined = isFunction(field.options)
    ? undefined
    : field.options;
  for (const branch of branches) {
    if (branch.fieldProps) fieldProps = { ...fieldProps, ...branch.fieldProps };
    if (branch.options) options = branch.options;
  }
  if (isFunction(field.fieldProps))
    fieldProps = { ...fieldProps, ...field.fieldProps(values) };
  if (isFunction(field.options)) options = field.options(values);
  if (!options && field.valueEnum) options = enumOptions(field.valueEnum);
  return { ...flags, fieldProps, options };
}

/** Only whether the field is hidden: no options or field props are built. */
export function isFieldHidden(
  field: DataFormFieldConfig,
  values: DataFormValues,
  form: FormState = {},
) {
  return resolveFlags(field, values, form, activeReactions(field, values))
    .hidden;
}

/**
 * The paths a field reads. `"all"` means it has function props without
 * declared dependencies, so it has to follow every value.
 */
export function fieldDependencies(
  field: DataFormFieldConfig,
): readonly string[] | "all" {
  const names = new Set(field.dependencies ?? []);
  for (const reaction of field.reactions ?? [])
    for (const name of conditionFields(reaction.when)) names.add(name);
  // `request` follows only its `dependencies`, so without them it loads once.
  const dynamic =
    stateKeys.some((key) => isFunction(field[key])) ||
    isFunction(field.fieldProps) ||
    isFunction(field.options);
  if (dynamic && !field.dependencies) return "all";
  names.delete(field.name);
  return [...names];
}

/** The fields `clearOnChange` watches. */
export function clearTriggers(field: DataFormFieldConfig): readonly string[] {
  if (!field.clearOnChange) return [];
  if (field.clearOnChange === true) {
    const dependencies = fieldDependencies(field);
    return dependencies === "all" ? [] : dependencies;
  }
  return field.clearOnChange;
}

/** The value the active reactions write, if any. */
export function reactionValue(
  field: Pick<DataFormFieldConfig, "reactions">,
  values: DataFormValues,
): { readonly value: unknown } | undefined {
  let result: { value: unknown } | undefined;
  for (const branch of activeReactions(field, values))
    if ("value" in branch) result = { value: branch.value };
  return result;
}

/** A required field is missing when it is empty, or an unchecked box. */
export function isMissing(value: unknown) {
  return isEmptyValue(value) || value === false;
}

export function hiddenNames(
  entries: Iterable<DataFormFieldEntry>,
  values: DataFormValues,
): string[] {
  const names: string[] = [];
  for (const entry of entries)
    if (entry.isHidden(values)) names.push(entry.name);
  return names;
}

export function isHiddenPath(path: string, hidden: readonly string[]) {
  return hidden.some((name) => isPathWithin(path, name));
}

type DateMode = "auto" | "date" | "dateTime";

function formatDate(
  date: Date,
  formatter: DataFormDateFormatter,
  mode: DateMode,
) {
  if (formatter === "number") return date.getTime();
  const hasTime = Boolean(
    date.getHours() || date.getMinutes() || date.getSeconds(),
  );
  const withTime = mode === "dateTime" || (mode === "auto" && hasTime);
  return formatLocalDate(
    date,
    withTime ? { seconds: date.getSeconds() !== 0 } : false,
  );
}

/** Writes every Date as a string or timestamp, through arrays and objects. */
export function formatDates(
  value: unknown,
  formatter: DataFormDateFormatter,
  mode: DateMode = "auto",
): unknown {
  if (formatter === false) return value;
  if (value instanceof Date) return formatDate(value, formatter, mode);
  if (Array.isArray(value))
    return value.map((item) => formatDates(item, formatter, mode));
  if (value && typeof value === "object" && value.constructor === Object)
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        formatDates(item, formatter, mode),
      ]),
    );
  return value;
}

function omitNil(value: DataFormValues): DataFormValues {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) => item !== null && item !== undefined,
    ),
  );
}

export interface PrepareOptions {
  readonly hidden: readonly string[];
  readonly entries: Iterable<DataFormFieldEntry>;
  readonly dateFormatter?: DataFormDateFormatter;
  readonly omitNil?: boolean;
  readonly transform?: (values: DataFormValues) => DataFormValues;
}

/**
 * The submission payload: hidden fields left out, field transforms applied,
 * dates formatted, then the form's own transform.
 */
export function prepareValues(
  values: DataFormValues,
  options: PrepareOptions,
): DataFormValues {
  // `entries` may be a one-shot iterator such as `Map.values()`.
  const entries = [...options.entries];
  let result = values;
  for (const name of options.hidden) result = omitPath(result, name);
  for (const entry of entries) {
    if (!entry.transform || options.hidden.includes(entry.name)) continue;
    const next = entry.transform(getPath(result, entry.name), values);
    if (
      next &&
      typeof next === "object" &&
      !Array.isArray(next) &&
      !(next instanceof Date)
    ) {
      result = { ...omitPath(result, entry.name), ...(next as DataFormValues) };
    } else {
      result = setPath(result, entry.name, next);
    }
  }
  const formatter = options.dateFormatter ?? "string";
  // Date fields write days and date-time fields keep their time, even at
  // midnight; other Dates follow what they hold.
  for (const entry of entries) {
    const mode = entry.dateMode;
    if (!mode || options.hidden.includes(entry.name)) continue;
    const value = getPath(result, entry.name);
    if (value !== undefined)
      result = setPath(result, entry.name, formatDates(value, formatter, mode));
  }
  result = formatDates(result, formatter) as DataFormValues;
  if (options.omitNil) result = omitNil(result);
  return options.transform ? options.transform(result) : result;
}

/** Applies each field's `convertValue` and `initialValue` to stored values. */
export function convertValues(
  values: DataFormValues,
  fields: readonly DataFormFieldConfig[],
): DataFormValues {
  let result = values;
  for (const field of fields) {
    let value = getPath(result, field.name);
    if (value === undefined && field.initialValue !== undefined)
      value = field.initialValue;
    // Nothing stored, nothing to convert; `initialValue` sets a start.
    if (field.convertValue && value !== undefined)
      value = field.convertValue(value);
    if (value !== undefined) result = setPath(result, field.name, value);
  }
  return result;
}

function isServerErrors(value: unknown): value is DataFormServerErrors {
  if (!value || typeof value !== "object") return false;
  const { fields, form } = value as DataFormServerErrors;
  const hasFields = Boolean(fields) && typeof fields === "object";
  return hasFields || typeof form === "string";
}

/** Fields that currently have errors, in the order the form knows them. */
export function invalidNames(state: {
  readonly fieldMeta: Readonly<
    Record<string, { readonly errors?: readonly unknown[] } | undefined>
  >;
}): string[] {
  return Object.entries(state.fieldMeta)
    .filter(([, meta]) => meta?.errors?.length)
    .map(([name]) => name);
}

/** The text of an error: a string, or anything with a `message`. */
export function errorText(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error)
    return String((error as { message: unknown }).message);
  return undefined;
}

function firstMessage(message: string | readonly string[]) {
  return typeof message === "string" ? message : message[0];
}

/** Reads `{ fields, form }` from what `onFinish` returned or threw. */
export function readServerErrors(value: unknown) {
  if (!isServerErrors(value)) return undefined;
  const fields = Object.fromEntries(
    Object.entries(value.fields ?? {})
      .map(([name, message]) => [name, firstMessage(message)] as const)
      .filter(([, message]) => Boolean(message)),
  ) as Record<string, string>;
  return { fields, form: value.form };
}

export function isStandardSchema(value: unknown): value is StandardSchemaV1 {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    "~standard" in (value as object)
  );
}

/** One Standard Schema issue. */
export interface SchemaIssue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
}

/** Turns an issue path into a field name: `["items", 0, "name"]` → `items[0].name`. */
export function issuePathName(path: SchemaIssue["path"]): string | undefined {
  if (!path?.length) return undefined;
  return path
    .map((segment) => {
      const key = typeof segment === "object" ? segment.key : segment;
      return typeof key === "number" ? `[${key}]` : `.${String(key)}`;
    })
    .join("")
    .replace(/^\./, "");
}

/** Maps schema issues to fields, leaving out hidden ones. */
export function issuesToErrors(
  issues: readonly SchemaIssue[],
  hidden: readonly string[],
): { form?: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  let form: string | undefined;
  for (const issue of issues) {
    const name = issuePathName(issue.path);
    if (!name) {
      form ??= issue.message;
      continue;
    }
    if (isHiddenPath(name, hidden)) continue;
    fields[name] ??= issue.message;
  }
  return { form, fields };
}

/** Runs one field validator on blur or submit; the first message or undefined. */
export function runValidatorSync(
  validator: DataFormValidator | undefined,
  value: unknown,
  values: DataFormValues,
): string | undefined {
  if (!validator) return undefined;
  if (isStandardSchema(validator)) {
    const result = validator["~standard"].validate(value);
    if (result instanceof Promise) return undefined;
    return result.issues?.[0]?.message;
  }
  return validator({ value, values }) || undefined;
}
