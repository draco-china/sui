import { describe, expect, test } from "bun:test";
import {
  DataTable,
  type DataTableColumnDef,
  DataTableSearch,
} from "@workspace/ui/blocks/data-table";
import type { Table } from "@workspace/ui/blocks/data-table/types";
import { ProfileForm } from "@workspace/ui/blocks/tanstack-form";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { NavigationProgress } from "@workspace/ui/components/navigation-progress";
import { renderToString } from "react-dom/server";

import { chineseTableLabels } from "../src/examples/variants/block-table-labels";

type RecordRow = { id: string; name: string; status: string; amount: number };
const data: RecordRow[] = [
  { id: "1", name: "Alpine", status: "active", amount: 30 },
  { id: "2", name: "Alpha", status: "active", amount: 10 },
  { id: "3", name: "Beta", status: "closed", amount: 20 },
];
const columns: [
  DataTableColumnDef<RecordRow>,
  DataTableColumnDef<RecordRow>,
  DataTableColumnDef<RecordRow>,
] = [
  { accessorKey: "name", header: "Name", meta: { search: true } },
  {
    accessorKey: "status",
    header: "Status",
    meta: {
      filter: {
        multiple: true,
        options: [
          { label: "Active", value: "active" },
          { label: "Closed", value: "closed" },
        ],
      },
    },
  },
  { accessorKey: "amount", header: "Amount" },
];

