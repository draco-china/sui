"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import { isEmptyValue } from "../conditions";
import type { DataFormValues } from "../types";
import { choiceValueTypes } from "./choice";
import { dateValueTypes } from "./date";
import { miscValueTypes } from "./misc";
import { numberValueTypes } from "./number";
import { plainText } from "./shared";
import { textValueTypes } from "./text";
import type {
  ValueEditProps,
  ValueReadProps,
  ValueTypeDefinition,
  ValueTypeMap,
} from "./types";

export { ValuePrefix } from "./prefix";
export {
  asList,
  asPair,
  enumOptions,
  findOption,
  nodeText,
  optionText,
} from "./shared";
export type {
  DataFormOption,
  DataFormOptionColor,
  ValueEditProps,
  ValueEnum,
  ValueReadProps,
  ValueTypeDefinition,
  ValueTypeMap,
} from "./types";

/** Every built-in value type, by name. */
export const builtInValueTypes: ValueTypeMap = {
  ...textValueTypes,
  ...numberValueTypes,
  ...choiceValueTypes,
  ...dateValueTypes,
  ...miscValueTypes,
};

const ValueTypeContext = createContext<ValueTypeMap>(builtInValueTypes);

/**
 * Registers custom value types for every DataForm (and DataTable) inside.
 * Nested providers add to the outer ones.
 */
export function ValueTypeProvider({
  valueTypes,
  children,
}: {
  valueTypes: ValueTypeMap;
  children: ReactNode;
}) {
  const outer = useContext(ValueTypeContext);
  const value = useMemo(
    () => ({ ...outer, ...valueTypes }),
    [outer, valueTypes],
  );
  return (
    <ValueTypeContext.Provider value={value}>
      {children}
    </ValueTypeContext.Provider>
  );
}

/** The value types in scope, with `extra` added on top. */
export function useValueTypes(extra?: ValueTypeMap): ValueTypeMap {
  const scoped = useContext(ValueTypeContext);
  return useMemo(
    () => (extra ? { ...scoped, ...extra } : scoped),
    [scoped, extra],
  );
}

export function getValueType(
  valueTypes: ValueTypeMap,
  name: string | undefined,
): ValueTypeDefinition {
  return (
    valueTypes[name ?? "text"] ?? valueTypes.text ?? builtInValueTypes.text
  );
}

/**
 * Draws a value type's control as its own component, so a control that
 * uses hooks keeps them when its field turns read-only. Key it by the value
 * type, so switching types starts a fresh control.
 */
export function ValueEdit({
  type,
  ...props
}: ValueEditProps & { type: ValueTypeDefinition }) {
  return type.edit(props);
}

/** A control's props plus the form's values, for a field's own `render`. */
export type ValueControlProps = ValueEditProps & {
  readonly values: DataFormValues;
};

/**
 * A field's control: its own `render` (a plain function of the control
 * props), or the value type's control.
 */
export function renderControl(
  render: ((props: ValueControlProps) => ReactNode) | undefined,
  type: ValueTypeDefinition,
  valueType: string | undefined,
  props: ValueControlProps,
): ReactNode {
  if (render) return render(props);
  return <ValueEdit key={valueType ?? "text"} type={type} {...props} />;
}

/** Plain text of a value through its type. */
export function valueText(type: ValueTypeDefinition, props: ValueReadProps) {
  if (isEmptyValue(props.value)) return "";
  return (type.text ?? plainText)(props);
}

/**
 * A read-only value. Empty values show as a muted dash, as the data display
 * pattern asks, so a blank never looks like a missing cell.
 */
export function ValueRead({
  type,
  ...props
}: ValueReadProps & { type: ValueTypeDefinition }) {
  if (isEmptyValue(props.value))
    return (
      <span data-slot="data-form-empty" className="text-muted-foreground">
        -
      </span>
    );
  if (type.read) return type.read(props);
  return valueText(type, props);
}
