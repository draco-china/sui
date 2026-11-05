import { strict as assert } from "node:assert";
import { installDom, waitFor } from "../support/dom";
import { scenario } from "../support/scenario";

const window = installDom("http://localhost/users", {
  width: 1280,
  height: 800,
});
const document = window.document;
const { MotionGlobalConfig } = await import("motion/react");
MotionGlobalConfig.skipAnimations = true;
const { act } = await import("react");
const { createRoot } = await import("react-dom/client");
const { fireEvent } = await import("@testing-library/react");
const ui = await import("@workspace/ui/components/data-table");
type Row = {
  id: string;
  name: string;
  status: "on" | "off";
  joined: string;
  salary: number;
};
type Column =
  import("@workspace/ui/components/data-table").DataTableColumn<Row>;
type Instance =
  import("@workspace/ui/components/data-table").DataTableInstance<Row>;
type Plugin =
  import("@workspace/ui/components/data-table").DataTablePlugin<Row>;

const rows: Row[] = Array.from({ length: 12 }, (_, index) => ({
  id: String(index + 1),
  name: `Row ${index + 1}`,
  status: index % 3 === 0 ? "off" : "on",
  joined: `2026-01-${String(index + 1).padStart(2, "0")}`,
  salary: 1000 * (index + 1),
}));
const statusOptions = [
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
];
const columns: Column[] = [
  { key: "name", title: "Name", keyword: true, search: true },
  { key: "status", title: "Status", valueEnum: statusOptions },
  { key: "joined", title: "Joined", valueType: "date", search: true },
  { key: "salary", title: "Salary", valueType: "money" },
];

const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);
let table: Instance | undefined;
function Capture() {
  table = ui.useDataTableContext() as Instance;
  return null;
}
async function settle(ms = 0) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}
const strip = () =>
  document.querySelector('[data-slot="data-table-toolbar-filters"]');
const lightButton = (text: string) =>
  [
    ...(strip()?.querySelectorAll<HTMLButtonElement>(
      '[data-slot="data-form-light-field"]',
    ) ?? []),
  ].find((button) => button.textContent?.includes(text));
const cellText = () =>
  [...document.querySelectorAll('[data-slot="data-table-body"] tr')].map(
    (row) =>
      row.querySelector('[data-slot="data-table-cell"]')?.textContent ?? "",
  );
function render(props: {
  plugins?: readonly Plugin[];
  maxFilters?: number;
  access?: import("@workspace/ui/components/data-form").DataFormAccessMap;
  columns?: Column[];
  key: string;
}) {
  return act(async () =>
    root.render(
      <ui.DataTable
        key={props.key}
        rowKey="id"
        columns={props.columns ?? columns}
        data={rows}
        plugins={props.plugins}
        maxFilters={props.maxFilters}
        access={props.access}
      >
        <Capture />
        <ui.DataTableSlotContent slot="header" />
        <ui.DataTableToolbar maxFilters={props.maxFilters} />
        <ui.DataTableContent />
      </ui.DataTable>,
    ),
  );
}

scenario("light filters follow the table and write to it");
{
  await render({ key: "light" });
  const status = lightButton("Status");
  assert.ok(status, "The quick filter is a light field");
  assert.ok(status.textContent?.includes("Any"));
  await act(async () => table?.setFilter("status", ["off"]));
  await settle();
  assert.ok(
    lightButton("Status")?.textContent?.includes("Off"),
    "The button sums up a filter set elsewhere",
  );
  await act(async () => fireEvent.click(lightButton("Status") as Element));
  const optionOn = () =>
    [...document.querySelectorAll("[cmdk-item]")].find((item) =>
      item.textContent?.includes("On"),
    );
  await waitFor(() =>
    assert.ok(optionOn(), "The popover lists options with counts"),
  );
  await act(async () => fireEvent.click(optionOn() as Element));
  await waitFor(() =>
    assert.deepEqual(table?.state.query.filters.status, ["off", "on"]),
  );
  await act(async () => table?.resetQuery());
  await waitFor(() =>
    assert.ok(lightButton("Status")?.textContent?.includes("Any")),
  );
  assert.deepEqual(table?.state.query.filters.status ?? [], []);
  assert.ok(
    strip()?.querySelector('[data-slot="date-time-field"]'),
    "The date range stays on the row",
  );
}

scenario("filters past maxFilters apply together from one panel");
{
  await render({ key: "more", maxFilters: 0 });
  const more = strip()?.querySelector<HTMLButtonElement>(
    '[data-slot="data-form-more-filters"]',
  );
  assert.ok(more);
  await act(async () => fireEvent.click(more));
  const panel = () =>
    document.querySelector(
      '[data-slot="popover-content"] form[data-slot="data-form"]',
    );
  await waitFor(() => assert.ok(panel(), "The panel is a draft form"));
  assert.ok(
    document
      .querySelector('[data-slot="popover-title"]')
      ?.textContent?.includes("Filters"),
    "The panel has a heading",
  );
  assert.equal(
    table?.state.query.filters.status ?? undefined,
    undefined,
    "Nothing applies before Apply",
  );
  await act(async () => table?.setFilter("status", ["on"]));
  await waitFor(() =>
    assert.ok(
      more.textContent?.includes("1"),
      "The button counts the filters in use",
    ),
  );
}

