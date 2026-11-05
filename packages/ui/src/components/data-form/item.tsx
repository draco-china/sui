"use client";

import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { useDataFormContext } from "./context";
import { FieldShell, FieldValue } from "./field-shell";
import type {
  DataFormControlProps,
  DataFormFieldConfig,
  DataFormValues,
} from "./types";
import { useFieldRuntime, useWatched } from "./use-field";

type ChildProps = Record<string, unknown>;

export interface DataFormItemProps
  extends Omit<DataFormFieldConfig, "render" | "fieldProps" | "options"> {
  /**
   * One control to bind, such as `<Input />`, or a function that draws the
   * control from the field's props.
   */
  readonly children:
    | ReactElement
    | ((control: DataFormControlProps) => ReactNode);
  /** The prop that holds the value; `checked` for checkboxes and switches. */
  readonly valuePropName?: string;
  /** The change callback; `onChange`, `onValueChange` or `onCheckedChange`. */
  readonly trigger?: string;
  /** Reads the value from what the change callback receives. */
  readonly getValueFromEvent?: (...args: unknown[]) => unknown;
}

const checkedControls: readonly unknown[] = [Checkbox, Switch];
const nativeControls: readonly unknown[] = [Input, Textarea];

function defaultValueProp(type: unknown) {
  return checkedControls.includes(type) ? "checked" : "value";
}

function defaultTrigger(type: unknown) {
  if (checkedControls.includes(type)) return "onCheckedChange";
  if (typeof type === "string" || nativeControls.includes(type))
    return "onChange";
  return "onValueChange";
}

/** A checkbox sits before its label, a switch after it. */
function inlinePlacement(type: unknown): "start" | "end" | undefined {
  if (type === Switch) return "end";
  if (type === Checkbox) return "start";
  return undefined;
}

function readEvent(arg: unknown) {
  if (arg && typeof arg === "object" && "target" in arg) {
    const target = (arg as { target: HTMLInputElement }).target;
    if (target.type === "checkbox") return target.checked;
    return target.value === "" ? undefined : target.value;
  }
  return arg;
}

function controlValue(type: unknown, valueProp: string, value: unknown) {
  if (valueProp === "checked") return value === true;
  if (typeof type === "string" || nativeControls.includes(type))
    return value ?? "";
  return value ?? null;
}

function bindChild(
  child: ReactElement<ChildProps>,
  control: DataFormControlProps,
  item: Pick<
    DataFormItemProps,
    "valuePropName" | "trigger" | "getValueFromEvent"
  >,
) {
  const valueProp = item.valuePropName ?? defaultValueProp(child.type);
  const trigger = item.trigger ?? defaultTrigger(child.type);
  const read = item.getValueFromEvent ?? readEvent;
  const own = child.props;
  return cloneElement(child, {
    id: own.id ?? control.id,
    name: own.name ?? control.name,
    [valueProp]: controlValue(child.type, valueProp, control.value),
    [trigger]: (...args: unknown[]) => {
      (own[trigger] as ((...a: unknown[]) => void) | undefined)?.(...args);
      control.onChange(read(...args));
    },
    onBlur: (...args: unknown[]) => {
      (own.onBlur as ((...a: unknown[]) => void) | undefined)?.(...args);
      control.onBlur();
    },
    disabled: control.disabled || (own.disabled as boolean | undefined),
    "aria-invalid": control.invalid || undefined,
    "aria-required": control.required || undefined,
    "aria-describedby": control.describedBy,
  });
}

/**
 * Binds any control to the form and frames it with a label, description
 * and error. The control keeps its own props; DataFormItem adds the value,
 * the change and blur handlers, and the accessibility attributes.
 */
export function DataFormItem({
  children,
  valuePropName,
  trigger,
  getValueFromEvent,
  ...config
}: DataFormItemProps) {
  const runtime = useFieldRuntime(config);
  // The control props a render function or a bound child receives.
  const control: DataFormControlProps = runtime.editProps;

  let content: ReactNode;
  if (runtime.state.readonly) {
    content = <FieldValue runtime={runtime} />;
  } else if (typeof children === "function") {
    content = children(control);
  } else {
    const child = Children.only(children);
    content = isValidElement<ChildProps>(child)
      ? bindChild(child, control, { valuePropName, trigger, getValueFromEvent })
      : child;
  }
  const inline = inlinePlacement(
    isValidElement(children) ? children.type : undefined,
  );

  return (
    <FieldShell
      runtime={runtime}
      label={config.label}
      description={config.description}
      tooltip={config.tooltip}
      labelTarget={typeof children === "function" ? "group" : "control"}
      inline={inline}
      colSpan={config.colSpan}
      className={config.className}
    >
      {content}
    </FieldShell>
  );
}

/** Renders from the current values of the named fields only. */
export function DataFormDependency({
  names,
  children,
}: {
  readonly names: readonly string[];
  readonly children: (values: DataFormValues) => ReactNode;
}) {
  const form = useDataFormContext();
  const picked = useWatched(form, names);
  const values: DataFormValues = {};
  names.forEach((name, index) => {
    values[name] = picked[index];
  });
  return children(values);
}
