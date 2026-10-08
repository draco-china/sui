"use client";

import { Button } from "@workspace/ui/components/button";
import { cva } from "class-variance-authority";
import { cn } from "cn";
import type { ComponentProps, ReactNode } from "react";
import { flushSync } from "react-dom";
import { useReducedMotion } from "../hooks/use-reduced-motion";
import { type IconNode, MorphIcon, type MorphIconProps } from "./morph-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

type ThemeVariant = "rectangle" | "circle" | "circle-blur" | "blinds";
type ThemeRevealStart =
  | "button"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center"
  | "bottom-up";
type ThemeToggleProps = Omit<
  ComponentProps<typeof Button>,
  "children" | "variant"
> & {
  theme: "light" | "dark";
  onThemeChange: (theme: "light" | "dark") => void;
  variant?: ThemeVariant;
  start?: ThemeRevealStart;
  lightLabel?: string;
  darkLabel?: string;
  lightIcon?: ReactNode;
  darkIcon?: ReactNode;
  iconClassName?: string;
  glass?: boolean;
};

const sunIcon: IconNode = [
  ["circle", { cx: 12, cy: 12, r: 4 }],
  ["path", { d: "M12 2v2" }],
  ["path", { d: "M12 20v2" }],
  ["path", { d: "m4.93 4.93 1.41 1.41" }],
  ["path", { d: "m17.66 17.66 1.41 1.41" }],
  ["path", { d: "M2 12h2" }],
  ["path", { d: "M20 12h2" }],
  ["path", { d: "m6.34 17.66-1.41 1.41" }],
  ["path", { d: "m19.07 4.93-1.41 1.41" }],
];
const moonIcon: IconNode = [
  [
    "path",
    {
      d: "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",
    },
  ],
];

const monitorIcon: IconNode = [
  ["rect", { width: 20, height: 14, x: 2, y: 3, rx: 2 }],
  ["path", { d: "M12 17v4 M8 21h8" }],
];
const themeIcons = { light: sunIcon, dark: moonIcon, system: monitorIcon };
type ThemeIconProps = Omit<
  MorphIconProps,
  "icon" | "from" | "to" | "progress"
> & {
  theme: "light" | "dark" | "system";
};
function ThemeIcon({ theme, className, ...props }: ThemeIconProps) {
  return (
    <MorphIcon
      icon={themeIcons[theme]}
      size={16}
      strokeWidth={2}
      data-slot="theme-toggle-icon"
      data-theme={theme}
      className={cn("size-4", className)}
      {...props}
    />
  );
}
type ThemeTransitionOptions = {
  button: HTMLElement;
  variant?: ThemeVariant;
  start?: ThemeRevealStart;
  reducedMotion?: boolean;
};

const themeToggleVariants = cva("relative text-foreground", {
  variants: { glass: { true: "", false: "" } },
  defaultVariants: { glass: false },
});
const transitionOwners = new WeakMap<HTMLElement, object>();

function revealPoint(start: ThemeRevealStart, button: HTMLElement) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (start === "button") {
    const bounds = button.getBoundingClientRect();
    return {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    };
  }
  let x = width / 2;
  let y = height / 2;
  if (start.endsWith("left")) x = 0;
  else if (start.endsWith("right")) x = width;
  if (start.startsWith("top")) y = 0;
  else if (start.startsWith("bottom")) y = height;
  return { x, y };
}

function runThemeTransition(
  change: () => void,
  {
    button,
    variant = "rectangle",
    start = "bottom-up",
    reducedMotion = typeof window === "undefined" ||
      (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? true),
  }: ThemeTransitionOptions,
) {
  if (
    reducedMotion ||
    typeof document === "undefined" ||
    typeof document.startViewTransition !== "function"
  ) {
    change();
    return;
  }
  const root = document.documentElement;
  const owner = {};
  const { x, y } = revealPoint(start, button);
  transitionOwners.set(root, owner);
  root.dataset.appearanceTransition = variant;
  root.style.setProperty("--appearance-x", `${x}px`);
  root.style.setProperty("--appearance-y", `${y}px`);
  root.style.setProperty(
    "--appearance-clip",
    start === "bottom-up"
      ? "inset(100% 0 0 0)"
      : `inset(${y}px ${window.innerWidth - x}px ${window.innerHeight - y}px ${x}px)`,
  );
  const clear = () => {
    if (transitionOwners.get(root) !== owner) return;
    transitionOwners.delete(root);
    delete root.dataset.appearanceTransition;
    for (const name of [
      "--appearance-x",
      "--appearance-y",
      "--appearance-clip",
    ])
      root.style.removeProperty(name);
  };
  let applied = false;
  try {
    const transition = document.startViewTransition(() => {
      applied = true;
      flushSync(() => change());
    });
    transition.finished.then(clear, clear);
  } catch {
    clear();
    if (!applied) change();
  }
}

function ThemeToggle({
  theme,
  onThemeChange,
  variant = "rectangle",
  start = "bottom-up",
  lightLabel = "Switch to light mode",
  darkLabel = "Switch to dark mode",
  lightIcon,
  darkIcon,
  iconClassName,
  glass,
  className,
  onClick,
  size = "icon",
  ...props
}: ThemeToggleProps) {
  const reduced = useReducedMotion();
  const next = theme === "dark" ? "light" : "dark";
  const label =
    props["aria-label"] ?? (theme === "dark" ? lightLabel : darkLabel);
  const icon = (
    <ThemeIcon theme={theme} className={cn("size-4", iconClassName)} />
  );
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          data-slot="theme-toggle"
          render={
            <Button
              {...props}
              type="button"
              variant="ghost"
              size={size}
              glass={glass}
              aria-label={label}
              aria-pressed={theme === "dark"}
              className={cn(themeToggleVariants({ glass }), className)}
              onClick={(event) => {
                onClick?.(event);
                if (!event.defaultPrevented)
                  runThemeTransition(() => onThemeChange(next), {
                    button: event.currentTarget,
                    variant,
                    start,
                    reducedMotion: reduced,
                  });
              }}
            />
          }
        >
          {lightIcon != null || darkIcon != null ? (
            <span
              aria-hidden="true"
              className={cn(
                "relative flex size-4 items-center justify-center",
                iconClassName,
              )}
            >
              <span hidden={theme !== "light"}>{lightIcon ?? icon}</span>
              <span hidden={theme !== "dark"}>{darkIcon ?? icon}</span>
            </span>
          ) : (
            icon
          )}
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export type {
  ThemeIconProps,
  ThemeRevealStart,
  ThemeToggleProps,
  ThemeTransitionOptions,
  ThemeVariant,
};
export { runThemeTransition, ThemeIcon, ThemeToggle, themeToggleVariants };
