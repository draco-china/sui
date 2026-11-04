import type { DataTablePlugin } from "@/components/ui/data-table/types";
import { advancedFilter } from "@/components/ui/data-table/plugins/advanced-filter";
import { columnSettings } from "@/components/ui/data-table/plugins/column-settings";
import { type QueryFormOptions, queryForm } from "@/components/ui/data-table/plugins/query-form";
import { density, exportCsv, reload } from "@/components/ui/data-table/plugins/toolbar-buttons";
import { urlSync } from "@/components/ui/data-table/plugins/url-sync";

export { type AdvancedFilterOptions, advancedFilter } from "@/components/ui/data-table/plugins/advanced-filter";
export { type BulkAction, bulkActions } from "@/components/ui/data-table/plugins/bulk-actions";
export { columnSettings } from "@/components/ui/data-table/plugins/column-settings";
export { type DragSortOptions, dragSort } from "@/components/ui/data-table/plugins/drag-sort";
export { type ExpandableOptions, expandable } from "@/components/ui/data-table/plugins/expandable";
export { type PersistOptions, persist } from "@/components/ui/data-table/plugins/persist";
export { type QueryFormOptions, queryForm } from "@/components/ui/data-table/plugins/query-form";
export {
  density,
  type ExportCsvOptions,
  exportCsv,
  reload,
} from "@/components/ui/data-table/plugins/toolbar-buttons";
export {
  readUrlState,
  type UrlSyncOptions,
  urlSync,
  writeUrlState,
} from "@/components/ui/data-table/plugins/url-sync";
export { type ViewsOptions, views } from "@/components/ui/data-table/plugins/views";
export { type VirtualOptions, virtual } from "@/components/ui/data-table/plugins/virtual";

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
