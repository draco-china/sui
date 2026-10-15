"use client";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type ClipboardLabels,
  useClipboard,
} from "@/hooks/use-clipboard";
import { cn } from "cn";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import * as React from "react";
import { withGlass } from "@/lib/glass/context";
import { CopyIcon } from "@/components/ui/copy-icon";

interface SensitiveInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  visible?: boolean;
  defaultVisible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  inputClassName?: string;
  copyable?: boolean;
  onCopySuccess?: (value: string) => void;
  onCopyError?: (error: Error) => void;
  resetDelay?: number;
  labels?: ClipboardLabels & {
    show?: string;
    hide?: string;
    reveal?: string;
    instruction?: string;
    hidden?: string;
  };
}

function SensitiveInputImplementation({
  className,
  inputClassName,
  id,
  ref,
  value,
  defaultValue,
  onChange,
  onInput,
  onFocus,
  onKeyDown,
  tabIndex,
  form,
  visible: controlledVisible,
  defaultVisible = false,
  onVisibleChange,
  disabled = false,
  readOnly = false,
  copyable = true,
  onCopySuccess,
  onCopyError,
  resetDelay,
  labels,
  ...props
}: SensitiveInputProps) {
  const [internalVisible, setInternalVisible] = React.useState(defaultVisible);
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState(() =>
    String(value ?? defaultValue ?? ""),
  );
  const currentValue = value === undefined ? inputValue : String(value ?? "");
  const hasValue = currentValue.length > 0;
  const visible = controlledVisible ?? internalVisible;
  const masked = !visible && hasValue;
  const revealRef = React.useRef<HTMLButtonElement>(null);
  const focusTarget = React.useRef<"input" | "reveal" | null>(null);
  const instructionId = `${inputId}-instruction`;
  React.useEffect(() => {
    if (focusTarget.current === "input" && visible) {
      focusTarget.current = null;
      inputRef.current?.focus();
    } else if (focusTarget.current === "reveal" && masked) {
      focusTarget.current = null;
      revealRef.current?.focus();
    }
  }, [visible, masked]);
  const { status, copy, reset } = useClipboard(currentValue, {
    disabled: disabled || !copyable,
    resetDelay,
    onCopy: onCopySuccess,
    onCopyError,
  });
  const mergedRef = React.useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") {
        const cleanup = ref(node);
        return () => {
          inputRef.current = null;
          if (typeof cleanup === "function") cleanup();
          else ref(null);
        };
      }
      if (ref) ref.current = node;
      return () => {
        inputRef.current = null;
        if (ref) ref.current = null;
      };
    },
    [ref],
  );

  React.useEffect(() => {
    const owner = inputRef.current?.form;
    if (!owner || (form !== undefined && owner.id !== form)) return;
    const root = owner.getRootNode();
    let timer: ReturnType<typeof setTimeout> | undefined;
    function handleReset(event: Event) {
      if (event.target !== owner || event.defaultPrevented) return;
      reset();
      clearTimeout(timer);
      timer = setTimeout(() => {
        setInputValue(inputRef.current?.value ?? "");
      }, 0);
    }
    // Bubble after React's onReset, before the browser restores input values.
    root.addEventListener("reset", handleReset);
    return () => {
      clearTimeout(timer);
      root.removeEventListener("reset", handleReset);
    };
  }, [form, reset]);

  const feedback = {
    idle: "",
    copied: labels?.copied ?? "Copied",
    error: labels?.failed ?? "Copy failed. Select and copy the value manually.",
    pending: labels?.pending ?? "Copying…",
  }[status];
  const copyLabel = labels?.copy ?? "Copy to clipboard";

  function changeVisibility(next: boolean, focus?: "input" | "reveal") {
    if (disabled) return;
    focusTarget.current = focus ?? null;
    if (controlledVisible === undefined) setInternalVisible(next);
    onVisibleChange?.(next);
    if (next && visible && focus === "input") inputRef.current?.focus();
  }

  function trackValue(next: string) {
    setInputValue(next);
    if (!hasValue && next) changeVisibility(true);
  }

  const copyText = {
    idle: labels?.copy ?? "Copy",
    copied: labels?.copied ?? "Copied",
    pending: labels?.pending ?? "Copying…",
    error: labels?.failed ?? "Copy failed",
  }[status];

  return (
    <InputGroup
      data-slot="sensitive-input"
      data-visible={visible}
      data-disabled={disabled}
      data-readonly={readOnly}
      data-copy-status={copyable ? status : undefined}
      className={cn(
        "group/sensitive-input has-[[data-slot=sensitive-input-reveal]:focus-visible]:border-ring has-[[data-slot=sensitive-input-reveal]:focus-visible]:ring-3 has-[[data-slot=sensitive-input-reveal]:focus-visible]:ring-ring/30 data-[disabled=true]:opacity-50",
        className,
      )}
      onBlur={(event) => {
        if (
          visible &&
          !event.currentTarget.contains(event.relatedTarget) &&
          inputRef.current?.value
        ) {
          changeVisibility(false);
        }
      }}
    >
      <InputGroupInput
        {...props}
        ref={mergedRef}
        id={inputId}
        form={form}
        value={value}
        defaultValue={defaultValue}
        type={visible ? "text" : "password"}
        disabled={disabled}
        readOnly={readOnly}
        tabIndex={masked ? -1 : tabIndex}
        aria-hidden={masked ? true : props["aria-hidden"]}
        onFocus={(event) => {
          onFocus?.(event);
          if (!event.defaultPrevented && masked) changeVisibility(true);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (!event.defaultPrevented && event.key === "Escape" && hasValue) {
            event.preventDefault();
            changeVisibility(false, "reveal");
          }
        }}
        onChange={(event) => {
          trackValue(event.currentTarget.value);
          onChange?.(event);
        }}
        onInput={onInput}
        className={cn(
          masked &&
            "pointer-events-none text-transparent caret-transparent selection:bg-transparent selection:text-transparent",
          inputClassName,
        )}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          data-slot="sensitive-input-toggle"
          size="icon-xs"
          disabled={disabled}
          tabIndex={masked || !hasValue ? -1 : undefined}
          aria-hidden={masked || !hasValue ? true : undefined}
          className={cn(
            "active:translate-y-0!",
            (masked || !hasValue) && "pointer-events-none invisible",
          )}
          aria-label={
            visible
              ? (labels?.hide ?? "Hide value")
              : (labels?.show ?? "Show value")
          }
          aria-pressed={visible}
          aria-controls={inputId}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() =>
            changeVisibility(!visible, visible ? "reveal" : "input")
          }
        >
          {visible ? (
            <EyeOffIcon aria-hidden="true" />
          ) : (
            <EyeIcon aria-hidden="true" />
          )}
        </InputGroupButton>
      </InputGroupAddon>
      {masked && (
        <button
          ref={revealRef}
          type="button"
          data-slot="sensitive-input-reveal"
          disabled={disabled}
          tabIndex={tabIndex}
          aria-label={labels?.show ?? "Show value"}
          aria-controls={inputId}
          aria-describedby={[props["aria-describedby"], instructionId]
            .filter(Boolean)
            .join(" ")}
          className="absolute inset-0 flex cursor-pointer items-center rounded-[inherit] px-3 text-muted-foreground text-sm outline-none disabled:cursor-not-allowed"
          onClick={() => changeVisibility(true, "input")}
        >
          <span aria-hidden="true" className="grid min-w-0 flex-1 text-start">
            <span
              className={cn(
                "col-start-1 row-start-1 font-mono",
                !disabled &&
                  "opacity-100 transition-opacity group-focus-within/sensitive-input:opacity-0 group-hover/sensitive-input:opacity-0 motion-reduce:transition-none",
              )}
            >
              ••••••••
            </span>
            <span
              className={cn(
                "col-start-1 row-start-1 truncate opacity-0",
                !disabled &&
                  "transition-opacity group-focus-within/sensitive-input:opacity-100 group-hover/sensitive-input:opacity-100 motion-reduce:transition-none",
              )}
            >
              {labels?.reveal ?? "Click to reveal"}
            </span>
          </span>
          {!disabled && (
            <EyeIcon
              aria-hidden="true"
              className="size-4 shrink-0 opacity-0 transition-opacity group-focus-within/sensitive-input:opacity-100 group-hover/sensitive-input:opacity-100 motion-reduce:transition-none"
            />
          )}
        </button>
      )}
      {masked && (
        <span id={instructionId} className="sr-only">
          {labels?.instruction ?? "Click or press Enter to reveal"}.{" "}
          {labels?.hidden ?? "Value hidden"}
        </span>
      )}
      {copyable && (
        <Tooltip>
          {/* The tooltip anchors to a wrapper around the button, so it stays
              open while the button turns busy and changes its label. */}
          <TooltipTrigger
            data-slot="sensitive-input-copy-anchor"
            render={<span />}
            className="absolute end-2 -top-px -translate-y-full opacity-0 transition-opacity focus-within:opacity-100 group-focus-within/sensitive-input:opacity-100 group-hover/sensitive-input:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100"
          >
            <Button
              data-slot="sensitive-input-copy"
              type="button"
              size="sm"
              disabled={disabled || status === "pending"}
              aria-label={feedback || copyLabel}
              aria-busy={status === "pending"}
              aria-controls={inputId}
              className="h-auto min-h-0 rounded-t-md rounded-b-none border-0 px-2 py-0.5 text-xs leading-4 shadow-none"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (inputRef.current) void copy(inputRef.current.value);
              }}
            >
              <CopyIcon
                status={status}
                className={cn(
                  "size-3",
                  status === "error" && "text-destructive",
                )}
              />
              <span className="grid text-center">
                <span
                  aria-hidden="true"
                  className="invisible col-start-1 row-start-1"
                >
                  {labels?.copy ?? "Copy"}
                </span>
                <span
                  aria-hidden="true"
                  className="invisible col-start-1 row-start-1"
                >
                  {labels?.copied ?? "Copied"}
                </span>
                <span
                  aria-hidden="true"
                  className="invisible col-start-1 row-start-1"
                >
                  {labels?.pending ?? "Copying…"}
                </span>
                <span
                  aria-hidden="true"
                  className="invisible col-start-1 row-start-1"
                >
                  {labels?.failed ?? "Copy failed"}
                </span>
                <span className="col-start-1 row-start-1">{copyText}</span>
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{feedback || copyLabel}</TooltipContent>
        </Tooltip>
      )}
      {copyable && (
        <span className="sr-only" role="status">
          {feedback}
        </span>
      )}
    </InputGroup>
  );
}

// The setting passes to its input group, which is the glass field.
const SensitiveInput = withGlass(SensitiveInputImplementation, "scope");

export { SensitiveInput, type SensitiveInputProps };
