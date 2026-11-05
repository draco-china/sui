import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DataForm,
  type DataFormFieldConfig,
  DataFormItem,
  evaluateCondition,
  fieldDependencies,
  filterOperators,
  matchesOperator,
  parseFields,
  prepareValues,
  resolveFieldState,
  serializeFields,
} from "@workspace/ui/components/data-form";
import { Input } from "@workspace/ui/components/input";
import { renderToString } from "react-dom/server";
// Internals the package does not export; the tests read them directly.
import {
  clearTriggers,
  convertValues,
  isFieldHidden,
  issuesToErrors,
  readServerErrors,
} from "../../../packages/ui/src/components/data-form/engine";
import {
  getPath,
  omitPath,
  setPath,
} from "../../../packages/ui/src/components/data-form/path";
import type { DataFormFieldEntry } from "../../../packages/ui/src/components/data-form/types";

const enterprise = {
  logic: "and" as const,
  rules: [{ field: "type", operator: "eq" as const, value: "enterprise" }],
};

describe("field state", () => {
  test("the cheap hidden check agrees with the full state", () => {
    const field: DataFormFieldConfig = {
      name: "company",
      reactions: [{ when: enterprise, otherwise: { hidden: true } }],
      options: () => {
        throw new Error("Options are not built to answer hidden");
      },
    };
    expect(isFieldHidden(field, { type: "personal" })).toBe(true);
    expect(isFieldHidden(field, { type: "enterprise" })).toBe(false);
    expect(
      isFieldHidden({ name: "salary" }, {}, { access: { salary: "hidden" } }),
    ).toBe(true);
  });

  test("JSON and function reactions resolve to the same state", () => {
    const json: DataFormFieldConfig = {
      name: "company",
      reactions: [
        {
          when: enterprise,
          fulfill: { hidden: false, required: true },
          otherwise: { hidden: true },
        },
      ],
    };
    const fn: DataFormFieldConfig = {
      name: "company",
      hidden: (values) => values.type !== "enterprise",
      required: (values) => values.type === "enterprise",
    };
    for (const type of ["enterprise", "personal"]) {
      const a = resolveFieldState(json, { type });
      const b = resolveFieldState(fn, { type });
      expect({ hidden: a.hidden, required: a.required }).toEqual({
        hidden: b.hidden,
        required: b.required,
      });
    }
  });

  test("layers apply in order: static, JSON, function, readonly, access", () => {
    const field: DataFormFieldConfig = {
      name: "salary",
      disabled: true,
      hidden: () => false,
      reactions: [
        {
          when: { logic: "and", rules: [] },
          fulfill: { disabled: false, hidden: true },
        },
      ],
    };
    const state = resolveFieldState(field, {});
    expect(state.disabled).toBe(false);
    expect(state.hidden).toBe(false);
    expect(
      resolveFieldState(field, {}, { access: { salary: "hidden" } }).hidden,
    ).toBe(true);
    const readonly = resolveFieldState(
      { name: "a", required: true },
      {},
      { readonly: true },
    );
    expect(readonly).toMatchObject({ readonly: true, required: false });
    expect(
      resolveFieldState(
        { name: "a" },
        {},
        { readonly: true, access: () => "edit" },
      ).readonly,
    ).toBe(false);
  });

  test("options come from request, options, then valueEnum", () => {
    const state = resolveFieldState(
      {
        name: "status",
        valueEnum: { open: { text: "Open", color: "default" }, done: "Done" },
      },
      {},
    );
    expect(state.options?.map((option) => option.value)).toEqual([
      "open",
      "done",
    ]);
    expect(state.options?.[0]?.color).toBe("default");
    const fromOptions = resolveFieldState(
      {
        name: "status",
        options: [{ value: "x", label: "X" }],
        valueEnum: { open: "Open" },
      },
      {},
    );
    expect(fromOptions.options?.map((option) => option.value)).toEqual(["x"]);
  });
});

