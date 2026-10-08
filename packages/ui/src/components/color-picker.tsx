"use client";

import { cn } from "cn";
import { Pipette } from "lucide-react";
import {
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  type ColorFormat,
  clampColor,
  colorToCSS,
  colorToHex,
  formatColor,
  type HSVColor,
  parseColor,
  parseHexColor,
} from "../lib/color/model";
import { Button } from "./button";
import { Input } from "./input";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Slider } from "./slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

interface ColorPickerLabels {
  trigger: string;
  saturation: string;
  hue: string;
  alpha: string;
  hex: string;
  format: string;
  color: string;
  invalid: string;
  eyeDropper: string;
  eyeDropperFailed: string;
  swatches: string;
}

interface ColorPickerProps
  extends Omit<
    ComponentProps<typeof Button>,
    "value" | "defaultValue" | "onChange" | "children" | "glass"
  > {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  alpha?: boolean;
  swatches?: readonly string[];
  glass?: boolean;
  inline?: boolean;
  eyeDropper?: boolean;
  labels?: Partial<ColorPickerLabels>;
  contentClassName?: string;
}

const defaultLabels: ColorPickerLabels = {
  trigger: "Choose color",
  saturation: "Saturation and brightness",
  hue: "Hue",
  alpha: "Opacity",
  hex: "HEX color",
  format: "Color format",
  color: "Color value",
  invalid: "Enter a valid color value",
  eyeDropper: "Pick a screen color",
  eyeDropperFailed: "Could not pick a screen color",
  swatches: "Preset colors",
};
const colorFormats = ["hex", "rgb", "hsl", "hsb", "oklch"] as const;
const colorFormatItems = colorFormats.map((value) => ({
  value,
  label: value.toUpperCase(),
}));
const defaultColor: HSVColor = { h: 213, s: 1, v: 1, a: 1 };
const checker =
  "repeating-conic-gradient(#d4d4d4 0% 25%, #fff 0% 50%) 0 / 12px 12px";
const hueGradient =
  "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)";
interface EyeDropperConstructor {
  new (): {
    open(options: { signal: AbortSignal }): Promise<{ sRGBHex: string }>;
  };
}

