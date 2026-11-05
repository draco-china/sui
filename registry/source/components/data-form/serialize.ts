import { z } from "zod";
import { filterOperators } from "@/components/ui/data-form/conditions";
import type { DataFormFieldConfig } from "@/components/ui/data-form/types";
import { builtInValueTypes } from "@/components/ui/data-form/value-types";
import type { ValueTypeMap } from "@/components/ui/data-form/value-types/types";

interface RuleShape {
  field?: string;
  operator?: string;
  value?: unknown;
  logic?: "and" | "or";
  rules?: RuleShape[];
}

/** Built on first use, so importing DataForm costs no schema work. */
function buildSchema() {
  const operator = z.enum(filterOperators as [string, ...string[]]);
  const condition: z.ZodType<RuleShape> = z.lazy(() =>
    z.union([
      z.object({
        logic: z.enum(["and", "or"]),
        rules: z.array(condition),
      }),
      z.object({
        id: z.string().optional(),
        field: z.string(),
        operator,
        value: z.unknown().optional(),
      }),
    ]),
  );
  const color = z
    .enum(["default", "secondary", "destructive", "outline"])
    .optional();
  const option = z.object({
    value: z.string(),
    label: z.string(),
    color,
    disabled: z.boolean().optional(),
  });
  const reactionState = z
    .object({
      hidden: z.boolean(),
      required: z.boolean(),
      disabled: z.boolean(),
      readonly: z.boolean(),
      value: z.unknown(),
      fieldProps: z.record(z.string(), z.unknown()),
      options: z.array(option),
    })
    .partial();
  const field = z.object({
    name: z.string().min(1),
    label: z.string().optional(),
    description: z.string().optional(),
    tooltip: z.string().optional(),
    placeholder: z.string().optional(),
    valueType: z.string().optional(),
    valueEnum: z
      .union([
        z.array(option),
        z.record(
          z.string(),
          z.union([
            z.string(),
            z.object({
              text: z.string(),
              color,
              disabled: z.boolean().optional(),
            }),
          ]),
        ),
      ])
      .optional(),
    options: z.array(option).optional(),
    fieldProps: z.record(z.string(), z.unknown()).optional(),
    hidden: z.boolean().optional(),
    required: z.boolean().optional(),
    disabled: z.boolean().optional(),
    readonly: z.boolean().optional(),
    reactions: z
      .array(
        z.object({
          when: condition,
          fulfill: reactionState.optional(),
          otherwise: reactionState.optional(),
        }),
      )
      .optional(),
    dependencies: z.array(z.string()).optional(),
    clearOnChange: z.union([z.boolean(), z.array(z.string())]).optional(),
    initialValue: z.unknown().optional(),
    colSpan: z.number().int().min(1).max(4).optional(),
    step: z.string().optional(),
    lightMode: z.enum(["inline", "popover", "more"]).optional(),
    className: z.string().optional(),
  });
  return z.array(field);
}

/** The JSON shape of `fields`, for checking what a server sends. */
export const dataFormSchema = z.lazy(buildSchema);

export class DataFormSerializeError extends Error {
  readonly path: string;
  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "DataFormSerializeError";
    this.path = path;
  }
}

function assertPlain(value: unknown, path: string): void {
  if (typeof value === "function")
    throw new DataFormSerializeError(path, "functions cannot be serialized.");
  if (value && typeof value === "object") {
    if ("$$typeof" in value)
      throw new DataFormSerializeError(
        path,
        "React elements cannot be serialized; use text.",
      );
    if (value instanceof Date) return;
    for (const [key, item] of Object.entries(value))
      assertPlain(item, `${path}.${key}`);
  }
}

/**
 * Turns `fields` into JSON. Throws at the first function or element, naming
 * its path, instead of dropping it silently.
 */
export function serializeFields(
  fields: readonly DataFormFieldConfig[],
): string {
  fields.forEach((item, index) => {
    assertPlain(item, `fields[${index}]`);
  });
  return JSON.stringify(fields);
}

/**
 * Reads JSON `fields`, from a server or a form builder. Throws when the
 * shape is wrong or a `valueType` is not registered.
 */
export function parseFields(
  json: string | unknown,
  options: { readonly valueTypes?: ValueTypeMap } = {},
): DataFormFieldConfig[] {
  const data = typeof json === "string" ? JSON.parse(json) : json;
  const fields = dataFormSchema.parse(data) as DataFormFieldConfig[];
  const known = { ...builtInValueTypes, ...options.valueTypes };
  fields.forEach((item, index) => {
    if (item.valueType && !known[item.valueType])
      throw new DataFormSerializeError(
        `fields[${index}].valueType`,
        `"${item.valueType}" is not registered; pass it in valueTypes.`,
      );
  });
  return fields;
}
