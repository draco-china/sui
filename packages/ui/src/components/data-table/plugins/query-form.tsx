"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { cn } from "cn";
import { ChevronDown, ChevronsUpDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type FormEvent, type ReactNode, useId, useRef, useState } from "react";
import { useDataTableContext } from "../context";
import { menuPanel } from "../menu";
import { DataTableOptionList } from "../toolbar";
import type {
  DataTableInstance,
  DataTableOption,
  DataTablePlugin,
  DataTableSearchType,
  NormalizedColumn,
} from "../types";

export interface QueryFormOptions {
  /** Start with only the first fields visible. */
  readonly collapsed?: boolean;
  /** Fields shown while collapsed; defaults to 3. */
  readonly collapsedCount?: number;
  /** Grid columns on wide screens; defaults to 4. */
  readonly columns?: 2 | 3 | 4;
}

interface FieldProps {
  readonly id: string;
  readonly column: NormalizedColumn<unknown>;
  readonly value: unknown;
  readonly values: Record<string, unknown>;
  readonly onChange: (value: unknown) => void;
}

function resolveOptions(
  column: NormalizedColumn<unknown>,
  values: Record<string, unknown>,
): readonly DataTableOption[] {
  const options = column.search?.options;
  if (typeof options === "function") return options(values);
  return options ?? [];
}

function asPair(value: unknown): [string, string] {
  const [start, end] = Array.isArray(value) ? value : [];
  return [
    start === undefined ? "" : String(start),
    end === undefined ? "" : String(end),
  ];
}

function textInputType(type: DataTableSearchType) {
  if (type === "number" || type === "numberRange") return "number";
  if (type === "date" || type === "dateRange") return "date";
  if (type === "datetimeRange") return "datetime-local";
  return "text";
}

function RangeField({ id, column, value, onChange }: FieldProps) {
  const table = useDataTableContext();
  const [start, end] = asPair(value);
  const type = textInputType(column.search?.type ?? "text");
  const update = (index: 0 | 1, next: string) => {
    const pair: [string | undefined, string | undefined] = [start, end];
    pair[index] = next === "" ? undefined : next;
    onChange(pair.every((item) => item === undefined) ? undefined : pair);
  };
  return (
    <div className="flex items-center gap-1.5">
      <Input
        id={id}
        type={type}
        value={start}
        aria-label={`${column.titleText} ${table.labels.rangeStart}`}
        placeholder={table.labels.rangeStart}
        onChange={(event) => update(0, event.target.value)}
      />
      <span className="text-muted-foreground">~</span>
      <Input
        type={type}
        value={end}
        aria-label={`${column.titleText} ${table.labels.rangeEnd}`}
        placeholder={table.labels.rangeEnd}
        onChange={(event) => update(1, event.target.value)}
      />
    </div>
  );
}

function SelectField({
  id,
  options,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  options: readonly DataTableOption[];
  value: unknown;
  onChange: (value: unknown) => void;
  placeholder: string;
}) {
  const items = [{ value: null, label: placeholder }, ...options];
  return (
    <Select
      items={items}
      value={value === undefined ? null : String(value)}
      onValueChange={(next) => onChange(next ?? undefined)}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={String(item.value)} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function summarize(
  labels: readonly ReactNode[],
  text: DataTableInstance<unknown>["labels"],
): ReactNode {
  if (labels.length === 0) return text.any;
  if (labels.length > 2) return text.selected(labels.length);
  return labels.flatMap((label, index) =>
    index > 0 ? [", ", label] : [label],
  );
}

function MultiSelectField({ id, column, value, values, onChange }: FieldProps) {
  const table = useDataTableContext();
  const options = resolveOptions(column, values);
  const selected = Array.isArray(value) ? value.map(String) : [];
  const labels = options
    .filter((option) => selected.includes(option.value))
    .map((option) => option.label);
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            className="w-full justify-between font-normal"
          />
        }
      >
        <span
          className={cn(
            "truncate",
            labels.length === 0 && "text-muted-foreground",
          )}
        >
          {summarize(labels, table.labels)}
        </span>
        <ChevronsUpDown className="opacity-50" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn("w-(--anchor-width) min-w-56", menuPanel)}
      >
        <DataTableOptionList
          options={options}
          value={selected}
          onChange={(next) => onChange(next.length ? next : undefined)}
        />
      </PopoverContent>
    </Popover>
  );
}

const fieldRenderers: Partial<
  Record<DataTableSearchType, (props: FieldProps) => ReactNode>
> = {
  numberRange: (props) => <RangeField {...props} />,
  dateRange: (props) => <RangeField {...props} />,
  datetimeRange: (props) => <RangeField {...props} />,
  multiSelect: (props) => <MultiSelectField {...props} />,
  select: (props) => <SelectFieldFor {...props} />,
  boolean: (props) => <BooleanField {...props} />,
  custom: ({ column, value, values, onChange }) =>
    column.search?.render?.({ value, onChange, values }),
};

