import { strict as assert } from "node:assert";
import { installDom, waitFor } from "../support/dom";
import { scenario } from "../support/scenario";

const window = installDom("http://localhost/users?tab=all", {
  width: 1280,
  height: 800,
});
const document = window.document;

const { MotionGlobalConfig } = await import("motion/react");
// Exit animations would keep leaving rows mounted between assertions.
MotionGlobalConfig.skipAnimations = true;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { fireEvent } = await import("@testing-library/react");
const ui = await import("@workspace/ui/components/data-table");
type Instance =
  import("@workspace/ui/components/data-table").DataTableInstance<Row>;
type Params =
  import("@workspace/ui/components/data-table").DataTableRequestParams;

type Row = { id: string; name: string; status: "on" | "off"; amount: number };
const rows: Row[] = Array.from({ length: 23 }, (_, index) => ({
  id: String(index + 1),
  name: `Row ${index + 1}`,
  status: index % 3 === 0 ? "off" : "on",
  amount: index * 10,
}));
const columns: import("@workspace/ui/components/data-table").DataTableColumn<Row>[] =
  [
    { key: "name", title: "Name", keyword: true, sortable: true, search: true },
    {
      key: "status",
      title: "Status",
      valueEnum: [
        { value: "on", label: "On" },
        { value: "off", label: "Off" },
      ],
    },
    { key: "amount", title: "Amount", valueType: "number" },
  ];

const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);
let table: Instance | undefined;
async function settle(ms = 0) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}
const bodyRows = () =>
  [...document.querySelectorAll('[data-slot="data-table-body"] tr')].filter(
    (row) => row.querySelector('[data-slot="data-table-cell"]'),
  );
const cellText = () => bodyRows().map((row) => row.children[0]?.textContent);

function Probe(
  props: Partial<
    import("@workspace/ui/components/data-table").UseDataTableOptions<Row>
  >,
) {
  const instance = ui.useDataTable<Row>({
    rowKey: "id",
    columns,
    data: rows,
    ...props,
  });
  table = instance;
  return <ui.DataTable table={instance} responsive={false} layout="auto" />;
}

scenario("local rows page, sort and keep the page in range");
await act(async () => root.render(<Probe />));
assert.equal(bodyRows().length, 10);
assert.ok(document.body.textContent?.includes("23 rows"));
await act(async () => table?.setPage(3));
await waitFor(() => assert.equal(bodyRows().length, 3));
await act(async () => table?.toggleSort("amount"));
await act(async () => table?.toggleSort("amount"));
assert.deepEqual(table?.state.sort, [{ key: "amount", order: "desc" }]);
assert.equal(table?.state.page, 1, "Sorting returns to the first page");
assert.equal(cellText()[0], "Row 23");

scenario("keyword search debounces and quick filters combine");
const input = document.querySelector<HTMLInputElement>('input[type="search"]');
assert.ok(input);
await act(async () => {
  fireEvent.change(input, { target: { value: "Row 2" } });
});
assert.equal(table?.state.query.keyword, "", "Keyword waits for the debounce");
await waitFor(() => assert.equal(table?.state.query.keyword, "Row 2"));
assert.equal(table?.total, 5);
await act(async () => table?.setFilter("status", ["off"]));
assert.deepEqual(cellText(), ["Row 22"]);
assert.equal(
  document.querySelector('[data-slot="data-table-filter-chips"]'),
  null,
  "The toolbar has no chip row by default",
);
const clearAll = document.querySelector<HTMLButtonElement>(
  '[data-slot="data-table-clear-filters"]',
);
assert.ok(clearAll, "Active conditions offer one clear-all button");
await act(async () => {
  fireEvent.click(clearAll);
});
assert.equal(table?.state.query.keyword, "");
assert.deepEqual(table?.state.query.filters, {});
assert.equal(table?.total, 23);
assert.equal(
  document.querySelector('[data-slot="data-table-clear-filters"]'),
  null,
  "Without conditions the button is gone",
);

scenario("selection persists across pages and the bulk bar clears on Escape");
await act(async () =>
  root.render(
    <Probe
      rowSelection
      plugins={[
        ui.bulkActions<Row>((selected) => <span>bulk {selected.length}</span>),
      ]}
    />,
  ),
);
const checkbox = bodyRows()[0]?.querySelector<HTMLElement>('[role="checkbox"]');
assert.ok(checkbox);
await act(async () => fireEvent.click(checkbox));
await act(async () => table?.setPage(2));
assert.equal(table?.selection?.rows.length, 1);
assert.ok(
  document.querySelector('[role="toolbar"]')?.textContent?.includes("bulk 1"),
);
const dialog = document.createElement("div");
dialog.setAttribute("role", "dialog");
document.body.append(dialog);
await act(async () => {
  dialog.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
});
dialog.remove();
assert.equal(
  table?.selection?.rows.length,
  1,
  "Escape that closes a dialog keeps the selection",
);
await act(async () => {
  bodyRows()[0]?.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );
});
assert.equal(table?.selection?.rows.length, 0);
const selectAll = () =>
  document.querySelector<HTMLElement>('thead [role="checkbox"]');
await act(async () => fireEvent.click(selectAll() as HTMLElement));
assert.equal(table?.selection?.rows.length, 10, "Header selects the page");
assert.equal(selectAll()?.getAttribute("aria-checked"), "true");
await act(async () => fireEvent.click(selectAll() as HTMLElement));
assert.equal(table?.selection?.rows.length, 0, "A second click clears it");
assert.equal(selectAll()?.getAttribute("aria-checked"), "false");

