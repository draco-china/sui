import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { GlassProvider } from "@workspace/ui/components/glass";
import { Input } from "@workspace/ui/components/input";
import { Switch } from "@workspace/ui/components/switch";
import { Toggle } from "@workspace/ui/components/toggle";
import { gsap } from "gsap";
import {
  ArrowUpRight,
  Bell,
  Check,
  Folder,
  Home,
  Layers,
  Settings,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "../lib/i18n";
import { defaultThemePalette, themePresets } from "../lib/theme";
import { HomeTabBarPreview } from "./home-tab-bar-preview";
import { Logo } from "./logo";

export function HomeGlassPreview({ locale }: { locale: Locale }) {
  const zh = locale === "zh-CN";
  const { resolvedTheme } = useTheme();
  const scene = useRef<HTMLDivElement>(null);
  const nameId = useId();
  const updatesId = useId();
  const [glass, setGlass] = useState(true);
  const [value, setValue] = useState("home");
  const [saved, setSaved] = useState(false);
  const saveLabel = saved ? "saved" : "save";
  const labels = zh
    ? {
        saved: "已保存",
        save: "保存设置",
        feedback: "设置已在此预览中更新",
        default: "默认",
      }
    : {
        saved: "Saved",
        save: "Save changes",
        feedback: "Your preview preferences are updated",
        default: "Default",
      };
  const items = [
    { value: "home", label: zh ? "首页" : "Home", icon: <Home /> },
    { value: "projects", label: zh ? "项目" : "Projects", icon: <Folder /> },
    { value: "activity", label: zh ? "动态" : "Activity", icon: <Bell /> },
    { value: "settings", label: zh ? "设置" : "Settings", icon: <Settings /> },
  ];

  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let timeline: gsap.core.Timeline;
    let colors: gsap.core.Timeline;
    const animation = gsap.context(() => {
      const palettes = [
        defaultThemePalette(resolvedTheme === "dark"),
        ...themePresets.map((preset) => preset.palette),
      ];
      const properties = (palette: readonly string[]) =>
        Object.fromEntries(
          palette.map((color, index) => [`--home-palette-${index + 1}`, color]),
        );
      gsap.set(element, properties(palettes[0]));
      colors = gsap.timeline({ paused: true, repeat: -1 });
      for (const palette of [...palettes.slice(1), palettes[0]]) {
        colors.to(element, {
          ...properties(palette),
          duration: 6,
          delay: 2,
          ease: "sine.inOut",
        });
      }
      timeline = gsap.timeline({ paused: true, repeat: -1, yoyo: true });
      timeline.to(".home-glass-artwork", {
        x: 16,
        y: -20,
        rotation: 8,
        scale: 1.05,
        duration: 18,
        ease: "sine.inOut",
      });
    }, element);
    const sync = () => {
      if (visible && !document.hidden && !reduced.matches) {
        timeline.play();
        colors.play();
      } else {
        timeline.pause();
        colors.pause();
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      animation.revert();
    };
  }, [resolvedTheme]);

  return (
    <GlassProvider mode="css" captureTarget={scene} intensity="sm">
      <div ref={scene} className="home-glass-scene">
        <div className="home-glass-backdrop" aria-hidden="true">
          <div className="home-glass-artwork">
            <div className="home-glass-flow-color" />
            <img
              className="home-glass-flow-light"
              src="/images/home-glass-flow.png"
              width={1254}
              height={1254}
              alt=""
              decoding="async"
            />
          </div>
        </div>
        <div className="home-glass-stack">
          <div className="flex items-center justify-between gap-3 px-2">
            <span className="font-medium text-muted-foreground text-xs tracking-wide">
              {zh ? "同一界面，两种质感" : "One interface. Two textures."}
            </span>
            <Toggle
              variant="outline"
              size="sm"
              glass={glass}
              pressed={glass}
              onPressedChange={setGlass}
              aria-label={zh ? "玻璃材质" : "Glass material"}
            >
              <Layers />
              {glass ? "Glass" : labels.default}
            </Toggle>
          </div>
          <Card glass={glass} className="w-full gap-5">
            <CardHeader>
              <div className="mb-5 flex items-center justify-between">
                <Logo markOnly className="text-primary" />
                <span className="font-mono text-muted-foreground text-xs">
                  SUI / STUDIO
                </span>
              </div>
              <CardTitle className="text-2xl tracking-tight">
                {zh ? "让界面，成为你的" : "Make it yours"}
              </CardTitle>
              <CardDescription>
                {zh
                  ? "细节可见，交互可感"
                  : "Details you see. Interactions you feel."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSaved(true);
                }}
              >
                <div className="grid gap-2">
                  <label className="font-medium text-sm" htmlFor={nameId}>
                    {zh ? "工作区名称" : "Workspace name"}
                  </label>
                  <Input
                    glass={glass}
                    id={nameId}
                    defaultValue="Design studio"
                    required
                    onChange={() => setSaved(false)}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 py-1">
                  <div className="grid gap-1">
                    <label className="font-medium text-sm" htmlFor={updatesId}>
                      {zh ? "产品更新" : "Product updates"}
                    </label>
                    <p className="text-muted-foreground text-xs">
                      {zh ? "不错过新的灵感" : "Keep the inspiration coming"}
                    </p>
                  </div>
                  <Switch
                    glass={false}
                    id={updatesId}
                    defaultChecked
                    onCheckedChange={() => setSaved(false)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    glass={glass}
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setValue("projects");
                      setSaved(false);
                    }}
                  >
                    <Folder />
                    {zh ? "我的项目" : "Projects"}
                  </Button>
                  <Button type="submit" glass={glass} glassIntensity="lg">
                    {saved ? <Check /> : <ArrowUpRight />}
                    {labels[saveLabel]}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
          <HomeTabBarPreview
            glass={glass}
            size="sm"
            aria-label={zh ? "首页组件预览导航" : "Homepage preview navigation"}
            items={items}
            value={value}
            onValueChange={setValue}
            className="mx-auto w-fit max-w-full"
          />
          <p
            className="min-h-5 text-center text-muted-foreground text-xs"
            role="status"
          >
            {saved
              ? labels.feedback
              : items.find((item) => item.value === value)?.label}
          </p>
        </div>
      </div>
    </GlassProvider>
  );
}
