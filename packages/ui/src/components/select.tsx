"use client";

import { Combobox as SelectPrimitive } from "@base-ui/react/combobox";
import { Button } from "@workspace/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { cn } from "cn";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import * as React from "react";
import { withGlass } from "../lib/glass/with-glass";

// SelectInput renders as the trigger; inside SelectContent it acts as a
// search box (SelectSearch).
const SelectContentContext = React.createContext(false);

// Inputs outside the popup register here, so SelectContent knows whether it
// must add a hidden input: the popup needs one for keyboard support.
const SelectOuterInputContext = React.createContext<{
  count: number;
  register: () => () => void;
  hasItems: boolean;
}>({ count: 0, register: () => () => {}, hasItems: false });

function useRegisterOuterInput(enabled: boolean) {
  const { register } = React.useContext(SelectOuterInputContext);
  React.useLayoutEffect(
    () => (enabled ? register() : undefined),
    [enabled, register],
  );
}

function SelectRoot<Value, Multiple extends boolean | undefined, Item>(
  props: SelectPrimitive.Root.Props<Value, Multiple, Item>,
) {
  const [count, setCount] = React.useState(0);
  const register = React.useCallback(() => {
    setCount((current) => current + 1);
    return () => setCount((current) => current - 1);
  }, []);
  const hasItems = props.items != null;
  const context = React.useMemo(
    () => ({ count, register, hasItems }),
    [count, register, hasItems],
  );

  return (
    <SelectOuterInputContext.Provider value={context}>
      <SelectPrimitive.Root {...props} />
    </SelectOuterInputContext.Provider>
  );
}

const Select = SelectRoot as <
  Value,
  Multiple extends boolean | undefined = false,
  Item = Value,
>(
  props: SelectPrimitive.Root.Props<Value, Multiple, Item>,
) => React.JSX.Element;

function hasSelectInput(children: React.ReactNode) {
  return React.Children.toArray(children).some(
    (child) =>
      React.isValidElement(child) &&
      (child.type === SelectInput || child.type === SelectSearch),
  );
}

function SelectValue({
  className,
  ...props
}: SelectPrimitive.Value.Props & { className?: string }) {
  return (
    <span data-slot="select-value" className={cn("contents", className)}>
      <SelectPrimitive.Value {...props} />
    </span>
  );
}

function SelectTriggerImplementation({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex w-full items-center justify-between gap-1.5 whitespace-nowrap rounded-3xl border border-transparent bg-input/50 px-3 py-2 text-sm outline-none transition-[color,box-shadow,background-color] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-9 data-[size=sm]:h-8 data-placeholder:text-muted-foreground dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      <span className="line-clamp-1 flex flex-1 items-center gap-1.5 text-start">
        {children}
      </span>
      <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
    </SelectPrimitive.Trigger>
  );
}

function SelectClear(props: SelectPrimitive.Clear.Props) {
  return (
    <SelectPrimitive.Clear
      data-slot="select-clear"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      {...props}
    >
      <XIcon className="pointer-events-none" />
    </SelectPrimitive.Clear>
  );
}

function SelectInput({
  className,
  children,
  disabled = false,
  showTrigger,
  showClear = false,
  ...props
}: SelectPrimitive.Input.Props & {
  showTrigger?: boolean;
  showClear?: boolean;
}) {
  const inContent = React.useContext(SelectContentContext);
  const withTrigger = showTrigger ?? !inContent;
  useRegisterOuterInput(!inContent);

  return (
    <InputGroup className={cn(typeof className === "string" && className)}>
      <SelectPrimitive.Input
        data-slot="select-input"
        className={typeof className === "function" ? className : undefined}
        render={<InputGroupInput disabled={disabled} />}
        {...props}
      />
      {(withTrigger || showClear) && (
        <InputGroupAddon align="inline-end">
          {withTrigger && (
            <InputGroupButton
              size="icon-xs"
              variant="ghost"
              render={
                <SelectPrimitive.Trigger>
                  <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
                </SelectPrimitive.Trigger>
              }
              data-slot="input-group-button"
              className="group-has-data-[slot=select-clear]/input-group:hidden data-pressed:bg-transparent"
              disabled={disabled}
            />
          )}
          {showClear && <SelectClear disabled={disabled} />}
        </InputGroupAddon>
      )}
      {children}
    </InputGroup>
  );
}

/** A visible search box for SelectContent. */
function SelectSearch({
  placeholder = "Search…",
  ...props
}: Omit<React.ComponentProps<typeof SelectInput>, "showTrigger">) {
  return (
    <SelectInput
      showTrigger={false}
      placeholder={placeholder}
      aria-label={props["aria-label"] ?? placeholder}
      {...props}
    />
  );
}

