"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectList,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import { Filter, Plus, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { optionText } from "../columns";
import { useDataTableContext } from "../context";
import { DataTableDateField, DataTableDateRangeField } from "../date-field";
import { isEmptyValue } from "../engine";
import { menuLabel } from "../menu";
import type {
  DataTableInstance,
  DataTablePlugin,
  DataTableValueType,
  FilterGroup,
  FilterOperator,
  FilterRule,
  NormalizedColumn,
} from "../types";

export interface AdvancedFilterOptions {
  /** Saves named views in local storage under this key. */
  readonly storageKey?: string;
}

const operatorsByType: Record<DataTableValueType, readonly FilterOperator[]> = {
  text: ["contains", "eq", "neq", "startsWith", "isEmpty"],
  number: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "isEmpty"],
  money: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "isEmpty"],
  percent: ["eq", "neq", "gt", "gte", "lt", "lte", "between", "isEmpty"],
  date: ["between", "gt", "lt", "isEmpty"],
  datetime: ["between", "gt", "lt", "isEmpty"],
  enum: ["in", "notIn", "eq", "neq", "isEmpty"],
  boolean: ["eq"],
};

const inputTypes: Partial<Record<DataTableValueType, string>> = {
  number: "number",
  money: "number",
  percent: "number",
};

type SavedView = { readonly name: string; readonly group: FilterGroup };

function readViews(key?: string): SavedView[] {
  if (!key || typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as SavedView[];
  } catch {
    return [];
  }
}

function writeViews(key: string, views: readonly SavedView[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(views));
  } catch {
    // Storage may be unavailable; views then last for this page only.
  }
}

function SimpleSelect<T extends string>({
  value,
  items,
  onChange,
  label,
  className,
}: {
  value: T;
  items: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next);
      }}
    >
      <SelectTrigger size="sm" aria-label={label} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectList>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectList>
      </SelectContent>
    </Select>
  );
}

