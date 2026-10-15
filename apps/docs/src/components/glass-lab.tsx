"use client";

import { Button } from "@workspace/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import {
  type GlassConfig,
  type GlassEdge,
  type GlassMaterial,
  type GlassOptions,
  refreshGlass,
} from "@workspace/ui/components/glass";
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
  glassDefaultEdge,
  glassDefaults,
  glassMaterials,
} from "@workspace/ui/lib/glass/defaults";
import {
  Activity,
  ImageIcon,
  Layers3,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import {
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { withGlass } from "../../../../packages/ui/src/lib/glass/context";
import type { ExampleProps } from "../examples/types";
import { GlassLabBlocks } from "./glass-lab-blocks";
import { RenderingStatus } from "./glass-lab-rendering";
import { GlassRefractionProbe } from "./glass-refraction-probe";

const Scope = withGlass(
  (props: ComponentProps<"div">) => <div {...props} />,
  "scope",
);
const defaultOptions: GlassOptions = { strength: glassDefaults.strength };
type Background = "coast" | "waves";
const backgrounds: Record<Background, { image: string; video: string }> = {
  coast: {
    image: "/playground/backgrounds/coast-poster.jpg",
    video: "/playground/backgrounds/coast.mp4",
  },
  waves: {
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

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  return (
    <Field>
      <FieldLabel className="text-xs">{label}</FieldLabel>
      <ToggleGroup
        variant="outline"
        size="sm"
        className="w-full [&>*]:min-w-0 [&>*]:flex-1"
        value={[value]}
        onValueChange={(values) => {
          if (values[0]) onChange(values[0] as T);
        }}
        aria-label={label}
      >
        {options.map(([option, text]) => (
          <ToggleGroupItem key={option} value={option}>
            {text}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}

function Parameter({
  label,
  value,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
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
        value={[value]}
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
      />
    </Field>
  );
}

function SwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <Field orientation="horizontal" className="justify-between">
      <FieldLabel htmlFor={id} className="text-xs">
        {label}
      </FieldLabel>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </Field>
  );
}

/**
 * Glass in realistic blocks over live video, in the spirit of the shadcn/ui
 * themes page: settings on the left, the composed interface on the right.
 */
export function GlassLab({ locale = "en-US" }: ExampleProps) {
  const zh = locale === "zh-CN";
  const scene = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(true);
  const [material, setMaterial] = useState<GlassMaterial>("clear");
  const [edge, setEdge] = useState<GlassEdge>(glassDefaultEdge);
  const [options, setOptions] = useState<GlassOptions>(defaultOptions);
  const [showProbe, setShowProbe] = useState(false);
  const [background, setBackground] = useState<Background>("coast");
  const [playing, setPlaying] = useState(true);
  const previousStrength = useRef<number>(glassDefaults.strength);
  const media = backgrounds[background];
  const glassConfig: GlassConfig = { material, edge, options };
  useEffect(() => {
    const player = video.current;
    if (playing) void player?.play().catch(() => setPlaying(false));
    else player?.pause();
  }, [playing]);
  const strength = options.strength ?? glassDefaults.strength;
  const parameter = (name: keyof GlassOptions, value: number) => {
    if (name === "strength" && value > 0) previousStrength.current = value;
    setOptions((current) => ({ ...current, [name]: value }));
  };
  const title = zh ? "外观设置" : "Appearance settings";
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "19rem" } as CSSProperties}
      className="not-prose grid h-full min-h-0 gap-6 md:grid-cols-[19rem_minmax(0,1fr)] md:gap-5 [&>[data-slot=sidebar]]:min-h-0"
      data-slot="glass-lab"
    >
      <Controls title={title}>
        <ControlGroup title={zh ? "材质" : "Material"} icon={<Layers3 />}>
          <Choice
            label={zh ? "组件材质" : "Component material"}
            value={enabled ? "glass" : "ordinary"}
            options={[
              ["ordinary", zh ? "普通" : "Ordinary"],
              ["glass", "Glass"],
            ]}
            onChange={(value) => setEnabled(value === "glass")}
          />
          <Choice
            label={zh ? "玻璃材质" : "Glass material"}
            value={material}
            options={[
              ["clear", zh ? "清透" : "Clear"],
              ["regular", zh ? "常规" : "Regular"],
            ]}
            onChange={setMaterial}
          />
          <Choice
            label={zh ? "边缘光" : "Edge light"}
            value={edge}
            options={[
              ["diagonal", zh ? "对角" : "Diagonal"],
              ["vertical", zh ? "上下" : "Vertical"],
            ]}
            onChange={setEdge}
          />
          <SwitchField
            label={zh ? "显示折射镜片" : "Show refraction lens"}
            checked={showProbe}
            onChange={setShowProbe}
          />
        </ControlGroup>
        <ControlGroup title={zh ? "背景" : "Background"} icon={<ImageIcon />}>
          <Choice
            label={zh ? "测试背景" : "Test background"}
            value={background}
            options={[
              ["coast", zh ? "海岸" : "Coast"],
              ["waves", zh ? "海浪" : "Waves"],
            ]}
            onChange={setBackground}
          />
          <div className="relative overflow-hidden rounded-lg">
            <img
              src={media.image}
              alt=""
              className="aspect-[16/7] w-full object-cover"
            />
            <Button
              variant="secondary"
              size="sm"
              className="absolute right-2 bottom-2"
              onClick={() => setPlaying((value) => !value)}
            >
              {playing
                ? zh
                  ? "暂停背景视频"
                  : "Pause background video"
                : zh
                  ? "播放背景视频"
                  : "Play background video"}
            </Button>
          </div>
        </ControlGroup>
        <ControlGroup
          title={zh ? "光学参数" : "Optical properties"}
          icon={<SlidersHorizontal />}
        >
          <FieldGroup className="gap-4">
            <SwitchField
              label={zh ? "启用折射" : "Enable refraction"}
              checked={strength > 0}
              onChange={(checked) =>
                parameter("strength", checked ? previousStrength.current : 0)
              }
            />
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
              value={strength}
              max={64}
              onChange={(value) => parameter("strength", value)}
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
        <ControlGroup title={zh ? "渲染" : "Rendering"} icon={<Activity />}>
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
        <header className="flex min-w-0 items-start gap-3">
          <SidebarTrigger className="md:hidden" aria-label={title} />
          <div className="grid min-w-0 gap-1">
            <h1 className="font-semibold text-xl tracking-tight">
              {zh ? "组件体验" : "Playground"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {zh
                ? "在真实场景中体验玻璃：导航、控件和浮层使用玻璃，内容保持普通。"
                : "Glass in real scenarios: navigation, controls and floating layers use glass while content stays ordinary."}
            </p>
          </div>
        </header>
        <div
          ref={scene}
          className="relative isolate grid min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border"
          data-slot="glass-lab-scene"
        >
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
            className="pointer-events-none absolute inset-0 size-full object-cover"
            onLoadedData={() => refreshGlass(scene)}
          />
          <div className="@container relative z-10 min-h-0 min-w-0 overflow-y-auto overscroll-contain p-5 sm:p-8">
            <Scope
              glass={enabled}
              glassConfig={glassConfig}
              data-lab-appearance={enabled ? "glass" : "ordinary"}
              className="mx-auto max-w-6xl @min-[44rem]:columns-2 @min-[72rem]:columns-3 columns-1 gap-6"
            >
              <GlassLabBlocks locale={locale} glass={enabled} />
            </Scope>
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