describe("dependencies", () => {
  test("reactions declare their fields; function props follow everything", () => {
    expect(
      fieldDependencies({ name: "company", reactions: [{ when: enterprise }] }),
    ).toEqual(["type"]);
    expect(fieldDependencies({ name: "a", hidden: () => true })).toBe("all");
    expect(
      fieldDependencies({ name: "a", hidden: () => true, dependencies: ["b"] }),
    ).toEqual(["b"]);
  });

  test("clearOnChange watches dependencies or the listed fields", () => {
    expect(
      clearTriggers({
        name: "city",
        dependencies: ["province"],
        clearOnChange: true,
      }),
    ).toEqual(["province"]);
    expect(clearTriggers({ name: "city", clearOnChange: ["country"] })).toEqual(
      ["country"],
    );
    expect(clearTriggers({ name: "city" })).toEqual([]);
  });
});

describe("submission", () => {
  const entry = (
    name: string,
    extra: Partial<DataFormFieldEntry> = {},
  ): DataFormFieldEntry => ({
    name,
    isHidden: () => false,
    ...extra,
  });

  test("hidden fields are left out, transforms and dates applied", () => {
    const result = prepareValues(
      {
        name: "Ada",
        company: "Acme",
        range: [new Date(2026, 0, 2), new Date(2026, 0, 9)],
        at: new Date(2026, 0, 2, 9, 30),
        empty: null,
      },
      {
        hidden: ["company"],
        entries: [
          entry("company"),
          entry("range", {
            transform: (value) => {
              const [start, end] = value as [string, string];
              return { startAt: start, endAt: end };
            },
          }),
        ],
        omitNil: true,
      },
    );
    expect(result).toEqual({
      name: "Ada",
      startAt: "2026-01-02",
      endAt: "2026-01-09",
      at: "2026-01-02T09:30",
    });
  });

  test("date fields write days, date-time fields keep midnight", () => {
    const midnight = new Date(2026, 0, 2);
    const result = prepareValues(
      { day: new Date(2026, 0, 2, 15, 30), at: midnight, other: midnight },
      {
        hidden: [],
        // A Map iterator, as the form passes its registry, is read once.
        entries: new Map([
          ["day", entry("day", { dateMode: "date" })],
          ["at", entry("at", { dateMode: "dateTime" })],
        ]).values(),
      },
    );
    expect(result).toEqual({
      day: "2026-01-02",
      at: "2026-01-02T00:00",
      other: "2026-01-02",
    });
  });

  test("timestamps and the form transform", () => {
    const date = new Date(2026, 4, 1);
    expect(
      prepareValues(
        { at: date },
        {
          hidden: [],
          entries: [],
          dateFormatter: "number",
          transform: (v) => ({ ...v, ok: true }),
        },
      ),
    ).toEqual({ at: date.getTime(), ok: true });
  });

  test("schema issues skip hidden fields and map array paths", () => {
    expect(
      issuesToErrors(
        [
          { message: "Required", path: ["company"] },
          { message: "Too short", path: ["members", 0, { key: "name" }] },
          { message: "Whole form" },
        ],
        ["company"],
      ),
    ).toEqual({
      form: "Whole form",
      fields: { "members[0].name": "Too short" },
    });
  });

  test("convertValue reads stored values and skips missing ones", () => {
    const split = (value: unknown) => String(value).split(",");
    expect(convertValues({}, [{ name: "tags", convertValue: split }])).toEqual(
      {},
    );
    expect(
      convertValues({ tags: "a,b" }, [{ name: "tags", convertValue: split }]),
    ).toEqual({ tags: ["a", "b"] });
    expect(
      convertValues({}, [
        { name: "tags", initialValue: "c", convertValue: split },
      ]),
    ).toEqual({ tags: ["c"] });
  });

  test("server errors read from a result or a thrown value", () => {
    expect(
      readServerErrors({ fields: { email: ["Taken", "Other"] }, form: "No" }),
    ).toEqual({
      fields: { email: "Taken" },
      form: "No",
    });
    expect(readServerErrors(new Error("boom"))).toBeUndefined();
    expect(readServerErrors(undefined)).toBeUndefined();
  });
});

