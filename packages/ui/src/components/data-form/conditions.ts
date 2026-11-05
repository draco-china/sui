import { getPath } from "./path";

export type FilterOperator =
  | "eq"
  | "neq"
  | "contains"
  | "startsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "in"
  | "notIn"
  | "isEmpty";

export interface FilterRule {
  readonly id?: string;
  readonly field: string;
  readonly operator: FilterOperator;
  readonly value?: unknown;
}

export interface FilterGroup {
  readonly logic: "and" | "or";
  readonly rules: readonly (FilterRule | FilterGroup)[];
}

export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true;
  if (Array.isArray(value)) return value.every(isEmptyValue);
  return false;
}

export function toTime(value: unknown): number | undefined {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value !== "string" || value === "") return undefined;
  // Date-only strings parse as UTC midnight; read them as local days instead.
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (day) return new Date(+day[1], +day[2] - 1, +day[3]).getTime();
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : time;
}

export function toNumber(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const number = Number(value);
  return Number.isNaN(number) ? undefined : number;
}

/** Numbers, then dates, then text, as tables sort and rules compare. */
export function compareValues(a: unknown, b: unknown) {
  const left = toNumber(a) ?? toTime(a);
  const right = toNumber(b) ?? toTime(b);
  if (left !== undefined && right !== undefined) return left - right;
  return String(a ?? "").localeCompare(String(b ?? ""));
}

export function includesText(cell: unknown, value: unknown) {
  return String(cell ?? "")
    .toLocaleLowerCase()
    .includes(String(value).toLocaleLowerCase());
}

function asList(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Whether a list holds the item, compared as text: `["1"]` holds `1`. */
export function listHas(list: unknown, item: unknown) {
  return asList(list).some((entry) => String(entry) === String(item));
}

const matchers: Record<
  FilterOperator,
  (cell: unknown, value: unknown) => boolean
> = {
  eq: (cell, value) => compareValues(cell, value) === 0,
  neq: (cell, value) => compareValues(cell, value) !== 0,
  contains: (cell, value) =>
    Array.isArray(cell)
      ? cell.some((item) => includesText(item, value))
      : includesText(cell, value),
  startsWith: (cell, value) =>
    String(cell ?? "")
      .toLocaleLowerCase()
      .startsWith(String(value).toLocaleLowerCase()),
  gt: (cell, value) => compareValues(cell, value) > 0,
  gte: (cell, value) => compareValues(cell, value) >= 0,
  lt: (cell, value) => compareValues(cell, value) < 0,
  lte: (cell, value) => compareValues(cell, value) <= 0,
  between: (cell, value) => {
    const [start, end] = asList(value);
    const afterStart = isEmptyValue(start) || compareValues(cell, start) >= 0;
    const beforeEnd = isEmptyValue(end) || compareValues(cell, end) <= 0;
    return afterStart && beforeEnd;
  },
  in: (cell, value) => listHas(value, cell),
  notIn: (cell, value) => !listHas(value, cell),
  isEmpty: (cell) => isEmptyValue(cell),
};

export const filterOperators = Object.keys(matchers) as FilterOperator[];

export function isFilterOperator(value: unknown): value is FilterOperator {
  return typeof value === "string" && Object.hasOwn(matchers, value);
}

/** Compares one value; `eq` with an empty value is false, unlike a filter. */
export function matchesOperator(
  operator: FilterOperator,
  cell: unknown,
  value: unknown,
) {
  return matchers[operator](cell, value);
}

/**
 * A table filter rule: an empty rule value matches every row, so a rule the
 * reader has not filled in yet does not hide anything.
 */
export function matchesRule(rule: FilterRule, cell: unknown) {
  if (rule.operator !== "isEmpty" && isEmptyValue(rule.value)) return true;
  return matchers[rule.operator](cell, rule.value);
}

function isGroup(rule: FilterRule | FilterGroup): rule is FilterGroup {
  return "rules" in rule;
}

/** Evaluates a condition against form values; groups may nest. */
export function evaluateCondition(
  group: FilterGroup,
  values: unknown,
): boolean {
  if (group.rules.length === 0) return true;
  const results = group.rules.map((rule) =>
    isGroup(rule)
      ? evaluateCondition(rule, values)
      : matchesOperator(rule.operator, getPath(values, rule.field), rule.value),
  );
  return group.logic === "or" ? results.some(Boolean) : results.every(Boolean);
}

/** Every field a condition reads, for subscriptions. */
export function conditionFields(group: FilterGroup): string[] {
  return group.rules.flatMap((rule) =>
    isGroup(rule) ? conditionFields(rule) : [rule.field],
  );
}
