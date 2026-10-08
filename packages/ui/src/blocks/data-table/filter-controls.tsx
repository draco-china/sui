"use client";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@workspace/ui/components/combobox";
import { cn } from "cn";
import type { ReactNode } from "react";
import { defaultTableLabels, type TableLabels } from "./labels";

export { Checkbox as CheckboxControl } from "@workspace/ui/components/checkbox";

export interface TableFilterOption {
  value: string;
  label: ReactNode;
  textValue?: string;
  disabled?: boolean;
}

export interface TableFilterSelectProps {
  options: TableFilterOption[];
  placeholder: string;
  value?: string | string[];
  onChange: (value: string | string[] | undefined) => void;
  multiple?: boolean;
  searchable?: boolean;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
  labels?: TableLabels;
}

export function TableFilterSelect({
  options,
  placeholder,
  value,
  onChange,
  multiple = false,
  searchable = false,
  allowClear = false,
  disabled = false,
  className,
  labels = defaultTableLabels,
}: TableFilterSelectProps) {
  const anchor = useComboboxAnchor();
  let filterValues: string[] = [];
  if (Array.isArray(value)) filterValues = value;
  else if (value) filterValues = [value];
  const values = new Set(filterValues);
  const selected = options.filter((option) => values.has(option.value));
  return (
    <div className={cn("w-full md:w-45", className)}>
      <Combobox<TableFilterOption, boolean>
        items={options}
        multiple={multiple}
        value={multiple ? selected : (selected[0] ?? null)}
        disabled={disabled}
        itemToStringLabel={(option) => option.textValue ?? String(option.label)}
        itemToStringValue={(option) => option.value}
        onValueChange={(next) => {
          if (Array.isArray(next))
            onChange(
              next.length ? next.map((option) => option.value) : undefined,
            );
          else onChange(next?.value);
        }}
      >
        {multiple ? (
          <ComboboxChips ref={anchor} className="w-full">
            <ComboboxValue>
              {(items: TableFilterOption[]) => (
                <>
                  {items.map((option) => (
                    <ComboboxChip key={option.value} showRemove={allowClear}>
                      {option.textValue ?? option.label}
                    </ComboboxChip>
                  ))}
                  <ComboboxChipsInput
                    placeholder={items.length ? undefined : placeholder}
                    aria-label={placeholder}
                    disabled={disabled}
                    readOnly={!searchable}
                  />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
        ) : (
          <ComboboxInput
            placeholder={placeholder}
            aria-label={placeholder}
            disabled={disabled}
            readOnly={!searchable}
            showClear={allowClear}
            className="w-full"
          />
        )}
        <ComboboxContent anchor={multiple ? anchor : undefined}>
          <ComboboxEmpty>{labels.selectNoResults}</ComboboxEmpty>
          <ComboboxList>
            {(option: TableFilterOption) => (
              <ComboboxItem
                key={option.value}
                value={option}
                disabled={option.disabled}
              >
                {option.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
