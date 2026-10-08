import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  runThemeTransition,
  ThemeIcon,
} from "@workspace/ui/components/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { useReducedMotion } from "@workspace/ui/hooks/use-reduced-motion";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../lib/i18n";
import { applyAccent, readAccent, type ThemeMode } from "../lib/theme";

export function ThemeModeMenu({ locale }: { locale: Locale }) {
  const zh = locale === "zh-CN";
  const { theme, setTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => setReady(true), []);
  const selected = ready ? (theme ?? "system") : "system";
  const mode: ThemeMode =
    selected === "dark" || selected === "light" ? selected : "system";
  const label = zh ? "外观模式" : "Appearance";
  const modes = [
    { value: "light", label: zh ? "浅色" : "Light" },
    { value: "dark", label: zh ? "深色" : "Dark" },
    { value: "system", label: zh ? "跟随系统" : "System" },
  ] as const;

  function chooseMode(next: string) {
    if (next !== "light" && next !== "dark" && next !== "system") return;
    if (next === mode) return;
    const change = () => {
      const dark =
        next === "dark" ||
        (next === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
      applyAccent(readAccent(), dark);
      setTheme(next);
    };
    if (!triggerRef.current) {
      change();
      return;
    }
    runThemeTransition(change, {
      button: triggerRef.current,
      variant: "circle",
      start: "button",
      reducedMotion: reduced,
    });
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <DropdownMenuTrigger
          render={
            <TooltipTrigger
              render={
                <Button
                  ref={triggerRef}
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!ready}
                  aria-label={label}
                  data-slot="theme-mode-trigger"
                />
              }
            />
          }
        >
          <ThemeIcon key={ready ? "resolved" : "unresolved"} theme={mode} />
        </DropdownMenuTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" sideOffset={12}>
        <DropdownMenuRadioGroup value={mode} onValueChange={chooseMode}>
          {modes.map((item) => (
            <DropdownMenuRadioItem
              key={item.value}
              value={item.value}
              className="focus:bg-muted focus:text-foreground focus:**:text-foreground data-checked:bg-primary data-checked:text-primary-foreground data-checked:focus:bg-primary data-checked:focus:text-primary-foreground data-checked:focus:**:text-primary-foreground"
            >
              <ThemeIcon theme={item.value} size={16} className="size-4" />
              {item.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
