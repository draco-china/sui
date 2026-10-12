import type { RowData } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { type TableFilterOption, TableFilterSelect } from "@/components/blocks/data-table/filter-controls";
import { defaultTableLabels, type TableLabels } from "@/components/blocks/data-table/labels";
import type { Column } from "@/components/blocks/data-table/types";

export function DataTableFacetedFilter<TData extends RowData, TValue>({
  column,
  title,
  options,
  labels = defaultTableLabels,
}: {
  column: Column<TData, TValue>;
  title: string;
  options: TableFilterOption[];
  labels?: TableLabels;
}) {
  const value = column.getFilterValue();
  const facets = column.getFacetedUniqueValues();
  return (
    <TableFilterSelect
      multiple
      searchable
      allowClear
      placeholder={title}
      labels={labels}
      value={Array.isArray(value) ? value : undefined}
      onChange={(next) => column.setFilterValue(next)}
      options={options.map((option) => ({
        ...option,
        textValue: option.textValue ?? String(option.label),
        label: (
          <span className="flex w-full items-center justify-between gap-3">
            {option.label}
            {facets.has(option.value) && (
              <Badge variant="secondary">{facets.get(option.value)}</Badge>
            )}
          </span>
        ),
      }))}
    />
  );
}
