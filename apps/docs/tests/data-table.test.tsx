import { describe, expect, test } from "bun:test";
import { Badge } from "@workspace/ui/components/badge";
import {
  columnSettings,
  DataTable,
  type DataTableColumn,
  dataTableLabels,
  dataTableLabelsZhCN,
  filterRows,
  matchesRule,
  queryForm,
  readUrlState,
  requestSearch,
  sortRows,
  toCsv,
  toFormFields,
  views,
  writeUrlState,
} from "@workspace/ui/components/data-table";
import {
  formatValue,
  normalizeColumns,
  optionText,
} from "@workspace/ui/components/data-table/columns";
import { renderToString } from "react-dom/server";

type Row = {
  id: string;
  name: string;
  status: "on" | "off";
  amount: number;
  createdAt: string;
  profile: { city: string };
};

const rows: Row[] = [
  {
    id: "1",
    name: "Alpine",
    status: "on",
    amount: 30,
    createdAt: "2026-01-05",
    profile: { city: "Hangzhou" },
  },
  {
    id: "2",
    name: "Alpha",
    status: "off",
    amount: 10,
    createdAt: "2026-02-10",
    profile: { city: "Shenzhen" },
  },
  {
    id: "3",
    name: "Beta, Inc",
    status: "on",
    amount: 20,
    createdAt: "2026-03-15",
    profile: { city: "Hangzhou" },
  },
];

const columns: DataTableColumn<Row>[] = [
  { key: "name", title: "Name", keyword: true, sortable: true, search: true },
  {
    key: "status",
    title: "Status",
    valueEnum: [
      { value: "on", label: "On" },
      { value: "off", label: "Off" },
    ],
  },
  {
    key: "amount",
    title: "Amount",
    valueType: "money",
    search: {
      transform: (value) => {
        const [min, max] = value as [string?, string?];
        return { min, max };
      },
    },
  },
  { key: "createdAt", title: "Created", valueType: "date", search: true },
  {
    key: "profile.city",
    id: "city",
    title: "City",
    search: { type: "select" },
  },
];
const normalized = normalizeColumns(columns, dataTableLabels);
const empty = { keyword: "", search: {}, filters: {} };
const ids = (list: readonly Row[]) => list.map((row) => row.id);

describe("column defaults", () => {
  test("valueEnum implies an enum column with a quick filter and select search", () => {
    const status = normalized.find((column) => column.id === "status");
    expect(status?.valueType).toBe("enum");
    expect(status?.filter).toBe(true);
    const amount = normalized.find((column) => column.id === "amount");
    expect(amount?.search?.type).toBe("numberRange");
    const created = normalized.find((column) => column.id === "createdAt");
    expect(created?.search?.type).toBe("dateRange");
  });
});

describe("local filtering", () => {
  test("keyword matches keyword columns case-insensitively", () => {
    expect(
      ids(filterRows(rows, normalized, { ...empty, keyword: "ALP" })),
    ).toEqual(["1", "2"]);
  });
  test("query form fields combine with AND, ranges include both ends", () => {
    const result = filterRows(rows, normalized, {
      ...empty,
      search: { amount: ["15", "30"], createdAt: [undefined, "2026-03-15"] },
    });
    expect(ids(result)).toEqual(["1", "3"]);
    expect(
      ids(
        filterRows(rows, normalized, {
          ...empty,
          search: { city: "Shenzhen" },
        }),
      ),
    ).toEqual(["2"]);
  });
  test("quick filters and advanced OR groups apply", () => {
    expect(
      ids(
        filterRows(rows, normalized, {
          ...empty,
          filters: { status: ["off"] },
        }),
      ),
    ).toEqual(["2"]);
    const advanced = {
      logic: "or" as const,
      rules: [
        { id: "a", field: "amount", operator: "gt" as const, value: "25" },
        {
          id: "b",
          field: "name",
          operator: "startsWith" as const,
          value: "beta",
        },
      ],
    };
    expect(ids(filterRows(rows, normalized, { ...empty, advanced }))).toEqual([
      "1",
      "3",
    ]);
  });
  test("rules without a value match everything except isEmpty", () => {
    expect(matchesRule({ id: "x", field: "name", operator: "eq" }, "a")).toBe(
      true,
    );
    expect(
      matchesRule({ id: "x", field: "name", operator: "isEmpty" }, "a"),
    ).toBe(false);
    expect(
      matchesRule(
        { id: "x", field: "d", operator: "between", value: ["2026-01-01", ""] },
        "2026-02-01",
      ),
    ).toBe(true);
  });
});

