"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { Button } from "@workspace/ui/components/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@workspace/ui/components/combobox";
import { cn } from "cn";
import { XIcon } from "lucide-react";
import * as React from "react";
import { withGlass } from "../lib/glass/context";

interface TagInputLabels {
  input?: string;
  removeValue?: (value: string) => string;
  createValue?: (value: string) => string;
  invalidValue?: (value: string) => string;
  maxValuesReached?: (maxValues: number) => string;
  empty?: string;
}

interface TagInputProps
  extends Omit<
    React.ComponentProps<"input">,
    "value" | "defaultValue" | "type" | "size"
  > {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (values: string[]) => void;
  suggestions?: readonly string[];
  allowCustom?: boolean;
  maxValues?: number;
  validateValue?: (value: string, values: string[]) => boolean;
  inputValue?: string;
  defaultInputValue?: string;
  onInputValueChange?: (value: string) => void;
  inputClassName?: string;
  labels?: TagInputLabels;
}

const EMPTY_VALUES: string[] = [];

function uniqueValues(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function TagInputImplementation({
  value: controlledValue,
  defaultValue = EMPTY_VALUES,
  onValueChange,
  suggestions = EMPTY_VALUES,
  allowCustom = true,
  maxValues,
  validateValue,
  inputValue: controlledInputValue,
  defaultInputValue = "",
  onInputValueChange,
  className,
  inputClassName,
  labels,
  disabled = false,
  readOnly = false,
  name,
  form,
  required,
  ref,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onPaste,
  onChange,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: TagInputProps) {
  const [internalValues, setInternalValues] = React.useState(() =>
    uniqueValues(defaultValue),
  );
  const [internalInputValue, setInternalInputValue] =
    React.useState(defaultInputValue);
  const [message, setMessage] = React.useState("");
  const sourceValues = controlledValue ?? internalValues;
  const values = React.useMemo(
    () => uniqueValues(sourceValues),
    [sourceValues],
  );
  const query = controlledInputValue ?? internalInputValue;
  const anchor = useComboboxAnchor();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const composing = React.useRef(false);
  const highlighted = React.useRef<string | undefined>(undefined);
  const [open, setOpen] = React.useState(false);
  const statusId = React.useId();
  const knownValues = uniqueValues([...suggestions, ...values]);
  const candidate = query.trim();
  const canCreate =
    allowCustom && candidate !== "" && !knownValues.includes(candidate);
  const items = canCreate ? [...knownValues, candidate] : knownValues;

  const assignRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      const cleanup = typeof ref === "function" ? ref(node) : undefined;
      if (ref && typeof ref !== "function") ref.current = node;
      return () => {
        inputRef.current = null;
        if (typeof cleanup === "function") cleanup();
        else if (typeof ref === "function") ref(null);
        else if (ref) ref.current = null;
      };
    },
    [ref],
  );

  const resetValues = React.useEffectEvent(() => {
    if (controlledValue === undefined)
      setInternalValues(uniqueValues(defaultValue));
    if (controlledInputValue === undefined)
      setInternalInputValue(defaultInputValue);
    setMessage("");
    setOpen(false);
  });

  React.useEffect(() => {
    const owner = inputRef.current?.form;
    if (!owner || (form && owner.id !== form)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reset = (event: Event) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!event.defaultPrevented) resetValues();
      }, 0);
    };
    owner.addEventListener("reset", reset);
    return () => {
      clearTimeout(timer);
      owner.removeEventListener("reset", reset);
    };
  }, [form]);

  function updateQuery(next: string) {
    if (controlledInputValue === undefined) setInternalInputValue(next);
    onInputValueChange?.(next);
  }

  function updateValues(next: string[]) {
    if (
      next.length === values.length &&
      next.every((value, index) => value === values[index])
    )
      return;
    if (controlledValue === undefined) setInternalValues(next);
    onValueChange?.(next);
  }

  function validateAddition(value: string, current: string[]) {
    if (maxValues !== undefined && current.length >= maxValues) {
      setMessage(
        labels?.maxValuesReached?.(maxValues) ??
          `Limit of ${maxValues} tags reached`,
      );
      return false;
    }
    if (validateValue && !validateValue(value, current)) {
      setMessage(
        labels?.invalidValue?.(value) ?? `"${value}" is not a valid tag`,
      );
      return false;
    }
    return true;
  }

  function commit(source: string) {
    const next = [...values];
    const tokens = source
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
    for (const [index, token] of tokens.entries()) {
      if (next.includes(token)) continue;
      if (
        (!allowCustom && !knownValues.includes(token)) ||
        !validateAddition(token, next)
      ) {
        if (!allowCustom && !knownValues.includes(token)) {
          setMessage(
            labels?.invalidValue?.(token) ?? `"${token}" is not a valid tag`,
          );
        }
        updateValues(next);
        updateQuery(tokens.slice(index).join(", "));
        return false;
      }
      next.push(token);
    }
    updateValues(next);
    updateQuery("");
    setMessage("");
    setOpen(false);
    return true;
  }

  const handleKeyDown: NonNullable<
    ComboboxPrimitive.Input.Props["onKeyDown"]
  > = (event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      event.preventBaseUIHandler();
      return;
    }
    if (
      composing.current ||
      event.nativeEvent.isComposing ||
      event.nativeEvent.keyCode === 229
    ) {
      event.preventBaseUIHandler();
      return;
    }
    if (disabled || readOnly || event.ctrlKey || event.altKey || event.metaKey)
      return;
    if (!query.trim() || !["Enter", ",", "Tab"].includes(event.key)) return;
    if (event.key === "Enter" && open && highlighted.current !== undefined)
      return;
    if (event.key !== "Tab" || !event.shiftKey) commit(query);
    event.preventBaseUIHandler();
    if (event.key !== "Tab") event.preventDefault();
  };

  return (
    <Combobox
      multiple
      items={items}
      value={values}
      inputValue={query}
      open={open && !disabled && !readOnly}
      name={name}
      form={form}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      filter={(item, input) =>
        item === candidate ||
        item.toLocaleLowerCase().includes(input.trim().toLocaleLowerCase())
      }
      onItemHighlighted={(item) => {
        highlighted.current = item;
      }}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) highlighted.current = undefined;
      }}
      onInputValueChange={(next, details) => {
        if (details.reason === "input-clear" && !details.isItemPress) {
          details.cancel();
          return;
        }
        updateQuery(next);
        setMessage("");
      }}
      onValueChange={(next, details) => {
        if (disabled || readOnly || composing.current) {
          details.cancel();
          return;
        }
        const normalized = uniqueValues(next);
        const additions = normalized.filter((item) => !values.includes(item));
        const accepted = values.filter((item) => normalized.includes(item));
        for (const item of additions) {
          if (!validateAddition(item, accepted)) {
            details.cancel();
            return;
          }
          accepted.push(item);
        }
        updateValues(normalized);
        if (additions.length > 0) updateQuery("");
        setMessage("");
      }}
    >
      <ComboboxChips
        ref={anchor}
        data-slot="tag-input"
        data-disabled={disabled}
        data-readonly={readOnly}
        className={cn(
          "w-full data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50",
          className,
        )}
      >
        {values.map((value) => (
          <ComboboxChip key={value} showRemove={false} aria-label={value}>
            <span className="max-w-48 truncate">{value}</span>
            <ComboboxPrimitive.ChipRemove
              data-slot="tag-input-remove"
              render={<Button variant="ghost" size="icon-xs" glass={false} />}
              disabled={disabled || readOnly}
              className="-ms-1 opacity-50 hover:opacity-100"
              aria-label={labels?.removeValue?.(value) ?? `Remove ${value}`}
            >
              <XIcon aria-hidden="true" className="size-3" />
            </ComboboxPrimitive.ChipRemove>
          </ComboboxChip>
        ))}
        <ComboboxChipsInput
          {...props}
          ref={assignRef}
          data-slot="tag-input-control"
          form={form}
          required={false}
          disabled={disabled}
          readOnly={readOnly}
          aria-label={
            props["aria-label"] ??
            labels?.input ??
            (props.id ? undefined : "Add tag")
          }
          aria-invalid={message ? true : invalid}
          aria-describedby={
            [describedBy, message ? statusId : undefined]
              .filter(Boolean)
              .join(" ") || undefined
          }
          className={cn("min-w-24 disabled:cursor-not-allowed", inputClassName)}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            onChange?.(event);
            if (event.defaultPrevented) event.preventBaseUIHandler();
          }}
          onCompositionStart={(event) => {
            composing.current = true;
            onCompositionStart?.(event);
          }}
          onCompositionEnd={(event) => {
            composing.current = false;
            onCompositionEnd?.(event);
          }}
          onPaste={(event) => {
            onPaste?.(event);
            if (
              event.defaultPrevented ||
              disabled ||
              readOnly ||
              composing.current
            )
              return;
            const text = event.clipboardData.getData("text");
            if (!/[,\n]/.test(text)) return;
            event.preventDefault();
            const start = event.currentTarget.selectionStart ?? query.length;
            const end = event.currentTarget.selectionEnd ?? start;
            commit(query.slice(0, start) + text + query.slice(end));
          }}
        />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>
          {labels?.empty ?? "No suggestions found."}
        </ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {canCreate && item === candidate
                ? (labels?.createValue?.(item) ?? `Add "${item}"`)
                : item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
      <span
        data-slot="tag-input-status"
        id={statusId}
        role="status"
        className={cn("text-destructive text-sm", !message && "sr-only")}
      >
        {message}
      </span>
    </Combobox>
  );
}

const TagInput = withGlass(TagInputImplementation, "scope");

export { TagInput, type TagInputLabels, type TagInputProps };
