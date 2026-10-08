import { strict as assert } from "node:assert";
import { Window } from "happy-dom";

const window = new Window({ url: "http://localhost" });
// Happy DOM does not recognize the native search element yet.
Object.defineProperty(window.HTMLUnknownElement.prototype, Symbol.toStringTag, {
  get(this: HTMLElement) {
    return this.localName === "search" ? "HTMLElement" : "HTMLUnknownElement";
  },
});
Object.assign(globalThis, {
  window,
  document: window.document,
  Element: window.Element,
  HTMLElement: window.HTMLElement,
  HTMLInputElement: window.HTMLInputElement,
  HTMLButtonElement: window.HTMLButtonElement,
  Node: window.Node,
  SVGElement: window.SVGElement,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  ResizeObserver: window.ResizeObserver,
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true,
});
const { act } = await import("react");
const { render, cleanup, fireEvent } = await import("@testing-library/react");
const { DataTable, DataTableRefresh, DataTableSearch } = await import(
  "@workspace/ui/blocks/data-table"
);
const data = Array.from({ length: 23 }, (_, index) => ({
  id: String(index + 1),
  name: `Row ${index + 1}`,
}));
const columns = [{ accessorKey: "name", header: "Name" }];
type TableInstance = import("@workspace/ui/blocks/data-table/types").Table<
  (typeof data)[number]
>;
let table: TableInstance | undefined;
const initial = { pagination: { pageIndex: 0, pageSize: 10 } };
const changes: number[] = [];
function localProps() {
  return {
    columns,
    data,
    rowKey: "id" as const,
    initialState: { ...initial, pagination: { ...initial.pagination } },
    onChange: (
      state: import("@workspace/ui/blocks/data-table").DataTableState,
    ) => changes.push(state.pagination.pageIndex),
    children: (context: {
      table: TableInstance;
      content: import("react").ReactNode;
    }) => {
      table = context.table;
      return context.content;
    },
  };
}
const local = render(<DataTable {...localProps()} />);
assert.equal(changes.length, 0);
await act(async () => {
  table?.setPageIndex(1);
});
assert.equal(table?.store.state.pagination.pageIndex, 1);
assert.deepEqual(changes, [1]);
local.rerender(<DataTable {...localProps()} />);
assert.equal(
  table?.store.state.pagination.pageIndex,
  1,
  "Equivalent initial state must not reset pagination",
);
assert.deepEqual(
  changes,
  [1],
  "Changing the callback identity must not emit unchanged state",
);
local.rerender(
  <DataTable
    {...localProps()}
    initialState={{ pagination: { pageIndex: 2, pageSize: 10 } }}
  />,
);
assert.equal(
  table?.store.state.pagination.pageIndex,
  2,
  "Changed external state must synchronize",
);
assert.deepEqual(
  changes,
  [1],
  "Synchronizing external state must not create a notification loop",
);
cleanup();
async function until(condition: () => boolean) {
  for (let index = 0; index < 30 && !condition(); index++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  }
  assert.ok(condition(), "Async table state did not settle");
}
const loadingLocal = render(
  <DataTable columns={columns} data={data} rowKey="id" loading />,
);
assert.equal(
  loadingLocal.container.querySelectorAll("tbody tr").length,
  10,
  "Existing rows stay visible while loading",
);
assert.ok(
  loadingLocal.container.querySelector('[data-slot="data-table-loading"]'),
);
assert.ok(
  loadingLocal.container.querySelector(
    '[data-slot="ui-table-scroll-area"][inert]',
  ),
);
loadingLocal.rerender(
  <DataTable columns={columns} data={data} rowKey="id" loading={false} />,
);
assert.equal(
  loadingLocal.container.querySelector('[data-slot="data-table-loading"]'),
  null,
);
cleanup();
let finishPending: ((value: { data: typeof data }) => void) | undefined;
const pendingRequest = () =>
  new Promise<{ data: typeof data }>((resolve) => {
    finishPending = resolve;
  });
const switching = render(
  <DataTable
    columns={columns}
    data={data}
    request={pendingRequest}
    rowKey="id"
  />,
);
await until(
  () => !!switching.container.querySelector('[data-slot="data-table-loading"]'),
);
switching.rerender(<DataTable columns={columns} data={data} rowKey="id" />);
assert.equal(
  switching.container.querySelector('[data-slot="data-table-loading"]'),
  null,
  "Removing a request must clear its loading state",
);
await act(async () => {
  finishPending?.({ data: [{ id: "stale", name: "Stale response" }] });
});
assert.ok(
  switching.container.querySelector("tbody tr")?.textContent?.includes("Row 1"),
  "Late removed requests must not replace local rows",
);
cleanup();
const pages: number[] = [];
let shouldFail = true;
const request = async (
  state: import("@workspace/ui/blocks/data-table").DataTableState,
) => {
  pages.push(state.pagination.pageIndex);
  if (shouldFail) {
    shouldFail = false;
    throw new Error("Temporary failure");
  }
  const start = state.pagination.pageIndex * state.pagination.pageSize;
  return { data: data.slice(start, start + state.pagination.pageSize) };
};
const remote = render(
  <DataTable columns={columns} request={request} rowKey="id" />,
);
await until(() => !!remote.queryByRole("button", { name: "Retry" }));
fireEvent.click(remote.getByRole("button", { name: "Retry" }));
await until(() => remote.container.querySelectorAll("tbody tr").length === 10);
assert.ok(!remote.queryByRole("button", { name: "Last page" }));
assert.ok(remote.getByText("10 rows on this page"));
fireEvent.click(remote.getByRole("button", { name: "Next page" }));
await until(
  () =>
    remote.container
      .querySelector("tbody tr")
      ?.textContent?.includes("Row 11") === true,
);
fireEvent.click(remote.getByRole("button", { name: "Next page" }));
await until(() => remote.container.querySelectorAll("tbody tr").length === 3);
assert.equal(
  (remote.getByRole("button", { name: "Next page" }) as HTMLButtonElement)
    .disabled,
  true,
);
assert.ok(remote.getByText("3 rows on this page"));
assert.deepEqual(pages, [0, 0, 1, 2]);
cleanup();
let headerContext:
  | import("@workspace/ui/blocks/data-table").DataTableRenderContext<
      (typeof data)[number]
    >
  | undefined;