describe("sorting, requests and export", () => {
  test("multi-column sort is stable and numeric", () => {
    expect(
      ids(sortRows(rows, normalized, [{ key: "amount", order: "desc" }])),
    ).toEqual(["1", "3", "2"]);
    expect(
      ids(sortRows(rows, normalized, [{ key: "name", order: "asc" }])),
    ).toEqual(["2", "1", "3"]);
  });
  test("transform renames request parameters and empty values are dropped", () => {
    expect(
      requestSearch(normalized, {
        amount: ["1", "9"],
        name: "",
        createdAt: undefined,
      }),
    ).toEqual({ min: "1", max: "9" });
  });
  test("CSV escapes commas and writes enum labels", () => {
    const csv = toCsv(rows.slice(2), normalized);
    expect(csv.startsWith("﻿Name,Status,Amount,Created,City")).toBe(true);
    expect(csv).toContain('"Beta, Inc",On,$20.00');
  });
  test("URL state round-trips and leaves unrelated parameters", () => {
    const state = {
      page: 3,
      pageSize: 20,
      sort: [{ key: "amount", order: "desc" as const }],
      query: {
        keyword: "al",
        search: { amount: ["1", "2"] },
        filters: { status: ["on"] },
      },
    };
    const search = writeUrlState("?tab=users", state, "t_", 10);
    expect(search).toContain("tab=users");
    const parsed = readUrlState(search, "t_");
    expect(parsed).toEqual(state);
    expect(readUrlState("?tab=users", "t_")).toEqual({});
  });
  test("hand-edited URL values are dropped instead of crashing", () => {
    expect(readUrlState("?search=%7B&filters=null&advanced=%7B%7D")).toEqual(
      {},
    );
    const parsed = readUrlState(
      `?filters=${encodeURIComponent('{"status":"on","amount":[1]}')}&advanced=${encodeURIComponent('{"rules":[{"field":"name","operator":"drop"},{"field":"name","operator":"contains","value":"a"}]}')}`,
    );
    expect(parsed.query?.filters).toEqual({ amount: ["1"] });
    expect(parsed.query?.advanced).toEqual({
      logic: "and",
      rules: [{ id: "1", field: "name", operator: "contains", value: "a" }],
    });
  });
  test("CSV neutralizes formulas but keeps negative numbers", () => {
    const formula = normalizeColumns<Row>(
      [{ key: "name", title: "Name" }],
      dataTableLabels,
    );
    const csv = toCsv(
      [
        { ...rows[0], name: "=HYPERLINK(1)" },
        { ...rows[0], name: "-2+3+cmd|calc" },
        { ...rows[0], name: "-12.50" },
      ] as Row[],
      formula,
    );
    expect(csv).toContain("'=HYPERLINK(1)");
    expect(csv).toContain("'-2+3+cmd|calc");
    expect(csv).toContain("\r\n-12.50");
  });
  test("date-only values format as the same calendar day", () => {
    const html = renderToString(
      <DataTable
        rowKey="id"
        columns={[{ key: "createdAt", title: "Created", valueType: "date" }]}
        data={rows.slice(0, 1)}
      />,
    );
    expect(html).toContain("Jan 5, 2026");
  });
});