function SelectContentImplementation({
  className,
  children,
  searchLabel = "Search",
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  > & {
    searchLabel?: string;
  }) {
  const { count } = React.useContext(SelectOuterInputContext);
  const addSearch = count === 0 && !hasSelectInput(children);

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <SelectContentContext.Provider value>
          <SelectPrimitive.Popup
            data-slot="select-content"
            data-chips={!!anchor}
            className={cn(
              "group/select-content data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-start-2 data-[side=inline-start]:slide-in-from-end-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 relative max-h-(--available-height) w-max min-w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-[calc(var(--radius-2xl)+--spacing(1.5))] bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 data-closed:animate-out data-open:animate-in *:data-[slot=input-group]:m-1.5 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:w-auto *:data-[slot=input-group]:rounded-2xl *:data-[slot=input-group]:border-input/30 *:data-[slot=input-group]:bg-input/50 *:data-[slot=input-group]:shadow-none dark:ring-foreground/10",
              className,
            )}
            {...props}
          >
            {addSearch && (
              <div className="sr-only">
                <SelectInput aria-label={searchLabel} readOnly />
              </div>
            )}
            {children}
          </SelectPrimitive.Popup>
        </SelectContentContext.Provider>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function itemValue(item: unknown) {
  if (item !== null && typeof item === "object" && "value" in item)
    return item.value;
  return item;
}

function flattenItems(items: readonly unknown[]): unknown[] {
  return items.flatMap((item) => {
    if (item !== null && typeof item === "object" && "items" in item)
      return flattenItems(item.items as readonly unknown[]);
    return [itemValue(item)];
  });
}

// Static children are not filtered by the primitive, so drop the items the
// search does not match ourselves; groups left without items go too.
function filterStatic(
  children: React.ReactNode,
  visible: Set<unknown>,
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (
      !React.isValidElement<{ value?: unknown; children?: React.ReactNode }>(
        child,
      )
    )
      return child;
    if (child.type === SelectItem)
      return visible.has(itemValue(child.props.value)) ? child : null;
    if (child.type !== SelectGroup) return child;
    const groupChildren = filterStatic(child.props.children, visible);
    const hasItem = React.Children.toArray(groupChildren).some(
      (node) => React.isValidElement(node) && node.type === SelectItem,
    );
    return hasItem ? React.cloneElement(child, undefined, groupChildren) : null;
  });
}

function SelectList({
  className,
  children,
  ...props
}: SelectPrimitive.List.Props) {
  const { hasItems } = React.useContext(SelectOuterInputContext);
  const filteredItems = SelectPrimitive.useFilteredItems();
  const filterChildren = hasItems && typeof children !== "function";
  const visible = React.useMemo(
    () => new Set(flattenItems(filteredItems as readonly unknown[])),
    [filteredItems],
  );

  return (
    <SelectPrimitive.List
      data-slot="select-list"
      className={cn(
        "no-scrollbar grid max-h-[min(calc(--spacing(72)-(--spacing(9))),calc(var(--available-height)-(--spacing(9))))] scroll-py-1.5 gap-1 overflow-y-auto overscroll-contain p-1.5 data-empty:p-0",
        className,
      )}
      {...props}
    >
      {filterChildren ? filterStatic(children, visible) : children}
    </SelectPrimitive.List>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2.5 rounded-2xl py-2 ps-3 pe-8 font-medium text-sm outline-hidden data-disabled:pointer-events-none data-highlighted:bg-accent data-selected:bg-accent data-highlighted:text-accent-foreground data-selected:text-accent-foreground data-disabled:opacity-50 not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute inset-e-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("grid gap-1", className)}
      {...props}
    />
  );
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-3 py-2.5 text-muted-foreground text-xs", className)}
      {...props}
    />
  );
}

function SelectCollection(props: SelectPrimitive.Collection.Props) {
  return (
    <SelectPrimitive.Collection data-slot="select-collection" {...props} />
  );
}

function SelectEmpty({ className, ...props }: SelectPrimitive.Empty.Props) {
  return (
    <SelectPrimitive.Empty
      data-slot="select-empty"
      className={cn(
        "hidden w-full justify-center py-2 text-center text-muted-foreground text-sm group-data-empty/select-content:flex",
        className,
      )}
      {...props}
    />
  );
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1.5 my-0.5 h-px bg-border", className)}
      {...props}
    />
  );
}

function SelectChipsImplementation({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof SelectPrimitive.Chips> &
  SelectPrimitive.Chips.Props) {
  return (
    <SelectPrimitive.Chips
      data-slot="select-chips"
      className={cn(
        "flex min-h-9 flex-wrap items-center gap-1.5 rounded-3xl border border-transparent bg-input/50 bg-clip-padding px-3 py-1.5 text-sm transition-[color,box-shadow,background-color] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 has-aria-invalid:border-destructive has-data-[slot=select-chip]:px-1.5 has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    />
  );
}

function SelectChip({
  className,
  children,
  showRemove = true,
  ...props
}: SelectPrimitive.Chip.Props & {
  showRemove?: boolean;
}) {
  return (
    <SelectPrimitive.Chip
      data-slot="select-chip"
      className={cn(
        "flex h-[calc(--spacing(5.5))] w-fit items-center justify-center gap-1 whitespace-nowrap rounded-3xl bg-input px-2 font-medium text-foreground text-xs has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-data-[slot=select-chip-remove]:pe-0 has-disabled:opacity-50 dark:bg-input/60",
        className,
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <SelectPrimitive.ChipRemove
          render={<Button variant="ghost" size="icon-xs" />}
          className="-ms-1 opacity-50 hover:opacity-100"
          data-slot="select-chip-remove"
        >
          <XIcon className="pointer-events-none" />
        </SelectPrimitive.ChipRemove>
      )}
    </SelectPrimitive.Chip>
  );
}

function SelectChipsInput({
  className,
  ...props
}: SelectPrimitive.Input.Props) {
  useRegisterOuterInput(true);

  return (
    <SelectPrimitive.Input
      data-slot="select-chip-input"
      className={cn("min-w-16 flex-1 outline-none", className)}
      {...props}
    />
  );
}

function useSelectAnchor() {
  return React.useRef<HTMLDivElement | null>(null);
}

const useSelectFilter = SelectPrimitive.useFilter;

const SelectTrigger = withGlass(SelectTriggerImplementation);
const SelectContent = withGlass(SelectContentImplementation);
const SelectChips = withGlass(SelectChipsImplementation);

export {
  Select,
  SelectChip,
  SelectChips,
  SelectChipsInput,
  SelectClear,
  SelectCollection,
  SelectContent,
  SelectEmpty,
  SelectGroup,
  SelectInput,
  SelectItem,
  SelectLabel,
  SelectList,
  SelectSearch,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  useSelectAnchor,
  useSelectFilter,
};
