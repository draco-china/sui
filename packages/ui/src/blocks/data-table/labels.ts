/** English defaults for table controls. Override via Table's labels prop. */
export const defaultTableLabels = {
  sortAscending: "Ascending",
  sortDescending: "Descending",
  clearSorting: "Clear sorting",
  hideColumn: "Hide column",
  columns: "Columns",
  density: "Density",
  dragReorder: "Drag to reorder",
  loadFailed: "We couldn't load the data. Try again",
  noData: "No data",
  pinEnd: "Pin end",
  pinStart: "Pin start",
  refresh: "Refresh",
  retry: "Retry",
  loading: "Loading data…",
  reorderRows: "Reorder rows",
  reset: "Reset",
  search: "Search",
  searchPlaceholder: (column: string) => `Search ${column}`,
  sizeComfortable: "Comfortable",
  sizeCompact: "Compact",
  sizeMedium: "Medium",
  unpinEnd: "Unpin end",
  unpinStart: "Unpin start",
  selectClear: "Clear selection",
  selectSearch: "Search",
  selectNoResults: "No results found",
  bulkAnnouncement: (count: number) =>
    `${count} ${count === 1 ? "row" : "rows"} selected. Bulk actions toolbar is available.`,
  bulkToolbar: (count: number) =>
    `Bulk actions for ${count} selected ${count === 1 ? "row" : "rows"}`,
  bulkClearSelection: "Clear selection (Escape)",
  bulkSelectedRows: (count: number) =>
    `${count === 1 ? "row" : "rows"} selected`,
  paginationFirstPage: "First page",
  paginationLastPage: "Last page",
  paginationMorePages: "More pages",
  paginationNextPage: "Next page",
  paginationPage: (page: number) => `Page ${page}`,
  paginationPreviousPage: "Previous page",
  paginationRows: "Rows",
  paginationLoadedRows: (count: number) => `${count} rows on this page`,
  paginationTotalRows: (total: number) => `Total ${total} rows`,
};

export type TableLabels = typeof defaultTableLabels;
export type TableLabelOverrides = Partial<TableLabels>;

export function resolveTableLabels(
  overrides?: TableLabelOverrides,
): TableLabels {
  return overrides
    ? { ...defaultTableLabels, ...overrides }
    : defaultTableLabels;
}
