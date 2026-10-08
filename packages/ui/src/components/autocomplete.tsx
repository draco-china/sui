"use client";

import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@workspace/ui/components/input-group";
import { ChevronDownIcon, XIcon } from "lucide-react";
import type * as React from "react";
import { mergeClassNames } from "../lib/class-name";
import { withGlass } from "../lib/glass/context";

const Autocomplete = withGlass(AutocompletePrimitive.Root, "scope") as {
  <Items extends readonly { items: readonly unknown[] }[]>(
    props: Omit<
      AutocompletePrimitive.Root.Props<Items[number]["items"][number]>,
      "items"
    > & { items: Items; glass?: boolean },
  ): React.JSX.Element;
  <Value>(
    props: Omit<AutocompletePrimitive.Root.Props<Value>, "items"> & {
      items?: readonly Value[];
      glass?: boolean;
    },
  ): React.JSX.Element;
};
const AutocompleteValue = AutocompletePrimitive.Value;
const useAutocompleteFilter = AutocompletePrimitive.useFilter;
const useAutocompleteFilteredItems = AutocompletePrimitive.useFilteredItems;

function AutocompleteInputGroup({
  className,
  render = <InputGroup />,
  ...props
}: AutocompletePrimitive.InputGroup.Props) {
  return (
    <AutocompletePrimitive.InputGroup
      data-slot="autocomplete-input-group"
      render={render}
      className={mergeClassNames("w-full data-disabled:opacity-50", className)}
      {...props}
    />
  );
}

function AutocompleteInput({
  className,
  render = <InputGroupInput />,
  ...props
}: AutocompletePrimitive.Input.Props) {
  return (
    <AutocompletePrimitive.Input
      render={render}
      className={mergeClassNames("", className)}
      {...props}
    />
  );
}

function AutocompleteTrigger({
  className,
  children,
  render = <InputGroupButton variant="ghost" size="icon-xs" />,
  ...props
}: AutocompletePrimitive.Trigger.Props) {
  return (
    <AutocompletePrimitive.Trigger
      data-slot="autocomplete-trigger"
      render={render}
      className={mergeClassNames(
        "[&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children ?? <ChevronDownIcon aria-hidden="true" />}
    </AutocompletePrimitive.Trigger>
  );
}

function AutocompleteClear({
  className,
  children,
  render = <InputGroupButton variant="ghost" size="icon-xs" />,
  ...props
}: AutocompletePrimitive.Clear.Props) {
  return (
    <AutocompletePrimitive.Clear
      data-slot="autocomplete-clear"
      aria-label="Clear text"
      render={render}
      className={mergeClassNames("", className)}
      {...props}
    >
      {children ?? <XIcon aria-hidden="true" />}
    </AutocompletePrimitive.Clear>
  );
}

function AutocompleteContentImplementation({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: AutocompletePrimitive.Popup.Props &
  Pick<
    AutocompletePrimitive.Positioner.Props,
    "side" | "sideOffset" | "align" | "alignOffset" | "anchor"
  >) {
  return (
    <AutocompletePrimitive.Portal>
      <AutocompletePrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <AutocompletePrimitive.Popup
          data-slot="autocomplete-content"
          className={mergeClassNames(
            "data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 relative max-h-(--available-height) w-(--anchor-width) min-w-40 max-w-(--available-width) origin-(--transform-origin) overflow-hidden rounded-[calc(var(--radius)+0.875rem)] bg-popover text-popover-foreground shadow-lg outline-none ring-1 ring-foreground/5 duration-100 data-closed:animate-out data-open:animate-in dark:ring-foreground/10",
            className,
          )}
          {...props}
        />
      </AutocompletePrimitive.Positioner>
    </AutocompletePrimitive.Portal>
  );
}

function AutocompleteList({
  className,
  ...props
}: AutocompletePrimitive.List.Props) {
  return (
    <AutocompletePrimitive.List
      data-slot="autocomplete-list"
      className={mergeClassNames(
        "no-scrollbar grid max-h-[min(--spacing(72),var(--available-height))] scroll-py-1.5 gap-1 overflow-y-auto overscroll-contain p-1.5 data-empty:p-0",
        className,
      )}
      {...props}
    />
  );
}

function AutocompleteItem({
  className,
  ...props
}: AutocompletePrimitive.Item.Props) {
  return (
    <AutocompletePrimitive.Item
      data-slot="autocomplete-item"
      className={mergeClassNames(
        "relative flex w-full cursor-default select-none items-center gap-2.5 rounded-2xl px-3 py-2 font-medium text-sm outline-none data-disabled:pointer-events-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

function AutocompleteGroup({
  className,
  ...props
}: AutocompletePrimitive.Group.Props) {
  return (
    <AutocompletePrimitive.Group
      data-slot="autocomplete-group"
      className={mergeClassNames("grid gap-1", className)}
      {...props}
    />
  );
}

function AutocompleteGroupLabel({
  className,
  ...props
}: AutocompletePrimitive.GroupLabel.Props) {
  return (
    <AutocompletePrimitive.GroupLabel
      data-slot="autocomplete-group-label"
      className={mergeClassNames(
        "px-3 py-2 text-muted-foreground text-sm",
        className,
      )}
      {...props}
    />
  );
}

function AutocompleteCollection({
  ...props
}: AutocompletePrimitive.Collection.Props) {
  return <AutocompletePrimitive.Collection {...props} />;
}

function AutocompleteEmpty({
  className,
  ...props
}: AutocompletePrimitive.Empty.Props) {
  return (
    <AutocompletePrimitive.Empty
      data-slot="autocomplete-empty"
      className={mergeClassNames(
        "px-3 py-4 text-center text-muted-foreground text-sm empty:p-0",
        className,
      )}
      {...props}
    />
  );
}

function AutocompleteStatus({
  className,
  ...props
}: AutocompletePrimitive.Status.Props) {
  return (
    <AutocompletePrimitive.Status
      data-slot="autocomplete-status"
      className={mergeClassNames(
        "px-3 py-2 text-muted-foreground text-sm",
        className,
      )}
      {...props}
    />
  );
}

function AutocompleteSeparator({
  className,
  ...props
}: AutocompletePrimitive.Separator.Props) {
  return (
    <AutocompletePrimitive.Separator
      data-slot="autocomplete-separator"
      className={mergeClassNames(
        "my-0.5 shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch",
        className,
      )}
      {...props}
    />
  );
}

const AutocompleteContent = withGlass(
  AutocompleteContentImplementation,
  "portal",
);

export {
  Autocomplete,
  AutocompleteClear,
  AutocompleteCollection,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteGroup,
  AutocompleteGroupLabel,
  AutocompleteInput,
  AutocompleteInputGroup,
  AutocompleteItem,
  AutocompleteList,
  AutocompleteSeparator,
  AutocompleteStatus,
  AutocompleteTrigger,
  AutocompleteValue,
  useAutocompleteFilter,
  useAutocompleteFilteredItems,
};