scenario("quick filters sit inline, behind a button or in Filters");
{
  const modes: Column[] = [
    { key: "name", title: "Name", keyword: true },
    {
      key: "status",
      title: "Status",
      valueEnum: statusOptions,
      filter: "inline",
    },
    {
      key: "salary",
      title: "Salary",
      valueType: "money",
      filter: "more",
      valueEnum: [{ value: "1000", label: "1000" }],
    },
  ];
  await render({ key: "modes", columns: modes, maxFilters: 5 });
  const row = strip();
  const inline = row?.querySelector('[data-mode="inline"]');
  assert.ok(inline?.textContent?.includes("Status"), "Inline shows its label");
  const dropdown = inline?.querySelector("button[id]");
  assert.ok(dropdown, "Its dropdown is on the row");
  assert.equal(
    dropdown.getAttribute("aria-label"),
    "Status",
    "The label inside is only seen, so the dropdown names itself",
  );
  assert.ok(
    row?.querySelector('[data-slot="data-form-more-filters"]'),
    "`more` goes to Filters even with room on the row",
  );
}

scenario("the query form runs DataForm reactions and keeps table values");
{
  const reactive: Column[] = [
    { key: "name", title: "Name", search: true },
    {
      key: "joined",
      title: "Joined",
      valueType: "date",
      search: {
        reactions: [
          {
            when: {
              logic: "and",
              rules: [{ field: "name", operator: "eq", value: "hide" }],
            },
            fulfill: { hidden: true },
          },
        ],
      },
    },
  ];
  await render({
    key: "query",
    columns: reactive,
    plugins: [ui.queryForm<Row>({ collapsed: false })],
  });
  const form = document.querySelector<HTMLFormElement>(
    '[data-slot="data-table-query-form"]',
  );
  const name = form?.querySelector<HTMLInputElement>('input[name="name"]');
  assert.ok(form && name);
  assert.ok(form.querySelector('[data-slot="date-time-field"]'));
  await act(async () => {
    fireEvent.change(name, { target: { value: "hide" } });
  });
  await settle();
  assert.equal(
    form.querySelector('[data-slot="date-time-field"]'),
    null,
    "A reaction hides the date field",
  );
  await act(async () => fireEvent.submit(form));
  await waitFor(() =>
    assert.deepEqual(table?.state.query.search, { name: "hide" }),
  );
  await act(async () => table?.setSearch({ name: "Row 1" }));
  await settle();
  assert.equal(name.value, "Row 1", "The form follows the table");
}

scenario("access hides columns and editable() saves a row");
{
  const saves: { row: Row; values: Record<string, unknown> }[] = [];
  const editing = [
    ui.editable<Row>({
      onSave: (row, values) => {
        saves.push({ row, values });
        if (values.name === "taken") return { fields: { name: "Taken." } };
      },
    }),
  ];
  await render({
    key: "editable",
    plugins: editing,
    access: { salary: "hidden", joined: "readonly" },
  });
  assert.ok(
    !document.body.textContent?.includes("Salary"),
    "Hidden columns leave the table",
  );
  const columnsBefore = table?.columns;
  await render({
    key: "editable",
    plugins: editing,
    access: { salary: "hidden", joined: "readonly" },
  });
  assert.equal(
    table?.columns,
    columnsBefore,
    "An inline access map that says the same keeps the columns",
  );
  const edit = () =>
    document.querySelector<HTMLButtonElement>(
      '[data-slot="data-table-body"] tr td:last-child button[aria-label="Edit"]',
    );
  assert.ok(edit(), "The edit buttons sit in the last column");
  await act(async () => fireEvent.click(edit() as Element));
  const nameInput = () =>
    document.querySelector<HTMLInputElement>('input[name="name"]');
  await waitFor(() => assert.ok(nameInput(), "The row turns into controls"));
  const name = nameInput() as HTMLInputElement;
  assert.equal(name.value, "Row 1");
  assert.equal(name.getAttribute("aria-label"), "Name");
  assert.equal(
    document.querySelector('input[name="joined"]'),
    null,
    "Read-only columns stay text",
  );
  await act(async () => {
    fireEvent.change(name, { target: { value: "taken" } });
  });
  const save = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Save"]',
  );
  assert.ok(save);
  await act(async () => fireEvent.click(save));
  await waitFor(() =>
    assert.ok(
      document.body.textContent?.includes("Taken."),
      "A server error shows in the row",
    ),
  );
  assert.equal(saves.length, 1);
  const status = document.querySelector<HTMLElement>(
    '[data-slot="data-table-body"] [aria-haspopup]',
  );
  assert.ok(status, "The status cell is a select");
  await act(async () => fireEvent.keyDown(status, { key: "Enter" }));
  await settle();
  assert.equal(saves.length, 1, "Enter on a select opens it, not saves");
  await act(async () => {
    fireEvent.change(name, { target: { value: "Renamed" } });
  });
  await act(async () => fireEvent.click(save));
  await waitFor(() => assert.equal(saves.length, 2));
  assert.deepEqual(saves.at(-1)?.values, {
    name: "Renamed",
    status: "off",
    joined: "2026-01-01",
  });
  assert.equal(
    document.querySelector('input[name="name"]'),
    null,
    "A successful save closes the row",
  );
  assert.equal(cellText()[0], "Row 1", "The page owns the rows");
  await act(async () => fireEvent.click(edit() as Element));
  await waitFor(() => assert.ok(nameInput()));
  await act(async () =>
    fireEvent.keyDown(nameInput() as Element, { key: "Escape" }),
  );
  await settle();
  assert.equal(nameInput(), null, "Escape in a cell cancels the row");
}

await act(async () => root.unmount());
await window.happyDOM.abort();