function RuleValue({
  rule,
  column,
  onChange,
}: {
  rule: FilterRule;
  column: NormalizedColumn<unknown>;
  onChange: (value: unknown) => void;
}) {
  const table = useDataTableContext();
  const { labels } = table;
  const type = inputTypes[column.valueType] ?? "text";
  if (rule.operator === "isEmpty") return <div className="flex-1" />;
  if (column.valueType === "boolean")
    return (
      <SimpleSelect
        label={column.titleText}
        className="flex-1"
        value={rule.value === "false" ? "false" : "true"}
        items={[
          { value: "true", label: labels.yes },
          { value: "false", label: labels.no },
        ]}
        onChange={onChange}
      />
    );
  if (column.valueType === "date" || column.valueType === "datetime") {
    const Field =
      rule.operator === "between"
        ? DataTableDateRangeField
        : DataTableDateField;
    return (
      <Field
        time={column.valueType === "datetime"}
        className="h-8 flex-1"
        label={column.titleText}
        value={rule.value}
        onChange={onChange}
      />
    );
  }
  if (rule.operator === "between") {
    const [start, end] = Array.isArray(rule.value) ? rule.value : [];
    return (
      <div className="flex flex-1 items-center gap-1">
        <Input
          type={type}
          className="h-8"
          aria-label={labels.rangeStart}
          value={start ?? ""}
          onChange={(event) => onChange([event.target.value, end])}
        />
        <Input
          type={type}
          className="h-8"
          aria-label={labels.rangeEnd}
          value={end ?? ""}
          onChange={(event) => onChange([start, event.target.value])}
        />
      </div>
    );
  }
  const options = column.valueEnum;
  if (options && (rule.operator === "in" || rule.operator === "notIn")) {
    const values = Array.isArray(rule.value) ? rule.value.map(String) : [];
    return (
      <div className="flex flex-1 flex-wrap gap-1">
        {options.map((option) => {
          const active = values.includes(option.value);
          return (
            <Badge
              key={option.value}
              render={<button type="button" />}
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              onClick={() =>
                onChange(
                  active
                    ? values.filter((value) => value !== option.value)
                    : [...values, option.value],
                )
              }
            >
              {optionText(option)}
            </Badge>
          );
        })}
      </div>
    );
  }
  if (options)
    return (
      <SimpleSelect
        label={column.titleText}
        className="flex-1"
        value={String(rule.value ?? options[0]?.value ?? "")}
        items={options.map((option) => ({
          value: option.value,
          label: optionText(option),
        }))}
        onChange={onChange}
      />
    );
  return (
    <Input
      type={type}
      className="h-8 flex-1"
      aria-label={column.titleText}
      value={rule.value === undefined ? "" : String(rule.value)}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/** The value RuleValue shows before a pick, so a fresh rule applies what it shows. */
function initialValue(
  column: NormalizedColumn<unknown>,
  operator: FilterOperator,
) {
  if (column.valueType === "boolean") return "true";
  const list = operator === "in" || operator === "notIn";
  if (column.valueEnum && !list && operator !== "isEmpty")
    return column.valueEnum[0]?.value;
  return undefined;
}

function newRule(column: NormalizedColumn<unknown>): FilterRule {
  const operator = operatorsByType[column.valueType][0];
  return {
    id: Math.random().toString(36).slice(2),
    field: column.id,
    operator,
    value: initialValue(column, operator),
  };
}

function filterableColumns(table: DataTableInstance<unknown>) {
  return table.columns.filter((column) => !column.display);
}

function AdvancedFilter({ storageKey }: { storageKey?: string }) {
  const table = useDataTableContext();
  const { labels } = table;
  const columns = filterableColumns(table);
  const applied = table.state.query.advanced;
  const [draft, setDraft] = useState<FilterGroup>(
    applied ?? { logic: "and", rules: [] },
  );
  const syncedFrom = useRef(applied);
  if (syncedFrom.current !== applied) {
    syncedFrom.current = applied;
    setDraft(applied ?? { logic: "and", rules: [] });
  }
  const [views, setViews] = useState(() => readViews(storageKey));
  const [viewName, setViewName] = useState("");
  const count = applied?.rules.length ?? 0;
  const byId = new Map(columns.map((column) => [column.id, column]));

  const updateRule = (id: string, update: Partial<FilterRule>) =>
    setDraft((current) => ({
      ...current,
      rules: current.rules.map((rule) =>
        rule.id === id ? { ...rule, ...update } : rule,
      ),
    }));
  // A condition left without a value filters nothing, so it is not applied.
  const apply = (group: FilterGroup) => {
    const rules = group.rules.filter(
      (rule) => rule.operator === "isEmpty" || !isEmptyValue(rule.value),
    );
    table.setAdvanced(rules.length ? { ...group, rules } : undefined);
  };
  const saveViews = (next: SavedView[]) => {
    setViews(next);
    if (storageKey) writeViews(storageKey, next);
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="h-8 border-dashed" />
        }
      >
        <Filter />
        {labels.advancedFilter}
        {count > 0 && <Badge variant="secondary">{count}</Badge>}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(36rem,calc(100vw-2rem))] gap-1 p-1.5"
      >
        <div className={menuLabel}>{labels.advancedFilter}</div>
        <div className="space-y-3 px-1.5 pb-1.5">
          <SimpleSelect
            label={labels.advancedFilter}
            className="w-44"
            value={draft.logic}
            items={[
              { value: "and", label: labels.matchAll },
              { value: "or", label: labels.matchAny },
            ]}
            onChange={(logic) => setDraft((current) => ({ ...current, logic }))}
          />
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {draft.rules.map((rule) => {
                const column = byId.get(rule.field);
                if (!column) return null;
                return (
                  <motion.li
                    key={rule.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap items-start gap-1.5 sm:flex-nowrap"
                  >
                    <SimpleSelect
                      label={column.titleText}
                      className="w-32"
                      value={rule.field}
                      items={columns.map((entry) => ({
                        value: entry.id,
                        label: entry.titleText,
                      }))}
                      onChange={(field) => {
                        const next = byId.get(field);
                        if (next)
                          updateRule(rule.id, {
                            ...newRule(next),
                            id: rule.id,
                          });
                      }}
                    />
                    <SimpleSelect
                      label={column.titleText}
                      className="w-32"
                      value={rule.operator}
                      items={operatorsByType[column.valueType].map(
                        (operator) => ({
                          value: operator,
                          label: labels.operators[operator],
                        }),
                      )}
                      onChange={(operator) =>
                        updateRule(rule.id, {
                          operator,
                          value: initialValue(column, operator),
                        })
                      }
                    />
                    <RuleValue
                      rule={rule}
                      column={column}
                      onChange={(value) => updateRule(rule.id, { value })}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={labels.removeRule}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          rules: current.rules.filter(
                            (entry) => entry.id !== rule.id,
                          ),
                        }))
                      }
                    >
                      <X />
                    </Button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={columns.length === 0}
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  rules: [...current.rules, newRule(columns[0])],
                }))
              }
            >
              <Plus />
              {labels.addRule}
            </Button>
            <div className="ms-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft({ logic: "and", rules: [] });
                  apply({ logic: "and", rules: [] });
                }}
              >
                {labels.reset}
              </Button>
              <Button size="sm" onClick={() => apply(draft)}>
                {labels.applyFilter}
              </Button>
            </div>
          </div>
          {storageKey && (
            <>
              <Separator />
              <div className="space-y-2">
                {views.length > 0 && (
                  <>
                    <div className="font-medium text-muted-foreground text-xs">
                      {labels.savedViews}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {views.map((view) => (
                        <span
                          key={view.name}
                          className="inline-flex items-center rounded-full border ps-1"
                        >
                          <Button
                            variant="ghost"
                            size="xs"
                            className="rounded-full"
                            onClick={() => {
                              setDraft(view.group);
                              apply(view.group);
                            }}
                          >
                            {view.name}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="rounded-full"
                            aria-label={`${labels.deleteView} ${view.name}`}
                            onClick={() =>
                              saveViews(
                                views.filter(
                                  (entry) => entry.name !== view.name,
                                ),
                              )
                            }
                          >
                            <Trash2 />
                          </Button>
                        </span>
                      ))}
                    </div>
                  </>
                )}
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const name = viewName.trim();
                    if (!name || draft.rules.length === 0) return;
                    saveViews([
                      ...views.filter((view) => view.name !== name),
                      { name, group: draft },
                    ]);
                    setViewName("");
                  }}
                >
                  <Input
                    className="h-8"
                    aria-label={labels.viewName}
                    placeholder={labels.viewName}
                    value={viewName}
                    onChange={(event) => setViewName(event.target.value)}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={!viewName.trim() || draft.rules.length === 0}
                  >
                    {labels.saveView}
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Field, operator and value conditions grouped with AND or OR, with
 * optional saved views. Operators follow each column's value type.
 */
export function advancedFilter<TData>(
  options: AdvancedFilterOptions = {},
): DataTablePlugin<TData> {
  return {
    name: "advancedFilter",
    slots: {
      toolbarStart: () => <AdvancedFilter storageKey={options.storageKey} />,
    },
  };
}