const pendingHeaders: Array<
  (value: { data: typeof data; total: number }) => void
> = [];
const headerRequest = () =>
  new Promise<{ data: typeof data; total: number }>((resolve) =>
    pendingHeaders.push(resolve),
  );
const custom = render(
  <DataTable columns={columns} request={headerRequest} rowKey="id">
    {(context) => {
      headerContext = context;
      return (
        <>
          {context.refresh && (
            <DataTableRefresh
              onRefresh={context.refresh}
              loading={context.loading}
              labels={context.labels}
            />
          )}
          {context.content}
        </>
      );
    }}
  </DataTable>,
);
await until(() => pendingHeaders.length === 1);
assert.equal(
  (custom.getByRole("button", { name: "Refresh" }) as HTMLButtonElement)
    .disabled,
  true,
);
await act(async () => {
  pendingHeaders[0]?.({ data: data.slice(0, 10), total: data.length });
});
assert.equal(
  custom.getAllByRole("button", { name: "Refresh" }).length,
  1,
  "DataTable must render only the refresh control supplied by the header",
);
assert.equal(headerContext?.loading, false);
assert.equal(headerContext?.table.getRowCount(), 23);
assert.deepEqual(headerContext?.defaultColumnOrder, ["name"]);
await act(async () => {
  headerContext?.onTableSizeChange("compact");
});
assert.equal(headerContext?.tableSize, "compact");
assert.ok(
  custom.container.querySelector("tbody td")?.classList.contains("py-1"),
  "Header density setter must update rendered rows",
);
fireEvent.click(custom.getByRole("button", { name: "Refresh" }));
await until(() => pendingHeaders.length === 2);
const refreshButton = custom.getByRole("button", { name: "Refresh" });
assert.equal(refreshButton.getAttribute("aria-busy"), "true");
assert.equal((refreshButton as HTMLButtonElement).disabled, true);
assert.ok(
  custom.container.querySelector('[data-slot="data-table-loading"]'),
  "Custom refresh must share the normal loading overlay",
);
await act(async () => {
  pendingHeaders[1]?.({ data: data.slice(0, 10), total: data.length });
});
assert.equal(headerContext?.loading, false);
cleanup();
let searchTable: TableInstance | undefined;
const searchableColumns = [
  { accessorKey: "name", header: "Name", meta: { search: true } },
];
const searchView = render(
  <DataTable columns={searchableColumns} data={data} rowKey="id">
    {({ content, table, loading, labels }) => {
      searchTable = table;
      return (
        <>
          {content}
          <DataTableSearch
            table={table}
            disabled={loading}
            labels={labels}
            layout="inline"
            className="justify-end"
          />
        </>
      );
    }}
  </DataTable>,
);
const searchInput = searchView.getByRole("textbox", { name: "Search name" });
fireEvent.change(searchInput, { target: { value: "Row 23" } });
assert.equal(searchView.container.querySelectorAll("tbody tr").length, 10);
assert.equal(searchTable?.store.state.columnFilters.length, 0);
fireEvent.keyDown(searchInput, { key: "Enter" });
await until(
  () => searchTable?.getRowModel().rows[0]?.original.name === "Row 23",
);
assert.equal(searchView.container.querySelectorAll("tbody tr").length, 1);
fireEvent.click(searchView.getByRole("button", { name: "Reset" }));
await until(
  () => searchView.container.querySelectorAll("tbody tr").length === 10,
);
assert.equal((searchInput as HTMLInputElement).value, "");
fireEvent.change(searchInput, { target: { value: "Row 22" } });
fireEvent.click(searchView.getByRole("button", { name: "Search" }));
await until(
  () => searchTable?.getRowModel().rows[0]?.original.name === "Row 22",
);
await act(async () => {
  searchTable?.setColumnFilters([{ id: "name", value: "Row 7" }]);
});
assert.equal((searchInput as HTMLInputElement).value, "Row 7");
assert.equal(
  searchView.container.querySelector("tbody td")?.textContent,
  "Row 7",
);
cleanup();
console.log(
  "DataTable initial state, callback stability, request retry and unknown totals passed",
);
await window.happyDOM.abort();