describe("server rendering", () => {
  test("renders headers, formatted cells, enum badges and the total", () => {
    const html = renderToString(
      <DataTable rowKey="id" columns={columns} data={rows} />,
    );
    expect(html).toContain("Amount");
    expect(html).toContain("$30.00");
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain("3 rows");
    expect(html).toContain('aria-sort="none"');
  });
  test("Chinese labels reach the empty state and pagination", () => {
    const html = renderToString(
      <DataTable columns={columns} data={[]} labels={dataTableLabelsZhCN} />,
    );
    expect(html).toContain("暂无数据");
    expect(html).toContain("共 0 条");
  });
  test("fill sizes the table by its rows and pins the pagination", () => {
    const tag = (html: string, pattern: RegExp) => html.match(pattern)?.[0];
    const content = /<[^>]*class="[^"]*rounded-xl border[^"]*"[^>]*>/;
    const pagination = /<[^>]*data-slot="data-table-pagination"[^>]*>/;
    const fill = renderToString(
      <DataTable rowKey="id" columns={columns} data={rows} />,
    );
    expect(tag(fill, content)).toContain("flex-initial");
    expect(tag(fill, content)).not.toMatch(/\sflex-1[\s"]/);
    expect(tag(fill, pagination)).toContain("mt-auto");
    const auto = renderToString(
      <DataTable rowKey="id" layout="auto" columns={columns} data={rows} />,
    );
    expect(tag(auto, content)).not.toContain("flex-initial");
    expect(tag(auto, pagination)).not.toContain("mt-auto");
  });
  test("query-form date fields are named by their labels", () => {
    const html = renderToString(
      <DataTable
        rowKey="id"
        columns={[
          {
            key: "createdAt",
            title: "Created",
            valueType: "date",
            search: { type: "dateRange" },
          },
        ]}
        data={rows}
        plugins={[queryForm<Row>()]}
      />,
    );
    const label = html.match(/<label[^>]*id="([^"]+-label)"/)?.[1];
    expect(label).toBeTruthy();
    expect(html).toContain(`aria-labelledby="${label}"`);
    expect(html).not.toContain('type="date"');
  });
  test("the toolbar stays one row: no chips by default, one clear-all button", () => {
    const query = { keyword: "Al", search: {}, filters: { status: ["on"] } };
    const active = renderToString(
      <DataTable
        rowKey="id"
        columns={columns}
        data={rows}
        initialState={{ query }}
      />,
    );
    expect(active).not.toContain('data-slot="data-table-filter-chips"');
    expect(active).toContain('data-slot="data-table-clear-filters"');
    expect(active).toContain(dataTableLabels.clearFilters);
    const idle = renderToString(
      <DataTable rowKey="id" columns={columns} data={rows} />,
    );
    expect(idle).not.toContain('data-slot="data-table-clear-filters"');
  });
  test("chips lists active conditions below the toolbar", () => {
    const html = renderToString(
      <DataTable
        rowKey="id"
        chips
        columns={columns}
        data={rows}
        initialState={{
          query: { keyword: "", search: {}, filters: { status: ["on"] } },
        }}
      />,
    );
    const chips = html.match(
      /data-slot="data-table-filter-chips"[\s\S]*$/,
    )?.[0];
    expect(chips).toBeTruthy();
    expect(chips).toContain("whitespace-nowrap");
    // The chip row carries the clear-all button, so the toolbar does not.
    expect(html).not.toContain('data-slot="data-table-clear-filters"');
  });
  test("resize handles sit on their own columns, inside the table", () => {
    const html = renderToString(
      <DataTable
        rowKey="id"
        columns={columns}
        data={rows}
        plugins={[columnSettings<Row>()]}
      />,
    );
    const headers = [...html.matchAll(/<th[^>]*class="([^"]*)"/g)].map(
      (match) => match[1],
    );
    expect(headers.length).toBeGreaterThan(0);
    // A static header would leave every handle on the sticky header's edge.
    for (const header of headers)
      expect(header).toMatch(/\b(relative|sticky)\b/);
    const handle = html.match(/class="([^"]*cursor-col-resize[^"]*)"/)?.[1];
    // The last column's handle stays inside, so a fitting table never
    // overflows by a pixel and shows a horizontal scrollbar.
    expect(handle).toContain("[th:last-child&gt;&amp;]:end-0");
  });
  test("remote tables render skeleton rows before the first response", () => {
    const html = renderToString(
      <DataTable
        columns={columns}
        request={() => ({ data: rows, total: 3 })}
      />,
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-slot="skeleton"');
  });
});

describe("filter option text", () => {
  test("reads the text inside an element label", () => {
    expect(optionText({ value: "on", label: <Badge>Enabled</Badge> })).toBe(
      "Enabled",
    );
  });

  test("falls back to the value when a label has no text", () => {
    expect(optionText({ value: "on", label: <span /> })).toBe("on");
  });
});

describe("toolbar filters", () => {
  /** The HTML of the toolbar's filter strip, before its actions. */
  const strip = (html: string) =>
    html.slice(
      html.indexOf('data-slot="data-table-toolbar-filters"'),
      html.indexOf('data-slot="data-table-toolbar-actions"'),
    );
  test("a date range sits on the row without a query form", () => {
    const html = renderToString(
      <DataTable rowKey="id" columns={columns} data={rows} />,
    );
    expect(strip(html)).toContain('data-slot="date-time-field"');
  });
  test("with a query form the date range stays in the form only", () => {
    const html = renderToString(
      <DataTable
        rowKey="id"
        columns={columns}
        data={rows}
        plugins={[queryForm<Row>()]}
      />,
    );
    expect(strip(html)).not.toContain('data-slot="date-time-field"');
  });
  test("maxFilters={0} moves every filter behind the Filters button", () => {
    const html = strip(
      renderToString(
        <DataTable rowKey="id" columns={columns} data={rows} maxFilters={0} />,
      ),
    );
    expect(html).toContain(dataTableLabels.moreFilters);
    expect(html).not.toContain('data-slot="date-time-field"');
    expect(html).not.toContain(">Status<");
  });
});

describe("views", () => {
  test("defaultView renders on the server, before any restore", () => {
    const html = renderToString(
      <DataTable
        rowKey="id"
        columns={columns}
        data={rows}
        plugins={[
          views<Row>({
            defaultView: "grid",
            grid: (row) => <div>{row.name}</div>,
          }),
        ]}
      />,
    );
    expect(html).toContain('data-slot="data-table-grid"');
    expect(html).toContain('data-slot="data-table-view"');
  });
});

describe("forms from columns", () => {
  test("toFormFields maps value types and honors form options", () => {
    const fields = toFormFields<Row>([
      { key: "name", title: "Name", form: { required: true } },
      {
        key: "status",
        title: "Status",
        valueEnum: [{ value: "on", label: "On" }],
      },
      {
        key: "amount",
        title: "Spend",
        valueType: "money",
        format: { currency: "CNY" },
      },
      { key: "createdAt", title: "Created", valueType: "date", form: false },
      { id: "actions", render: () => null },
    ] as DataTableColumn<Row>[]);
    expect(fields.map((field) => [field.name, field.valueType])).toEqual([
      ["name", "text"],
      // DataForm registers the table's names, `enum` among them.
      ["status", "enum"],
      ["amount", "money"],
    ]);
    expect(fields[0]?.required).toBe(true);
    expect(fields[2]?.fieldProps).toEqual({ format: { currency: "CNY" } });
  });

  test("cells format through the shared value types", () => {
    const context = {
      locale: "en-US",
      labels: dataTableLabels,
      format: undefined,
    };
    expect(formatValue("boolean", "false", context)).toBe("No");
    expect(formatValue("boolean", 1, context)).toBe("Yes");
    expect(formatValue("money", 12.5, context)).toBe("$12.50");
    expect(formatValue("percent", 12.5, context)).toBe("12.5%");
    expect(formatValue("date", "2026-01-02", context)).toBe("Jan 2, 2026");
  });
});