scenario(
  "rows without a rowKey keep their selection and report it after commit",
);
const reported: string[][] = [];
await act(async () =>
  root.render(
    <Probe
      key="auto-ids"
      rowKey={undefined}
      rowSelection={{
        onChange: (selected) => reported.push(selected.map((row) => row.id)),
        isDisabled: (row) => row.id === "2",
      }}
    />,
  ),
);
const rowCheckbox = (index: number) =>
  bodyRows()[index]?.querySelector<HTMLElement>('[role="checkbox"]');
await act(async () => fireEvent.click(rowCheckbox(0) as HTMLElement));
assert.deepEqual(reported, [["1"]], "onChange runs once per change");
await act(async () => table?.setPage(2));
assert.equal(
  rowCheckbox(0)?.getAttribute("aria-checked"),
  "false",
  "Page 2's first row is not the selected page 1 row",
);
await act(async () => table?.setPage(1));
assert.equal(rowCheckbox(0)?.getAttribute("aria-checked"), "true");
const locked = rows[1] as Row;
await act(async () =>
  table?.selection?.toggle(table.getRowId(locked, 1), locked),
);
assert.equal(table?.selection?.rows.length, 1, "Disabled rows stay unselected");
assert.equal(table?.selection?.isDisabled(locked), true);

scenario("reordering filtered rows keeps the rows the filter hides");
await act(async () => root.render(<Probe key="drag" pagination={false} />));
await act(async () => table?.setFilter("status", ["off"]));
const visible = [...(table?.rows ?? [])];
const reordered = [...visible.slice(1), visible[0] as Row];
let merged: readonly Row[] = [];
await act(async () => {
  merged = table?.setRows(reordered) ?? [];
});
assert.equal(merged.length, rows.length);
assert.deepEqual(
  merged.filter((row) => row.status === "off"),
  reordered,
  "Filtered rows take the new order",
);
assert.deepEqual(
  merged.filter((row) => row.status === "on"),
  rows.filter((row) => row.status === "on"),
  "Hidden rows keep their order",
);
await act(async () => table?.setFilter("status", []));
assert.equal(table?.total, rows.length);

scenario("expandable rows reveal details under the row");
await act(async () =>
  root.render(
    <Probe plugins={[ui.expandable<Row>((row) => <p>detail {row.id}</p>)]} />,
  ),
);
const toggle = document.querySelector<HTMLElement>(
  'button[aria-label="Expand row"]',
);
assert.ok(toggle);
await act(async () => fireEvent.click(toggle));
await waitFor(() => assert.ok(document.body.textContent?.includes("detail 1")));

scenario("query form applies fields together on submit");
await act(async () => root.render(<Probe plugins={[ui.queryForm<Row>()]} />));
const form = document.querySelector('[data-slot="data-table-query-form"]');
const field = form?.querySelector<HTMLInputElement>("input");
assert.ok(form && field);
await act(async () => {
  fireEvent.change(field, { target: { value: "Row 1" } });
});
assert.equal(table?.total, 23, "Typing does not apply the draft");
await act(async () => {
  fireEvent.submit(form);
});
// Submitting runs the form's (possibly async) validation first.
await waitFor(() =>
  assert.deepEqual(table?.state.query.search, { name: "Row 1" }),
);
assert.equal(table?.total, 11);

scenario("URL sync writes state and keeps unrelated parameters");
await act(async () =>
  root.render(<Probe plugins={[ui.urlSync<Row>({ prefix: "u_" })]} />),
);
await act(async () => table?.setPage(2));
assert.ok(window.location.search.includes("tab=all"));
assert.ok(window.location.search.includes("u_page=2"));
await act(async () => root.render(null));
await act(async () =>
  root.render(<Probe plugins={[ui.urlSync<Row>({ prefix: "u_" })]} />),
);
assert.equal(table?.state.page, 2, "State restores from the URL");

scenario("remote requests receive parameters and ignore stale responses");
const calls: Params[] = [];
const resolvers: (() => void)[] = [];
function request(params: Params) {
  calls.push(params);
  return new Promise<{ data: Row[]; total: number }>((resolve) => {
    const start = (params.page - 1) * params.pageSize;
    resolvers.push(() =>
      resolve({
        data: rows.slice(start, start + params.pageSize),
        total: rows.length,
      }),
    );
  });
}
await act(async () => root.render(null));
await act(async () =>
  root.render(<Probe data={undefined} request={request} />),
);
await settle();
assert.equal(calls.length, 1);
assert.equal(calls[0]?.page, 1);
await act(async () => table?.setPage(2));
await settle();
assert.equal(calls.length, 2);
assert.equal(calls[0]?.signal.aborted, true, "Changing parameters aborts");
await act(async () => resolvers[0]?.());
await settle();
assert.equal(bodyRows().length, 0, "The aborted response is ignored");
await act(async () => resolvers[1]?.());
await settle();
assert.equal(cellText()[0], "Row 11");
assert.equal(table?.loading, false);
await act(async () => table?.reload());
await settle();
assert.equal(calls.length, 3);
assert.equal(calls[2]?.page, 2);

await act(async () => root.unmount());
await window.happyDOM.abort();