describe("conditions", () => {
  const cases: [string, unknown, unknown, boolean][] = [
    ["eq", 2, "2", true],
    ["neq", "a", "b", true],
    ["contains", "Hello", "ell", true],
    ["contains", ["a", "b"], "b", true],
    ["startsWith", "Hello", "he", true],
    ["gt", 3, 2, true],
    ["gte", 2, 2, true],
    ["lt", "2026-01-01", "2026-02-01", true],
    ["lte", 1, 0, false],
    ["between", 5, [1, 10], true],
    ["in", "b", ["a", "b"], true],
    ["notIn", "c", ["a", "b"], true],
    ["isEmpty", "", undefined, true],
  ];
  test("covers every operator", () => {
    expect(new Set(cases.map(([operator]) => operator))).toEqual(
      new Set(filterOperators),
    );
    for (const [operator, cell, value, expected] of cases)
      expect(
        matchesOperator(operator as never, cell, value),
        `${operator}`,
      ).toBe(expected);
  });

  test("groups nest and empty values do not match eq", () => {
    expect(evaluateCondition(enterprise, { type: "" })).toBe(false);
    expect(
      evaluateCondition(
        {
          logic: "or",
          rules: [
            enterprise,
            {
              logic: "and",
              rules: [{ field: "seats", operator: "gte", value: 50 }],
            },
          ],
        },
        { type: "personal", seats: 80 },
      ),
    ).toBe(true);
  });
});

describe("paths and serialization", () => {
  test("paths read and write through arrays", () => {
    const value = setPath({}, "members[1].name", "Ada");
    expect(getPath(value, "members[1].name")).toBe("Ada");
    expect(Array.isArray((value as { members: unknown }).members)).toBe(true);
    expect(omitPath<unknown>({ a: { b: 1, c: 2 } }, "a.b")).toEqual({
      a: { c: 2 },
    });
  });

  test("JSON fields round-trip and functions are refused by path", () => {
    const fields: DataFormFieldConfig[] = [
      {
        name: "type",
        label: "Type",
        valueType: "radio",
        valueEnum: { a: "A", b: "B" },
      },
      {
        name: "company",
        reactions: [{ when: enterprise, fulfill: { required: true } }],
      },
    ];
    expect(parseFields(serializeFields(fields))).toEqual(fields);
    expect(() => serializeFields([{ name: "x", hidden: () => true }])).toThrow(
      "fields[0].hidden",
    );
    expect(() =>
      serializeFields([{ name: "x", request: async () => [] }]),
    ).toThrow("fields[0].request");
    expect(() =>
      serializeFields([{ name: "x", validators: { onBlur: () => undefined } }]),
    ).toThrow("fields[0].validators.onBlur");
    expect(
      parseFields([{ name: "x", lightMode: "inline" }])[0]?.lightMode,
    ).toBe("inline");
    expect(() => parseFields([{ name: "x", valueType: "money2" }])).toThrow(
      "money2",
    );
  });
});

test("two forms on one page render unique ids", () => {
  const form = (
    <DataForm
      fields={[
        { name: "name", label: "Name", required: true },
        {
          name: "role",
          label: "Role",
          valueType: "radio",
          valueEnum: { a: "A", b: "B" },
        },
      ]}
    >
      <DataFormItem name="email" label="Email">
        <Input />
      </DataFormItem>
    </DataForm>
  );
  const html = renderToString(
    <>
      {form}
      {form}
    </>,
  );
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  expect(ids.length).toBeGreaterThan(4);
  expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  const targets = [...html.matchAll(/\sfor="([^"]+)"/g)].map(
    (match) => match[1],
  );
  for (const target of targets) expect(ids).toContain(target);
});

test("DataForm never imports DataTable, so installing it stays small", async () => {
  const root = join(
    import.meta.dir,
    "../../../packages/ui/src/components/data-form",
  );
  const files = await readdir(root, { recursive: true });
  for (const file of files.filter((name) => /\.tsx?$/.test(name))) {
    const source = await readFile(join(root, file), "utf8");
    expect(source, file).not.toMatch(/data-table/);
  }
});