function SelectFieldFor({ id, column, value, values, onChange }: FieldProps) {
  const table = useDataTableContext();
  return (
    <SelectField
      id={id}
      options={resolveOptions(column, values)}
      value={value}
      onChange={onChange}
      placeholder={column.search?.placeholder ?? table.labels.any}
    />
  );
}

function BooleanField({ id, column, value, onChange }: FieldProps) {
  const table = useDataTableContext();
  return (
    <SelectField
      id={id}
      options={[
        { value: "true", label: table.labels.yes },
        { value: "false", label: table.labels.no },
      ]}
      value={value}
      onChange={onChange}
      placeholder={column.search?.placeholder ?? table.labels.any}
    />
  );
}

function QueryField(props: FieldProps) {
  const { id, column, value, onChange } = props;
  const type = column.search?.type ?? "text";
  const custom = fieldRenderers[type];
  if (custom) return custom(props);
  return (
    <Input
      id={id}
      type={textInputType(type)}
      value={value === undefined ? "" : String(value)}
      placeholder={column.search?.placeholder}
      onChange={(event) =>
        onChange(event.target.value === "" ? undefined : event.target.value)
      }
    />
  );
}

// Container queries: the form often sits in a narrower panel than the page.
const gridColumns = {
  2: "@lg/query:grid-cols-2",
  3: "@lg/query:grid-cols-2 @3xl/query:grid-cols-3",
  4: "@lg/query:grid-cols-2 @3xl/query:grid-cols-3 @5xl/query:grid-cols-4",
};

function searchColumns(table: DataTableInstance<unknown>) {
  return table.columns
    .filter((column) => column.search)
    .map((column, index) => ({ column, index }))
    .sort(
      (a, b) =>
        (a.column.search?.order ?? a.index) -
        (b.column.search?.order ?? b.index),
    )
    .map((entry) => entry.column);
}

function QueryForm({ options }: { options: QueryFormOptions }) {
  const table = useDataTableContext();
  const reduced = useReducedMotion();
  const mobile = useIsMobile();
  const formId = useId();
  const fields = searchColumns(table);
  const applied = table.state.query.search;
  const [draft, setDraft] = useState<Record<string, unknown>>(applied);
  const syncedFrom = useRef(applied);
  if (syncedFrom.current !== applied) {
    syncedFrom.current = applied;
    setDraft(applied);
  }
  const [collapsed, setCollapsed] = useState(options.collapsed ?? true);
  // Phones keep one field so the rows stay in view.
  const collapsedCount = mobile ? 1 : (options.collapsedCount ?? 3);
  const collapsible = fields.length > collapsedCount;
  const shown =
    collapsible && collapsed ? fields.slice(0, collapsedCount) : fields;

  function change(id: string, value: unknown) {
    setDraft((current) => {
      const next = { ...current, [id]: value };
      for (const field of fields)
        if (field.search?.dependencies?.includes(id))
          next[field.id] = undefined;
      return next;
    });
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    table.setSearch(draft);
  }
  function reset() {
    const initial: Record<string, unknown> = {};
    for (const field of fields)
      if (field.search?.initialValue !== undefined)
        initial[field.id] = field.search.initialValue;
    setDraft(initial);
    table.setSearch(initial);
  }
  if (fields.length === 0) return null;
  return (
    <div className="@container/query">
      <form
        data-slot="data-table-query-form"
        onSubmit={submit}
        onReset={(event) => {
          event.preventDefault();
          reset();
        }}
        className={cn(
          "grid grid-cols-1 items-end gap-x-4 gap-y-3 rounded-xl border bg-card p-4",
          gridColumns[options.columns ?? 4],
        )}
      >
        <AnimatePresence initial={false}>
          {shown.map((column) => {
            const id = `${formId}-${column.id}`;
            return (
              <motion.div
                key={column.id}
                initial={reduced ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0 }}
                className="grid min-w-0 gap-1.5"
                style={{
                  gridColumn: column.search?.colSpan
                    ? `span ${column.search.colSpan}`
                    : undefined,
                }}
              >
                <Label htmlFor={id} className="text-muted-foreground text-xs">
                  {column.search?.label ?? column.title}
                </Label>
                <QueryField
                  id={id}
                  column={column}
                  value={draft[column.id]}
                  values={draft}
                  onChange={(value) => change(column.id, value)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div className="@lg/query:col-end-[-1] flex flex-wrap items-center justify-end gap-2">
          <Button type="reset" variant="outline">
            {table.labels.reset}
          </Button>
          <Button type="submit">{table.labels.query}</Button>
          {collapsible && (
            <Button
              type="button"
              variant="ghost"
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((current) => !current)}
            >
              {collapsed ? table.labels.expand : table.labels.collapse}
              <ChevronDown
                className={cn(
                  "transition-transform",
                  !collapsed && "rotate-180",
                )}
              />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

/**
 * A collapsible multi-field query form above the toolbar, built from columns
 * with `search`. Conditions apply together when the form is submitted.
 */
export function queryForm<TData>(
  options: QueryFormOptions = {},
): DataTablePlugin<TData> {
  return {
    name: "queryForm",
    slots: { header: () => <QueryForm options={options} /> },
  };
}
