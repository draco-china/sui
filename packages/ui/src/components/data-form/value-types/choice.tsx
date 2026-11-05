"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import {
  Select,
  SelectChip,
  SelectChips,
  SelectChipsInput,
  SelectContent,
  SelectEmpty,
  SelectItem,
  SelectList,
  SelectSearch,
  SelectTrigger,
  SelectValue,
  useSelectAnchor,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "cn";
import { Fragment } from "react";
import { isEmptyValue } from "../conditions";
import { ValuePrefix } from "./prefix";
import {
  ariaProps,
  asList,
  controlProps,
  findOption,
  optionText,
} from "./shared";
import type {
  DataFormOption,
  ValueEditProps,
  ValueReadProps,
  ValueTypeMap,
} from "./types";

/** Lists longer than this get a search box, as the patterns ask. */
const SEARCH_THRESHOLD = 10;

function textOf(options: readonly DataFormOption[]) {
  return (value: string) => optionText(options, value);
}

function OptionList({
  options,
  props,
  anchor,
}: {
  options: readonly DataFormOption[];
  props: ValueEditProps;
  /** A multiple select types into its chips, so its list has no search. */
  anchor?: ReturnType<typeof useSelectAnchor>;
}) {
  const { labels } = props;
  const { showSearch } = props.fieldProps;
  const searchable =
    !anchor &&
    (typeof showSearch === "boolean"
      ? showSearch
      : options.length > SEARCH_THRESHOLD);
  return (
    <SelectContent anchor={anchor}>
      {searchable ? <SelectSearch placeholder={labels.search} /> : null}
      <SelectEmpty>
        {props.optionsLoading ? labels.loading : labels.noOptions}
      </SelectEmpty>
      <SelectList>
        {(item: string) => (
          <SelectItem
            key={item}
            value={item}
            disabled={findOption(options, item)?.disabled}
          >
            {optionLabel(options, item)}
          </SelectItem>
        )}
      </SelectList>
    </SelectContent>
  );
}

function SelectEdit(props: ValueEditProps) {
  const { options, labels } = props;
  const { showSearch: _showSearch, ...rest } = props.fieldProps;
  const toText = textOf(options);
  const value = isEmptyValue(props.value) ? null : String(props.value);
  // With its label inside, an empty filter reads "Label: Any".
  const emptyText = props.prefix
    ? labels.any
    : (props.placeholder ?? labels.select);
  return (
    <Select
      items={options.map((option) => option.value)}
      itemToStringLabel={toText}
      value={value}
      disabled={props.disabled}
      name={props.name}
      onValueChange={(next: string | null) => {
        props.onChange(next ?? undefined);
        props.onBlur();
      }}
      {...rest}
    >
      {/* Focus moves into the list while it is open, so the field counts
          as left once a choice is made, not when the list opens. */}
      <SelectTrigger id={props.id} size={props.size} {...ariaProps(props)}>
        <ValuePrefix>{props.prefix}</ValuePrefix>
        <SelectValue placeholder={emptyText}>
          {(selected: string | null) =>
            selected === null ? emptyText : optionLabel(options, selected)
          }
        </SelectValue>
      </SelectTrigger>
      <OptionList options={options} props={props} />
    </Select>
  );
}

function MultiSelectEdit(props: ValueEditProps) {
  const anchor = useSelectAnchor();
  const { options } = props;
  const { showSearch: _showSearch, ...rest } = props.fieldProps;
  const toText = textOf(options);
  const value = asList(props.value).map(String);
  return (
    <Select
      multiple
      items={options.map((option) => option.value)}
      itemToStringLabel={toText}
      value={value}
      disabled={props.disabled}
      name={props.name}
      onValueChange={(next: string[]) =>
        props.onChange(next.length ? next : undefined)
      }
      {...rest}
    >
      <SelectChips
        ref={anchor}
        className={cn("w-full", props.size === "sm" && "min-h-8")}
      >
        <ValuePrefix>{props.prefix}</ValuePrefix>
        <SelectValue>
          {(values: string[]) => (
            <Fragment>
              {values.map((item) => (
                <SelectChip key={item}>{optionLabel(options, item)}</SelectChip>
              ))}
              <SelectChipsInput
                id={props.id}
                {...ariaProps(props)}
                placeholder={values.length ? undefined : props.placeholder}
                onBlur={props.onBlur}
              />
            </Fragment>
          )}
        </SelectValue>
      </SelectChips>
      <OptionList options={options} props={props} anchor={anchor} />
    </Select>
  );
}