function ColorPicker({
  value,
  defaultValue = "#0088FF",
  onValueChange,
  alpha = false,
  swatches = [],
  glass = false,
  inline = false,
  eyeDropper = true,
  labels,
  className,
  contentClassName,
  disabled,
  ...triggerProps
}: ColorPickerProps) {
  const text = { ...defaultLabels, ...labels };
  const [local, setLocal] = useState(() => {
    const color = parseHexColor(value ?? defaultValue) ?? defaultColor;
    return { hex: colorToHex(color, alpha), color };
  });
  const parsed = parseHexColor(value ?? local.hex) ?? local.color;
  const hex = colorToHex(parsed, alpha);
  const color = hex === local.hex ? local.color : parsed;
  const [format, setFormat] = useState<ColorFormat>("hex");
  const formatted = formatColor(color, format, alpha);
  const [draft, setDraft] = useState(formatted);
  const editingDraft = useRef<{
    hex: string;
    format: ColorFormat;
    text: string;
  } | null>(null);
  const [dropperAvailable, setDropperAvailable] = useState(false);
  const [dropperPending, setDropperPending] = useState(false);
  const [dropperFailed, setDropperFailed] = useState(false);
  const dropperAbort = useRef<AbortController | null>(null);
  const id = useId();
  useEffect(() => {
    if (value !== undefined && local.hex !== hex) {
      editingDraft.current = null;
      setDraft(formatted);
      return;
    }
    const editing = editingDraft.current;
    if (editing && editing.hex === hex && editing.format === format) {
      setDraft(editing.text);
      return;
    }
    editingDraft.current = null;
    setDraft(formatted);
  }, [formatted, hex, local.hex, value, format]);
  useEffect(() => {
    setDropperAvailable(
      typeof (window as unknown as { EyeDropper?: unknown }).EyeDropper ===
        "function" && window.isSecureContext,
    );
    return () => dropperAbort.current?.abort();
  }, []);
  const invalid = parseColor(draft, format) === null;

  function commit(next: HSVColor, inputText?: string) {
    if (disabled) return;
    const color = { ...next, a: alpha ? clampColor(next.a) : 1 };
    const nextHex = colorToHex(color, alpha);
    setLocal({ hex: nextHex, color });
    editingDraft.current =
      inputText === undefined
        ? null
        : { hex: nextHex, format, text: inputText };
    setDraft(inputText ?? formatColor(color, format, alpha));
    if (nextHex !== hex) onValueChange?.(nextHex);
  }
  const currentState = useRef({ color, commit });
  currentState.current = { color, commit };

  async function pickScreen() {
    if (!dropperAvailable || disabled || dropperPending || dropperAbort.current)
      return;
    const Dropper = (window as unknown as { EyeDropper: EyeDropperConstructor })
      .EyeDropper;
    const controller = new AbortController();
    dropperAbort.current = controller;
    setDropperPending(true);
    setDropperFailed(false);
    try {
      const result = await new Dropper().open({ signal: controller.signal });
      const picked = parseHexColor(result.sRGBHex);
      if (!controller.signal.aborted && picked)
        currentState.current.commit({
          ...picked,
          a: currentState.current.color.a,
        });
    } catch (error) {
      if (
        !controller.signal.aborted &&
        !(error instanceof DOMException && error.name === "AbortError")
      )
        setDropperFailed(true);
    } finally {
      if (!controller.signal.aborted) setDropperPending(false);
      if (dropperAbort.current === controller) dropperAbort.current = null;
    }
  }

  const controls = (
    <div
      data-slot="color-picker-controls"
      className={cn("grid gap-4", inline && className)}
    >
      <ColorPickerArea
        color={color}
        onColorChange={commit}
        disabled={disabled}
        label={text.saturation}
        descriptionId={`${id}-instructions`}
      />
      <span id={`${id}-instructions`} className="sr-only">
        ← →: {text.saturation} · ↑ ↓: {text.saturation} · Shift × 10
      </span>
      <ColorPickerSlider
        color={color}
        onColorChange={commit}
        channel="hue"
        disabled={disabled}
        label={text.hue}
      />
      {alpha && (
        <ColorPickerSlider
          color={color}
          onColorChange={commit}
          channel="alpha"
          disabled={disabled}
          label={text.alpha}
        />
      )}
      <Select
        items={colorFormatItems}
        value={format}
        onValueChange={(value) => {
          if (value) setFormat(value as ColorFormat);
        }}
        disabled={disabled}
      >
        <SelectTrigger
          glass={false}
          aria-label={text.format}
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {colorFormats.map((format) => (
            <SelectItem key={format} value={format}>
              {format.toUpperCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <div
          aria-hidden="true"
          className="size-9 shrink-0 overflow-hidden rounded-xl"
          style={{ background: checker }}
        >
          <div
            className="size-full"
            style={{
              background: colorToCSS({ ...color, a: alpha ? color.a : 1 }),
            }}
          />
        </div>
        <div className="grid min-w-0 flex-1 gap-1">
          <label htmlFor={`${id}-hex`} className="sr-only">
            {format === "hex" ? text.hex : text.color}
          </label>
          <Input
            glass={false}
            id={`${id}-hex`}
            value={draft}
            disabled={disabled}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? `${id}-error` : undefined}
            onChange={(event) => {
              const next = event.target.value;
              setDraft(next);
              const parsed = parseColor(next, format);
              if (parsed) commit(parsed, next);
            }}
            onBlur={() => {
              editingDraft.current = null;
              if (!invalid) setDraft(formatted);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            className="font-mono"
          />
        </div>
        {eyeDropper && dropperAvailable && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  glass={false}
                  disabled={disabled || dropperPending}
                  aria-label={text.eyeDropper}
                  onClick={pickScreen}
                />
              }
            >
              <Pipette />
            </TooltipTrigger>
            <TooltipContent>{text.eyeDropper}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {invalid && (
        <p
          id={`${id}-error`}
          role="status"
          className="text-destructive text-xs"
        >
          {text.invalid}
        </p>
      )}
      {dropperFailed && (
        <p role="status" className="text-destructive text-xs">
          {text.eyeDropperFailed}
        </p>
      )}
      <ColorPickerSwatches
        value={hex}
        swatches={swatches}
        onValueChange={(value) => {
          const parsed = parseHexColor(value);
          if (parsed) commit(parsed);
        }}
        alpha={alpha}
        disabled={disabled}
        label={text.swatches}
      />
    </div>
  );
  if (inline) return controls;
  return (
    <Popover glass={glass}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn("gap-2 font-mono", className)}
            {...triggerProps}
          />
        }
        aria-label={text.trigger}
      >
        <span
          aria-hidden="true"
          className="size-5 overflow-hidden rounded-md"
          style={{ background: checker }}
        >
          <span
            className="block size-full"
            style={{
              background: colorToCSS({ ...color, a: alpha ? color.a : 1 }),
            }}
          />
        </span>
        {hex}
      </PopoverTrigger>
      <PopoverContent
        glass={glass}
        className={cn("w-72 max-w-[calc(100vw-2rem)]", contentClassName)}
      >
        <PopoverTitle>{text.trigger}</PopoverTitle>
        {controls}
      </PopoverContent>
    </Popover>
  );
}

export type { ColorPickerLabels, ColorPickerProps };

interface ColorPickerAreaProps {
  color: HSVColor;
  onColorChange: (color: HSVColor) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  descriptionId?: string;
}

function ColorPickerArea({
  color,
  onColorChange,
  disabled,
  label = defaultLabels.saturation,
  className,
  descriptionId,
}: ColorPickerAreaProps) {
  const dragPointer = useRef<number | null>(null);
  function updatePosition(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    onColorChange({
      ...color,
      s: clampColor((event.clientX - bounds.left) / bounds.width),
      v: 1 - clampColor((event.clientY - bounds.top) / bounds.height),
    });
  }
  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerId !== dragPointer.current) return;
    dragPointer.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function saturationKey(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const step = event.shiftKey ? 0.1 : 0.01;
    const next = { ...color };
    if (event.key === "ArrowLeft") next.s -= step;
    else if (event.key === "ArrowRight") next.s += step;
    else if (event.key === "ArrowUp") next.v += step;
    else if (event.key === "ArrowDown") next.v -= step;
    else if (event.key === "Home") next.s = 0;
    else if (event.key === "End") next.s = 1;
    else return;
    event.preventDefault();
    onColorChange({ ...next, s: clampColor(next.s), v: clampColor(next.v) });
  }
  return (
    <div
      data-slot="color-picker-saturation"
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(color.s * 100)}
      aria-valuetext={`${Math.round(color.s * 100)}% / ${Math.round(color.v * 100)}%`}
      aria-describedby={descriptionId}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "relative h-40 w-full touch-none rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/30 aria-disabled:opacity-50",
        className,
      )}
      style={{
        background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${color.h}, 100%, 50%)`,
      }}
      onKeyDown={saturationKey}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0 || dragPointer.current !== null)
          return;
        event.preventDefault();
        event.currentTarget.focus();
        dragPointer.current = event.pointerId;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        updatePosition(event);
      }}
      onPointerMove={(event) => {
        if (dragPointer.current === event.pointerId) updatePosition(event);
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={() => {
        dragPointer.current = null;
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_#0005]"
        style={{
          left: `${color.s * 100}%`,
          top: `${(1 - color.v) * 100}%`,
          background: colorToCSS(color),
        }}
      />
    </div>
  );
}

interface ColorPickerSliderProps
  extends Omit<ColorPickerAreaProps, "descriptionId"> {
  channel: "hue" | "alpha";
}
function ColorPickerSlider({
  color,
  onColorChange,
  disabled,
  label,
  channel,
  className,
}: ColorPickerSliderProps) {
  const id = useId();
  const hue = channel === "hue";
  const gradient = hue
    ? hueGradient
    : `linear-gradient(to right, transparent, ${colorToHex(color)}), ${checker}`;
  return (
    <div className={cn("grid gap-2", className)}>
      <span id={id} className="text-muted-foreground text-xs">
        {label ?? defaultLabels[channel]}
      </span>
      <Slider
        glass={false}
        aria-labelledby={id}
        value={[hue ? color.h : color.a * 100]}
        min={0}
        max={hue ? 360 : 100}
        step={1}
        disabled={disabled}
        onValueChange={(values) => {
          const value = Number(Array.isArray(values) ? values[0] : values);
          onColorChange({
            ...color,
            [hue ? "h" : "a"]: hue ? value : value / 100,
          });
        }}
        className="[&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-track]]:bg-[image:var(--color-gradient)]"
        style={
          { "--color-gradient": gradient } as ComponentProps<
            typeof Slider
          >["style"]
        }
      />
    </div>
  );
}
interface ColorPickerSwatchesProps {
  value: string;
  swatches: readonly string[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  alpha?: boolean;
  label?: string;
  className?: string;
}
function ColorPickerSwatches({
  value,
  swatches,
  onValueChange,
  disabled,
  alpha,
  label = defaultLabels.swatches,
  className,
}: ColorPickerSwatchesProps) {
  const normalized = [
    ...new Set(
      swatches.flatMap((swatch) => {
        const parsed = parseHexColor(swatch);
        return parsed ? [colorToHex(parsed, alpha)] : [];
      }),
    ),
  ];
  if (!normalized.length) return null;
  return (
    <fieldset
      aria-label={label}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {normalized.map((swatch) => (
        <Button
          key={swatch}
          type="button"
          glass={false}
          variant="outline"
          size="icon-sm"
          aria-label={swatch}
          aria-pressed={swatch === value}
          disabled={disabled}
          onClick={() => onValueChange(swatch)}
          className="relative overflow-hidden rounded-full aria-pressed:ring-2 aria-pressed:ring-ring aria-pressed:ring-offset-2 aria-pressed:ring-offset-background"
          style={{ background: checker }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background: colorToCSS(parseHexColor(swatch) ?? defaultColor),
            }}
          />
        </Button>
      ))}
    </fieldset>
  );
}

export { ColorPicker, ColorPickerArea, ColorPickerSlider, ColorPickerSwatches };
