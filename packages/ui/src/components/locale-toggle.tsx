"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@workspace/ui/components/select";
import { cva } from "class-variance-authority";
import { cn } from "cn";
import {
  type ComponentProps,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { mergeClassNames } from "../lib/class-name";
import { createMorph, type Morph, morphToCompletion } from "./morph-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

type LocaleOption = { value: string; label: string; indicatorPath?: string };
type LocaleToggleProps = Omit<
  ComponentProps<typeof Button>,
  "children" | "value" | "variant"
> & {
  value: string;
  onValueChange: (value: string) => void | Promise<void>;
  options: readonly LocaleOption[];
  label?: string;
  mode?: "auto" | "toggle" | "select";
  glass?: boolean;
};
const localeToggleVariants = cva("text-foreground", {
  variants: { glass: { true: "", false: "" } },
  defaultVariants: { glass: false },
});
const languagePaths: Readonly<Record<string, string>> = {
  zh: "M3.5 6.5 L10.5 6.5 M10.5 6.5 L3.5 17.5 M3.5 17.5 L10.5 17.5 M7 12 L7 12 M13.5 6.5 L13.5 17.5 M20.5 6.5 L20.5 17.5 M13.5 12 L20.5 12",
  en: "M3.5 6.5 L10.5 6.5 M3.5 6.5 L3.5 17.5 M3.5 17.5 L10.5 17.5 M3.5 12 L9.5 12 M13.5 6.5 L13.5 17.5 M20.5 6.5 L20.5 17.5 M13.5 6.5 L20.5 17.5",
  fr: "M3.5 17.5v-11h7M3.5 12h6M13.5 17.5v-11H17Q20.5 6.5 20.5 9.5T17 12.5h-3.5M17 12.5l4 5",
  de: "M3.5 17.5v-11h3Q11 6.5 11 12t-4.5 5.5h-3M20.5 6.5h-7v11h7M13.5 12h6",
  ja: "M4 6.5h6.5M8.5 6.5V14Q8.5 17.5 5.5 17.5t-3-3M12.5 17.5l4-11 4 11M14 13.5h5",
  ru: "M3.5 17.5v-11H7Q10.5 6.5 10.5 9.5T7 12.5H3.5M7 12.5l4 5M13.5 6.5V14Q13.5 17.5 17 17.5t3.5-3.5V6.5",
};
const genericLanguagePath =
  "m5 8 6 6 m-7 0 6-6 2-3 M2 5h12 M7 2h1 m14 20-5-10-5 10 M14 18h6";
function indicatorPath(option?: LocaleOption) {
  return (
    option?.indicatorPath ??
    languagePaths[option?.value.split("-")[0]?.toLowerCase() ?? ""] ??
    genericLanguagePath
  );
}
type LocaleMorphHandle = {
  preview: (path: string) => Promise<boolean>;
  restore: (path: string) => void;
};
function LocaleIndicator({
  option,
  handle,
}: {
  option?: LocaleOption;
  handle: Ref<LocaleMorphHandle>;
}) {
  const path = indicatorPath(option);
  const initialPath = useRef(path);
  const pathRef = useRef<SVGPathElement>(null);
  const morphRef = useRef<Morph | null>(null);
  const completion = useRef<ReturnType<typeof morphToCompletion> | null>(null);
  useEffect(() => {
    if (!pathRef.current) return;
    const morph = createMorph(pathRef.current, initialPath.current, {
      reducedMotion: "user",
    });
    morphRef.current = morph;
    return () => {
      completion.current?.cancel();
      morph.destroy();
      morphRef.current = null;
    };
  }, []);
  useEffect(() => {
    completion.current?.cancel();
    morphRef.current?.morphTo(path, "snappy");
  }, [path]);
  useImperativeHandle(
    handle,
    () => ({
      preview: (target) => {
        completion.current?.cancel();
        if (!morphRef.current || !pathRef.current)
          return Promise.resolve(false);
        const animation = morphToCompletion(
          morphRef.current,
          pathRef.current,
          target,
        );
        completion.current = animation;
        return animation.finished;
      },
      restore: (target) => {
        completion.current?.cancel();
        if (document.hidden) morphRef.current?.set(target);
        else morphRef.current?.morphTo(target, "snappy");
      },
    }),
    [],
  );
  return (
    <svg
      aria-hidden="true"
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4 shrink-0"
      data-slot="locale-toggle-icon"
      data-locale={option?.value}
    >
      <path ref={pathRef} d={initialPath.current} />
    </svg>
  );
}

function LocaleToggle({
  mode = "auto",
  value,
  onValueChange,
  options,
  label = "Change language",
  disabled = false,
  glass,
  className,
  onClick,
  size = "icon",
  ...props
}: LocaleToggleProps) {
  const [changing, setChanging] = useState(false);
  const pending = useRef<object | null>(null);
  const indicatorRef = useRef<LocaleMorphHandle>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current = null;
    };
  }, []);
  const unique = options.filter(
    (option, index) =>
      options.findIndex((item) => item.value === option.value) === index,
  );
  const selectedIndex = unique.findIndex((option) => option.value === value);
  const selected = unique[selectedIndex];
  const next = unique[(selectedIndex + 1) % unique.length];
  const currentPath = indicatorPath(selected ?? unique[0]);
  useEffect(() => {
    if (!changing) indicatorRef.current?.restore(currentPath);
  }, [changing, currentPath]);
  async function change(nextValue: string) {
    if (pending.current || disabled || nextValue === value) return;
    const request = {};
    pending.current = request;
    setChanging(true);
    try {
      const target = unique.find((option) => option.value === nextValue);
      const completed = await indicatorRef.current?.preview(
        indicatorPath(target),
      );
      if (!completed || !mounted.current || pending.current !== request) return;
      await onValueChange(nextValue);
    } catch {
      // The application callback reports navigation or persistence errors.
    } finally {
      if (mounted.current && pending.current === request) {
        pending.current = null;
        setChanging(false);
      }
    }
  }
  const indicator = (
    <LocaleIndicator option={selected ?? unique[0]} handle={indicatorRef} />
  );
  if (mode === "toggle" || (mode === "auto" && unique.length <= 2)) {
    const name = next ? `${label}: ${next.label}` : label;
    const accessibleName = props["aria-label"] ?? name;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            data-slot="locale-toggle"
            render={
              <Button
                {...props}
                type="button"
                variant="ghost"
                size={size}
                glass={glass}
                className={mergeClassNames(
                  cn(
                    localeToggleVariants({ glass }),
                    changing && !disabled && "disabled:opacity-100",
                  ),
                  className,
                )}
                aria-label={accessibleName}
                aria-pressed={
                  unique.length === 2 ? value === unique[1]?.value : undefined
                }
                aria-busy={changing}
                disabled={disabled || changing || unique.length < 2}
                onClick={(event) => {
                  onClick?.(event);
                  if (!event.defaultPrevented && next) void change(next.value);
                }}
              />
            }
          >
            {indicator}
          </TooltipTrigger>
          <TooltipContent>{accessibleName}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  const name = props["aria-label"] ?? `${label}: ${selected?.label ?? value}`;
  return (
    <Select
      glass={glass}
      value={value}
      disabled={disabled || changing || unique.length === 0}
      items={Object.fromEntries(
        unique.map((option) => [option.value, option.label]),
      )}
      onValueChange={(nextValue) => {
        if (nextValue !== null) void change(nextValue);
      }}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            data-slot="locale-toggle"
            render={
              <SelectTrigger
                {...props}
                type="button"
                glass={glass}
                aria-label={name}
                aria-busy={changing}
                onClick={onClick}
                className={mergeClassNames(
                  cn(
                    localeToggleVariants({ glass }),
                    "size-9 justify-center bg-transparent p-0 hover:bg-muted/50 [&>svg:last-child]:hidden",
                    changing && !disabled && "disabled:opacity-100",
                  ),
                  className,
                )}
              />
            }
          >
            {indicator}
          </TooltipTrigger>
          <TooltipContent>{name}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <SelectContent>
        <SelectGroup>
          {unique.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export type { LocaleOption, LocaleToggleProps };
export { LocaleToggle, localeToggleVariants };
