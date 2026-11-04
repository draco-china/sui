import type { DataTablePlugin } from "../types";
import { advancedFilter } from "./advanced-filter";
import { columnSettings } from "./column-settings";
import { type QueryFormOptions, queryForm } from "./query-form";
import { density, exportCsv, reload } from "./toolbar-buttons";
import { urlSync } from "./url-sync";

export { type AdvancedFilterOptions, advancedFilter } from "./advanced-filter";
export { type BulkAction, bulkActions } from "./bulk-actions";
export { columnSettings } from "./column-settings";
export { type DragSortOptions, dragSort } from "./drag-sort";
export { type ExpandableOptions, expandable } from "./expandable";
export { type PersistOptions, persist } from "./persist";
export { type QueryFormOptions, queryForm } from "./query-form";
export {
  density,
  type ExportCsvOptions,
  exportCsv,
  reload,
} from "./toolbar-buttons";
export {
  readUrlState,
  type UrlSyncOptions,
  urlSync,
  writeUrlState,
} from "./url-sync";
export { type ViewsOptions, views } from "./views";
export { type VirtualOptions, virtual } from "./virtual";

export interface ProPluginsOptions {
  readonly queryForm?: QueryFormOptions | false;
  readonly urlSync?: boolean;
  readonly advancedFilter?: boolean;
  readonly exportCsv?: boolean;
}

/**
 * The ProTable set: query form, reload, density, column settings, CSV
 * export, advanced filter and URL sync. Spread more plugins after it.
 */
export function proPlugins<TData>(
  options: ProPluginsOptions = {},
): DataTablePlugin<TData>[] {
  const plugins: DataTablePlugin<TData>[] = [];
  if (options.queryForm !== false)
    plugins.push(queryForm(options.queryForm || {}));
  if (options.advancedFilter !== false) plugins.push(advancedFilter());
  plugins.push(reload(), density(), columnSettings());
  if (options.exportCsv !== false) plugins.push(exportCsv());
  if (options.urlSync !== false) plugins.push(urlSync());
  return plugins;
}