describe("shared data table behavior", () => {
  test("renders no automatic controls even when columns have search and filter metadata", () => {
    const html = renderToString(<DataTable columns={columns} data={data} />);
    expect(html).not.toContain('aria-label="Columns"');
    expect(html).not.toContain('aria-label="Density"');
    expect(html).not.toContain('placeholder="Search name"');
    expect(html).toContain(">Alpine<");
  });
  test("English table defaults and application translations reach search, pagination, and empty content", () => {
    for (const translated of [false, true]) {
      const html = renderToString(
        <DataTable
          columns={columns}
          data={data}
          labels={translated ? chineseTableLabels : undefined}
        >
          {({ content, table, labels }) => (
            <>
              <DataTableSearch table={table} labels={labels} />
              {content}
            </>
          )}
        </DataTable>,
      );
      expect(html).toContain(
        translated ? 'placeholder="搜索name"' : 'placeholder="Search name"',
      );
      expect(html).toContain(
        translated ? 'aria-label="下一页"' : 'aria-label="Next page"',
      );
      expect(html).toContain(translated ? "共 3 条" : "Total 3 rows");
      const empty = renderToString(
        <DataTable
          columns={columns}
          data={[]}
          labels={translated ? chineseTableLabels : undefined}
        />,
      );
      expect(empty).toContain(translated ? "暂无数据" : "No data");
    }
    const partial = renderToString(
      <DataTable columns={columns} data={[]} labels={{ noData: "没有记录" }} />,
    );
    expect(partial).toContain("没有记录");
    expect(partial).toContain('aria-label="Next page"');
  });
  test("render children own placement around the table content", () => {
    const html = renderToString(
      <DataTable columns={columns} data={data}>
        {({ content }) => (
          <>
            <p>Accounts overview</p>
            {content}
            <button type="button">Export accounts</button>
          </>
        )}
      </DataTable>,
    );
    const tableIndex = html.indexOf('data-slot="ui-table-scroll-area"');
    expect(html.indexOf("Accounts overview")).toBeLessThan(tableIndex);
    expect(html.indexOf("Export accounts")).toBeGreaterThan(tableIndex);
    expect(html.match(/<table\s/g)?.length).toBe(1);
  });
  test("filters and sorts before paging with stable row identities", () => {
    let instance: Table<RecordRow> | undefined;
    const html = renderToString(
      <DataTable
        columns={columns}
        data={data}
        rowKey="id"
        label="Accounts"
        initialState={{
          columnFilters: [{ id: "status", value: ["active"] }],
          sorting: [{ id: "amount", desc: false }],
          pagination: { pageIndex: 0, pageSize: 1 },
        }}
      >
        {({ table, content }) => {
          instance = table;
          return content;
        }}
      </DataTable>,
    );
    expect(instance?.getRowModel().rows.map((row) => row.id)).toEqual(["2"]);
    expect(instance?.getPageCount()).toBe(2);
    expect(html).toContain('aria-label="Accounts"');
    expect(html).toContain('data-slot="table"');
    expect(html).toContain('aria-sort="ascending"');
    expect(html).not.toContain(">Beta<");
  });
  test("manual mode preserves externally filtered rows", () => {
    let instance: Table<RecordRow> | undefined;
    renderToString(
      <DataTable
        columns={columns}
        data={data}
        table={{ manual: true }}
        initialState={{ columnFilters: [{ id: "status", value: ["missing"] }] }}
      >
        {({ table, content }) => {
          instance = table;
          return content;
        }}
      </DataTable>,
    );
    expect(
      instance?.getRowModel().rows.map((row) => row.original.name),
    ).toEqual(["Alpine", "Alpha", "Beta"]);
  });
  test("drag mode disables normal sorting and pagination", () => {
    let instance: Table<RecordRow> | undefined;
    const html = renderToString(
      <DataTable
        columns={columns}
        data={data}
        rowKey="id"
        dragSort={{ rowKey: "id" }}
        initialState={{
          sorting: [{ id: "amount", desc: false }],
          pagination: { pageIndex: 0, pageSize: 1 },
        }}
      >
        {({ table, content }) => {
          instance = table;
          return content;
        }}
      </DataTable>,
    );
    expect(instance?.getRowModel().rows.map((row) => row.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(html).not.toContain('aria-sort="ascending"');
  });
  test("filter-only columns stay hidden inside grouped headers while their filters still apply", () => {
    let instance: Table<RecordRow> | undefined;
    const grouped: DataTableColumnDef<RecordRow>[] = [
      {
        id: "account",
        header: "Account",
        columns: [
          columns[0],
          { ...columns[1], meta: { ...columns[1].meta, filterOnly: true } },
        ],
      },
      columns[2],
    ];
    renderToString(
      <DataTable
        columns={grouped}
        data={data}
        rowKey="id"
        initialState={{ columnFilters: [{ id: "status", value: ["closed"] }] }}
      >
        {({ table, content }) => {
          instance = table;
          return content;
        }}
      </DataTable>,
    );
    expect(
      instance?.getVisibleLeafColumns().map((column) => column.id),
    ).toEqual(["name", "amount"]);
    expect(instance?.getColumn("status")?.getCanHide()).toBe(false);
    expect(
      instance?.getRowModel().rows.map((row) => row.original.name),
    ).toEqual(["Beta"]);
  });
  test("selection utility column cannot be hidden and pins to the start", () => {
    let instance: Table<RecordRow> | undefined;
    const select: DataTableColumnDef<RecordRow> = {
      id: "select",
      header: "Select",
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          aria-label={`Select ${row.id}`}
        />
      ),
    };
    renderToString(
      <DataTable columns={[select, ...columns]} data={data} rowKey="id">
        {({ table, content }) => {
          instance = table;
          return content;
        }}
      </DataTable>,
    );
    expect(instance?.getColumn("select")?.getCanHide()).toBe(false);
    expect(instance?.getColumn("select")?.getIsPinned()).toBe("start");
  });
});

test("multiple shared forms generate independent labels and do not submit during SSR", () => {
  const html = renderToString(
    <>
      <ProfileForm
        onSubmit={() => {
          throw new Error("Must not submit on SSR");
        }}
      />
      <ProfileForm
        onSubmit={() => {
          throw new Error("Must not submit on SSR");
        }}
      />
    </>,
  );
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
});

test("navigation feedback is hidden and stable before client navigation", () => {
  const html = renderToString(
    <NavigationProgress active={false} label="正在加载页面" />,
  );
  expect(html).toContain('hidden=""');
  expect(html).toContain('data-state="idle"');
  expect(html).toContain('aria-label="正在加载页面"');
  expect(html).toContain("motion-reduce:transition-none");
});
