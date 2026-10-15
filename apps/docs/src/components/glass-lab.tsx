"use client";

import { Button } from "@workspace/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import {
  type GlassConfig,
  type GlassMaterial,
  type GlassMode,
  type GlassOptions,
  refreshGlass,
} from "@workspace/ui/components/glass";
import { Input } from "@workspace/ui/components/input";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";
import { Slider } from "@workspace/ui/components/slider";
import { Switch } from "@workspace/ui/components/switch";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import {
  glassDefaults,
  glassMaterials,
} from "@workspace/ui/lib/glass/defaults";
import { cn } from "cn";
import {
  ImageIcon,
  Layers3,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  type ComponentProps,
  type ComponentType,
  type CSSProperties,
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { withGlass } from "../../../../packages/ui/src/lib/glass/context";
import { examples } from "../examples";
import type { ExampleProps } from "../examples/types";
import { glassLabCatalog } from "../lib/glass-lab";
import {
  GlassStateCases,
  GlassTabBarCase,
  GlassToastCase,
  GlassToggleGroupCase,
  GlassTooltipCase,
} from "./glass-lab-cases";
import { RenderingStatus } from "./glass-lab-rendering";
import { GlassLabSkeleton } from "./glass-lab-skeleton";
import { GlassRefractionProbe } from "./glass-refraction-probe";

const Scope = withGlass(
  (props: ComponentProps<"div">) => <div {...props} />,
  "scope",
);
const demos = new Map<
  string,
  ReturnType<typeof lazy<ComponentType<ExampleProps>>>
>();
const specialCases: Record<string, ComponentType<ExampleProps>> = {
  command: lazy(() => import("./glass-command-case")),
  glass: GlassStateCases,
  "tab-bar": GlassTabBarCase,
  toast: GlassToastCase,
  "toggle-group": GlassToggleGroupCase,
  tooltip: GlassTooltipCase,
};
const defaultOptions: GlassOptions = {
  strength: glassDefaults.strength,
  highlight: glassDefaults.highlight,
};
const initialLoaded = ["accordion", "button", "input", "glass"];
type Background = "coast-video" | "waves-video";
const mediaBackgrounds: Record<Background, { image: string; video?: string }> =
  {
    "coast-video": {
      image: "/playground/backgrounds/coast-poster.jpg",
      video: "/playground/backgrounds/coast.mp4",
    },
    "waves-video": {
      image: "/playground/backgrounds/waves-poster.jpg",
      video: "/playground/backgrounds/waves.mp4",
    },
  };

function Controls({ children, title }: { children: ReactNode; title: string }) {
  return (
    <Sidebar
      collapsible="offcanvas"
      className="min-h-0 overflow-hidden md:relative md:h-full md:rounded-2xl md:border"
      aria-label={title}
    >
      <SidebarHeader className="border-b px-5 py-4">
        <h2 className="font-semibold text-sm tracking-tight">{title}</h2>
      </SidebarHeader>
      <SidebarContent className="gap-0 pb-2">{children}</SidebarContent>
    </Sidebar>
  );
}

function ControlGroup({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <SidebarGroup className="gap-3 border-b px-5 py-4 last:border-b-0">
      <SidebarGroupLabel className="h-auto gap-2 rounded-none p-0 text-muted-foreground">
        {icon}
        {title}
      </SidebarGroupLabel>
      <SidebarGroupContent className="grid gap-4">
        {children}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function getDemo(entry: (typeof glassLabCatalog)[number]) {
  if (specialCases[entry.slug]) return specialCases[entry.slug];
  if (!entry.demo) return undefined;
  let Demo = demos.get(entry.demo);
  if (!Demo) {
    Demo = lazy(examples[entry.demo]);
    demos.set(entry.demo, Demo);
  }
  return Demo;
}

function Parameter({
  label,
  value,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <Field>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel htmlFor={id} className="text-xs">
          {label}
        </FieldLabel>
        <output className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground text-xs tabular-nums">
          {value}
          {suffix}
        </output>
      </div>
      <Slider
        id={id}
        aria-label={label}
        min={0}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
      />
    </Field>
  );
}

function LabEntry({
  entry,
  locale = "en-US",
}: {
  entry: (typeof glassLabCatalog)[number];
  locale: ExampleProps["locale"];
}) {
  const section = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState(() =>
    initialLoaded.includes(entry.slug),
  );
  useEffect(() => {
    if (loaded || !section.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((item) => item.isIntersecting)) {
          setLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px" },
    );
    observer.observe(section.current);
    return () => observer.disconnect();
  }, [loaded]);
  const Demo = loaded ? getDemo(entry) : undefined;
  return (
    <section
      ref={section}
      className="mb-8 inline-block w-full min-w-0 break-inside-avoid align-top"
      data-lab-component={entry.slug}
      aria-label={entry.name}
    >
      <div
        className="justify-center-safe flex min-h-24 min-w-0 items-center [&>*]:min-w-0 [&>*]:max-w-full [&>div:not([data-slot])]:py-0"
        data-lab-preview={loaded ? "loaded" : "deferred"}
      >
        <Suspense fallback={<GlassLabSkeleton slug={entry.slug} />}>
          {Demo ? (
            <Demo locale={locale} />
          ) : (
            <GlassLabSkeleton slug={entry.slug} />
          )}
        </Suspense>
      </div>
    </section>
  );
}

function Gallery({
  entries,
  locale = "en-US",
  enabled,
  ordinary = false,
  glassConfig,
}: {
  entries: typeof glassLabCatalog;
  locale: ExampleProps["locale"];
  enabled: boolean;
  ordinary?: boolean;
  glassConfig?: GlassConfig;
}) {
  const zh = locale === "zh-CN";
  const label = ordinary ? "ordinary" : "gallery";
  const labels = zh
    ? { ordinary: "普通样式", gallery: "组件展示" }
    : { ordinary: "Ordinary comparison", gallery: "Component gallery" };
  return (
    <div
      className="@container min-w-0"
      data-lab-appearance={ordinary ? "ordinary" : "glass"}
    >
      {ordinary && (
        <p className="mb-3 font-medium text-muted-foreground text-xs">
          {labels[label]}
        </p>
      )}
      <div data-lab-container>
        <Scope
          glass={enabled && !ordinary}
          glassConfig={glassConfig}
          className="min-w-0 @min-[40rem]:columns-2 @min-[64rem]:columns-3 columns-1 gap-8"
        >
          {entries.map((entry) => (
            <LabEntry key={entry.slug} entry={entry} locale={locale} />
          ))}
          {entries.length === 0 && (
            <p role="status" className="p-6 text-center text-muted-foreground">
              {zh ? "没有匹配的组件" : "No matching components"}
            </p>
          )}
        </Scope>
      </div>
    </div>
  );
}

export function GlassLab({ locale = "en-US" }: ExampleProps) {
  const zh = locale === "zh-CN";
  const scene = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const id = useId();
  const [mode, setMode] = useState<GlassMode>("auto");
  const [material, setMaterial] = useState<GlassMaterial>("clear");
  const [options, setOptions] = useState<GlassOptions>(defaultOptions);
  const glassConfig: GlassConfig = {
    mode,
    material,
    options,
    captureTarget: scene,
  };
  const [enabled, setEnabled] = useState(true);
  const [compare, setCompare] = useState(false);
  const [showProbe, setShowProbe] = useState(true);
  const previousStrength = useRef<number>(glassDefaults.strength);
  const [background, setBackground] = useState<Background>("coast-video");
  const [playing, setPlaying] = useState(true);
  const media = mediaBackgrounds[background];
  const videoLabels = zh
    ? { play: "播放背景视频", pause: "暂停背景视频" }
    : { play: "Play background video", pause: "Pause background video" };
  useEffect(() => {
    if (!media?.video) return;
    const player = video.current;
    if (playing) void player?.play().catch(() => setPlaying(false));
    else player?.pause();
  }, [media?.video, playing]);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filtered = glassLabCatalog.filter((entry) => {
    return `${entry.name} ${entry.slug} ${entry.description[locale]}`
      .toLowerCase()
      .includes(query);
  });
  const parameter = (name: keyof GlassOptions, value: number) => {
    if (name === "strength" && value > 0) previousStrength.current = value;
    setOptions((current) => ({ ...current, [name]: value }));
  };
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "19rem" } as CSSProperties}
      className="not-prose grid h-full min-h-0 gap-6 md:grid-cols-[19rem_minmax(0,1fr)] md:gap-5 [&>[data-slot=sidebar]]:min-h-0"
      data-slot="glass-lab"
    >
      <Controls title={zh ? "外观设置" : "Appearance settings"}>
        <ControlGroup title={zh ? "材质" : "Material"} icon={<Layers3 />}>
          <Field>
            <FieldLabel className="sr-only">
              {zh ? "组件材质" : "Component material"}
            </FieldLabel>
            <ToggleGroup
              variant="outline"
              className="w-full [&>*]:flex-1"
              value={[enabled ? "glass" : "ordinary"]}
              onValueChange={(values) => {
                if (values[0]) setEnabled(values[0] === "glass");
              }}
              aria-label={zh ? "组件材质" : "Component material"}
            >
              <ToggleGroupItem value="ordinary">
                {zh ? "普通" : "Ordinary"}
              </ToggleGroupItem>
              <ToggleGroupItem value="glass">Glass</ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <Field>
            <FieldLabel className="sr-only">
              {zh ? "玻璃材质" : "Glass material"}
            </FieldLabel>
            <ToggleGroup
              variant="outline"
              className="w-full [&>*]:flex-1"
              value={[material]}
              onValueChange={(values) => {
                if (values[0]) setMaterial(values[0] as GlassMaterial);
              }}
              aria-label={zh ? "玻璃材质" : "Glass material"}
            >
              <ToggleGroupItem value="clear">
                {zh ? "清透" : "Clear"}
              </ToggleGroupItem>
              <ToggleGroupItem value="regular">
                {zh ? "常规" : "Regular"}
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <Field orientation="horizontal" className="justify-between">
            <FieldLabel htmlFor={`${id}-compare`} className="text-xs">
              {zh ? "并排对比普通样式" : "Show ordinary comparison"}
            </FieldLabel>
            <Switch
              id={`${id}-compare`}
              checked={compare}
              onCheckedChange={setCompare}
            />
          </Field>
          <Field orientation="horizontal" className="justify-between">
            <FieldLabel htmlFor={`${id}-probe`} className="text-xs">
              {zh ? "显示折射镜片" : "Show refraction lens"}
            </FieldLabel>
            <Switch
              id={`${id}-probe`}
              checked={showProbe}
              onCheckedChange={setShowProbe}
            />
          </Field>
        </ControlGroup>
        <ControlGroup title={zh ? "背景" : "Background"} icon={<ImageIcon />}>
          <Field>
            <FieldLabel htmlFor={`${id}-background`} className="sr-only">
              {zh ? "测试背景" : "Test background"}
            </FieldLabel>
            <ToggleGroup
              id={`${id}-background`}
              aria-label={zh ? "测试背景" : "Test background"}
              variant="outline"
              size="sm"
              className="w-full [&>*]:min-w-0 [&>*]:flex-1"
              value={[background]}
              onValueChange={(values) => {
                if (values[0]) setBackground(values[0] as Background);
              }}
            >
              <ToggleGroupItem value="coast-video">
                {zh ? "海岸 · 视频" : "Coast · Video"}
              </ToggleGroupItem>
              <ToggleGroupItem value="waves-video">
                {zh ? "海浪 · 视频" : "Waves · Video"}
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>
          {media && (
            <div className="relative overflow-hidden rounded-lg">
              <img
                src={media.image}
                alt=""
                className="aspect-[16/7] w-full object-cover"
              />
              {media.video && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute right-2 bottom-2"
                  onClick={() => setPlaying((value) => !value)}
                >
                  {videoLabels[playing ? "pause" : "play"]}
                </Button>
              )}
            </div>
          )}
        </ControlGroup>
        <ControlGroup
          title={zh ? "光学参数" : "Optical properties"}
          icon={<SlidersHorizontal />}
        >
          <FieldGroup className="gap-4">
            <Field orientation="horizontal" className="justify-between">
              <FieldLabel htmlFor={`${id}-refraction`} className="text-xs">
                {zh ? "启用折射" : "Enable refraction"}
              </FieldLabel>
              <Switch
                id={`${id}-refraction`}
                checked={(options.strength ?? glassDefaults.strength) > 0}
                onCheckedChange={(checked) => {
                  const strength = options.strength ?? glassDefaults.strength;
                  if (!checked && strength > 0)
                    previousStrength.current = strength;
                  parameter("strength", checked ? previousStrength.current : 0);
                }}
              />
            </Field>
            <Parameter
              label={zh ? "透明度" : "Transparency"}
              value={Math.round(
                (1 -
                  (options.tintOpacity ??
                    glassMaterials[material].tintOpacity)) *
                  100,
              )}
              max={100}
              suffix="%"
              onChange={(value) => parameter("tintOpacity", 1 - value / 100)}
            />
            <Parameter
              label={zh ? "折射强度" : "Refraction strength"}
              value={options.strength ?? glassDefaults.strength}
              max={64}
              onChange={(value) => parameter("strength", value)}
            />
            <Parameter
              label={zh ? "边缘高光" : "Edge highlight"}
              value={options.highlight ?? glassDefaults.highlight}
              max={1}
              step={0.01}
              onChange={(value) => parameter("highlight", value)}
            />
          </FieldGroup>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              previousStrength.current = glassDefaults.strength;
              setOptions(defaultOptions);
            }}
          >
            <RotateCcw />
            {zh ? "恢复默认参数" : "Reset defaults"}
          </Button>
        </ControlGroup>
        <ControlGroup title={zh ? "渲染" : "Rendering"} icon={<Layers3 />}>
          <Field>
            <FieldLabel htmlFor={`${id}-mode`} className="sr-only">
              {zh ? "渲染方式" : "Rendering mode"}
            </FieldLabel>
            <ToggleGroup
              id={`${id}-mode`}
              aria-label={zh ? "渲染方式" : "Rendering mode"}
              variant="outline"
              size="sm"
              className="w-full [&>*]:min-w-0 [&>*]:flex-1"
              value={[mode]}
              onValueChange={(values) => {
                if (values[0]) setMode(values[0] as GlassMode);
              }}
            >
              <ToggleGroupItem value="auto">
                {zh ? "自动" : "Auto"}
              </ToggleGroupItem>
              <ToggleGroupItem value="svg">SVG</ToggleGroupItem>
              <ToggleGroupItem value="css">CSS</ToggleGroupItem>
            </ToggleGroup>
          </Field>
          <RenderingStatus scene={scene} zh={zh} />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => refreshGlass(scene)}
          >
            {zh ? "刷新效果" : "Refresh effect"}
          </Button>
        </ControlGroup>
      </Controls>
      <div className="flex min-h-0 min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger
              className="md:hidden"
              aria-label={zh ? "外观设置" : "Appearance settings"}
            />
            <div className="flex items-baseline gap-3">
              <h1 className="font-semibold text-xl tracking-tight">
                {zh ? "组件体验" : "Playground"}
              </h1>
              <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
                {filtered.length} / {glassLabCatalog.length}
              </span>
            </div>
          </div>
          <div className="relative ms-auto w-full min-w-0 sm:w-72">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label={zh ? "搜索组件" : "Search components"}
              placeholder={zh ? "搜索组件名称或用途…" : "Search components…"}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full ps-9"
            />
          </div>
        </div>
        <div
          ref={scene}
          className="relative isolate grid min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border"
          data-slot="glass-lab-scene"
          data-lab-material="individual"
          data-glass-capture={media ? "media" : undefined}
        >
          {media?.video && (
            <video
              key={media.video}
              ref={video}
              src={media.video}
              poster={media.image}
              muted
              loop
              playsInline
              autoPlay={playing}
              preload="metadata"
              tabIndex={-1}
              aria-hidden="true"
              data-glass-backdrop
              className="pointer-events-none absolute inset-0 size-full object-cover"
              onLoadedData={() => refreshGlass(scene)}
            />
          )}
          {media && !media.video && (
            <img
              src={media.image}
              alt=""
              data-glass-backdrop
              className="pointer-events-none absolute inset-0 size-full object-cover"
              onLoad={() => refreshGlass(scene)}
            />
          )}
          <div
            className={cn(
              "relative z-10 grid min-h-0 min-w-0 content-start gap-8 overflow-y-auto overscroll-contain p-5 sm:p-8",
              compare && "lg:grid-cols-2",
            )}
          >
            {compare && (
              <Gallery
                entries={filtered}
                locale={locale}
                enabled={false}
                ordinary
              />
            )}
            <Gallery
              entries={filtered}
              locale={locale}
              enabled={enabled}
              glassConfig={glassConfig}
            />
          </div>
          {enabled && showProbe && (
            <GlassRefractionProbe
              scene={scene}
              locale={locale}
              glassConfig={glassConfig}
            />
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