function optionLabel(options: readonly DataFormOption[], value: string) {
  return findOption(options, value)?.label ?? value;
}

function RadioEdit(props: ValueEditProps) {
  return (
    <RadioGroup
      {...ariaProps(props)}
      disabled={props.disabled}
      name={props.name}
      className="flex flex-wrap gap-x-4 gap-y-2"
      value={isEmptyValue(props.value) ? null : String(props.value)}
      onValueChange={(next) => props.onChange(next ?? undefined)}
      {...props.fieldProps}
    >
      {props.options.map((option, index) => {
        const id = `${props.id}-${index}`;
        return (
          <div key={option.value} className="flex items-center gap-2">
            <RadioGroupItem
              id={index === 0 ? props.id : id}
              value={option.value}
              disabled={option.disabled}
              onBlur={props.onBlur}
            />
            <Label
              htmlFor={index === 0 ? props.id : id}
              className="font-normal"
            >
              {option.label}
            </Label>
          </div>
        );
      })}
    </RadioGroup>
  );
}

function CheckboxGroupEdit(props: ValueEditProps) {
  const selected = asList(props.value).map(String);
  const toggle = (value: string, checked: boolean) => {
    const next = checked
      ? [...selected, value]
      : selected.filter((item) => item !== value);
    props.onChange(next.length ? next : undefined);
  };
  return (
    <fieldset
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      className="m-0 flex min-w-0 flex-wrap gap-x-4 gap-y-2 border-0 p-0"
    >
      {props.options.map((option, index) => {
        const id = index === 0 ? props.id : `${props.id}-${index}`;
        return (
          <div key={option.value} className="flex items-center gap-2">
            <Checkbox
              id={id}
              name={props.name}
              value={option.value}
              disabled={props.disabled || option.disabled}
              aria-invalid={props.invalid || undefined}
              checked={selected.includes(option.value)}
              onBlur={props.onBlur}
              onCheckedChange={(checked) => toggle(option.value, checked)}
            />
            <Label htmlFor={id} className="font-normal">
              {option.label}
            </Label>
          </div>
        );
      })}
    </fieldset>
  );
}

function readOptions({ value, options }: ValueReadProps) {
  const items = asList(value);
  if (items.length === 0) return "";
  return (
    <span className="inline-flex flex-wrap gap-1">
      {items.map((item) => {
        const option = findOption(options, item);
        if (!option?.color)
          return <span key={String(item)}>{optionText(options, item)}</span>;
        return (
          <Badge key={String(item)} variant={option.color}>
            {option.label}
          </Badge>
        );
      })}
    </span>
  );
}

function textOptions({ value, options }: ValueReadProps) {
  return asList(value)
    .map((item) => optionText(options, item))
    .join(", ");
}

function booleanText({ value, labels }: ValueReadProps) {
  if (isEmptyValue(value)) return "";
  // "false" and "0" come from URLs and selects; any other value counts.
  if (value === "false" || value === "0") return labels.no;
  return value ? labels.yes : labels.no;
}

/** Choices read as their option labels, with badges where colored. */
const choices = { read: readOptions, text: textOptions };
const select = { ...choices, edit: SelectEdit, prefix: true };

export const choiceValueTypes: ValueTypeMap = {
  select,
  enum: select,
  multiSelect: { ...select, edit: MultiSelectEdit },
  radio: { ...choices, edit: RadioEdit, labelTarget: "group" },
  checkboxGroup: { ...choices, edit: CheckboxGroupEdit, labelTarget: "group" },
  checkbox: {
    edit: (props) => (
      <Checkbox
        {...controlProps(props)}
        {...props.fieldProps}
        checked={props.value === true}
        onBlur={props.onBlur}
        onCheckedChange={(checked) => props.onChange(checked)}
      />
    ),
    text: booleanText,
    inline: "start",
  },
  switch: {
    edit: (props) => (
      <Switch
        {...controlProps(props)}
        {...props.fieldProps}
        checked={props.value === true}
        onBlur={props.onBlur}
        onCheckedChange={(checked) => props.onChange(checked)}
      />
    ),
    text: booleanText,
    inline: "end",
  },
  boolean: {
    edit: (props) => (
      <SelectEdit
        {...props}
        value={isEmptyValue(props.value) ? undefined : String(props.value)}
        onChange={(next) =>
          props.onChange(next === undefined ? undefined : next === "true")
        }
        options={[
          { value: "true", label: props.labels.yes },
          { value: "false", label: props.labels.no },
        ]}
      />
    ),
    text: booleanText,
    prefix: true,
  },
};
