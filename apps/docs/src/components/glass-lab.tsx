"use client";

import { Button } from "@workspace/ui/components/button";
import { ColorPicker } from "@workspace/ui/components/color-picker";
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import {
  type GlassConfig,
  type GlassEdge,
  type GlassProps,
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
} from "@workspace/ui/lib/glass/defaults";
import {
  Activity,
  ImageIcon,
  Layers3,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { ExampleProps } from "../examples/types";
import { GlassLabBlocks } from "./glass-lab-blocks";
import { RenderingStatus } from "./glass-lab-rendering";
import { GlassRefractionProbe } from "./glass-refraction-probe";

type Material = "ordinary" | "glass" | "frosted";
const materialProps = (material: Material, settings: GlassConfig) => {
  if (material === "glass") return { glass: settings } satisfies GlassProps;
  if (material === "frosted") return { frosted: true } satisfies GlassProps;
  return {};
};
// Every Clear setting, at its default.
const defaultGlass = {
  edge: glassDefaultEdge as GlassEdge,
  strength: glassDefaults.strength as number,
  tintOpacity: glassDefaults.tintOpacity as number,
  textGlow: false as boolean,
  tint: undefined as string | undefined,
} satisfies GlassConfig;
// Frosted glass is CSS only: its settings are the --frosted-base and
// --frosted-opacity variables.
const defaultFrosted = {
  opacity: 0.65,
  blur: 24,
  tint: undefined as string | undefined,
};
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
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  /** A group-wide action, such as a reset, beside the title. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SidebarGroup className="gap-3 border-b px-5 py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <SidebarGroupLabel className="h-auto gap-2 rounded-none p-0 text-muted-foreground">
          {icon}
          {title}
        </SidebarGroupLabel>
        {action}
      </div>
      <SidebarGroupContent className="grid gap-4">
        {children}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function Choice<T extends string>({
  label,
  hideLabel = false,
  value,
  options,
  onChange,
}: {
  label: string;
  /** The group title already names the choice; the label stays accessible. */
  hideLabel?: boolean;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  return (
    <Field>
      {!hideLabel && <FieldLabel className="text-xs">{label}</FieldLabel>}
      <ToggleGroup
        variant="outline"
        size="sm"
        spacing={0}
        className="w-full *:min-w-0 *:flex-1 *:text-xs"
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
  suffix = "",
  format = (current) => `${current}${suffix}`,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  /** How the value reads beside the label. */
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <Field className="gap-2">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel htmlFor={id} className="text-xs">
          {label}
        </FieldLabel>
        <output className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground text-xs tabular-nums">
          {format(value)}
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

function GroupAction({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      className="-my-1 text-muted-foreground"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {icon}
    </Button>
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

function TintField({
  zh,
  value,
  onChange,
}: {
  zh: boolean;
  value?: string;
  onChange: (value?: string) => void;
}) {
  const id = useId();
  return (
    <Field orientation="horizontal" className="justify-between">
      <FieldLabel htmlFor={id} className="text-xs">
        {zh ? "自定义着色" : "Custom tint"}
      </FieldLabel>
      <div className="flex items-center gap-2">
        {value !== undefined && (
          <ColorPicker
            size="xs"
            value={value}
            onValueChange={onChange}
            eyeDropper={false}
            aria-label={zh ? "着色颜色" : "Tint color"}
          />
        )}
        <Switch
          id={id}
          checked={value !== undefined}
          onCheckedChange={(custom) => onChange(custom ? "#FFFFFF" : undefined)}
        />
      </div>
    </Field>
  );
}

function Transparency({
  zh,
  opacity,
  onChange,
}: {
  zh: boolean;
  opacity: number;
  onChange: (opacity: number) => void;
}) {
  return (
    <Parameter
      label={zh ? "透明度" : "Transparency"}
      value={Math.round((1 - opacity) * 100)}
      max={100}
      suffix="%"
      onChange={(value) => onChange(1 - value / 100)}
    />
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
  const [material, setMaterial] = useState<Material>("glass");
  const [settings, setSettings] = useState(defaultGlass);
  const [frosted, setFrosted] = useState(defaultFrosted);
  const [showProbe, setShowProbe] = useState(false);
  const [background, setBackground] = useState<Background>("coast");
  const [playing, setPlaying] = useState(true);
  const videoLabels = zh
    ? { play: "播放背景视频", pause: "暂停背景视频" }
    : { play: "Play background video", pause: "Pause background video" };
  const media = backgrounds[background];
  const clear = material === "glass";
  const labels = { off: zh ? "关闭" : "Off" };
  const setting = <Key extends keyof typeof defaultGlass>(
    key: Key,
    value: (typeof defaultGlass)[Key],
  ) => setSettings((current) => ({ ...current, [key]: value }));
  const frostedRule = [
    `--frosted-opacity: ${frosted.opacity * 100}%;`,
    `--frosted-blur: ${frosted.blur}px;`,
    frosted.tint && `--frosted-base: ${frosted.tint};`,
  ]
    .filter(Boolean)
    .join(" ");
  useEffect(() => {
    const player = video.current;
    if (playing) void player?.play().catch(() => setPlaying(false));
    else player?.pause();
  }, [playing]);
  const title = zh ? "外观设置" : "Appearance settings";
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "19rem" } as CSSProperties}
      className="not-prose grid h-full min-h-0 gap-6 *:data-[slot=sidebar]:min-h-0 md:grid-cols-[19rem_minmax(0,1fr)] md:gap-5"
      data-slot="glass-lab"
    >
      <Controls title={title}>
        <ControlGroup title={zh ? "材质" : "Material"} icon={<Layers3 />}>
          <Choice
            label={zh ? "组件材质" : "Component material"}
            hideLabel
            value={material}
            options={[
              ["ordinary", zh ? "普通" : "Ordinary"],
              ["glass", "Glass"],
              ["frosted", zh ? "磨砂" : "Frosted"],
            ]}
            onChange={setMaterial}
          />
        </ControlGroup>
        {clear && (
          <ControlGroup
            title={zh ? "清透玻璃" : "Glass"}
            icon={<SlidersHorizontal />}
            action={
              <GroupAction
                label={zh ? "恢复默认参数" : "Reset defaults"}
                icon={<RotateCcw />}
                onClick={() => setSettings(defaultGlass)}
              />
            }
          >
            <FieldGroup className="gap-4">
              <Choice
                label={zh ? "边缘光" : "Edge light"}
                value={settings.edge}
                options={[
                  ["diagonal", zh ? "对角" : "Diagonal"],
                  ["vertical", zh ? "上下" : "Vertical"],
                ]}
                onChange={(edge) => setting("edge", edge)}
              />
              <Parameter
                label={zh ? "折射强度" : "Refraction strength"}
                value={settings.strength}
                max={64}
                format={(strength) =>
                  strength > 0 ? String(strength) : labels.off
                }
                onChange={(strength) => setting("strength", strength)}
              />
              <Transparency
                zh={zh}
                opacity={settings.tintOpacity}
                onChange={(opacity) => setting("tintOpacity", opacity)}
              />
              <TintField
                zh={zh}
                value={settings.tint}
                onChange={(tint) => setting("tint", tint)}
              />
              <SwitchField
                label={zh ? "文字光晕" : "Text glow"}
                checked={settings.textGlow}
                onChange={(textGlow) => setting("textGlow", textGlow)}
              />
            </FieldGroup>
          </ControlGroup>
        )}
        {material === "frosted" && (
          <ControlGroup
            title={zh ? "磨砂玻璃" : "Frosted"}
            icon={<SlidersHorizontal />}
            action={
              <GroupAction
                label={zh ? "恢复默认参数" : "Reset defaults"}
                icon={<RotateCcw />}
                onClick={() => setFrosted(defaultFrosted)}
              />
            }
          >
            <FieldGroup className="gap-4">
              <Parameter
                label={zh ? "模糊" : "Blur"}
                value={frosted.blur}
                max={48}
                suffix="px"
                onChange={(blur) =>
                  setFrosted((current) => ({ ...current, blur }))
                }
              />
              <Transparency
                zh={zh}
                opacity={frosted.opacity}
                onChange={(opacity) =>
                  setFrosted((current) => ({ ...current, opacity }))
                }
              />
              <TintField
                zh={zh}
                value={frosted.tint}
                onChange={(tint) =>
                  setFrosted((current) => ({ ...current, tint }))
                }
              />
            </FieldGroup>
          </ControlGroup>
        )}
        <ControlGroup
          title={zh ? "背景" : "Background"}
          icon={<ImageIcon />}
          action={
            <GroupAction
              label={playing ? videoLabels.pause : videoLabels.play}
              icon={playing ? <Pause /> : <Play />}
              onClick={() => setPlaying((value) => !value)}
            />
          }
        >
          <ToggleGroup
            aria-label={zh ? "测试背景" : "Test background"}
            className="grid w-full grid-cols-2"
            value={[background]}
            onValueChange={(values) => {
              if (values[0]) setBackground(values[0] as Background);
            }}
          >
            {(
              [
                ["coast", zh ? "海岸" : "Coast"],
                ["waves", zh ? "海浪" : "Waves"],
              ] as const
            ).map(([value, label]) => (
              <ToggleGroupItem
                key={value}
                value={value}
                className="h-auto w-full flex-col items-stretch gap-1.5 rounded-xl border p-1.5 text-xs data-pressed:border-primary data-pressed:bg-primary/10 data-pressed:text-primary"
              >
                <img
                  src={backgrounds[value].image}
                  alt=""
                  className="aspect-4/3 w-full rounded-lg object-cover"
                />
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </ControlGroup>
        {/* Only Clear glass runs the renderer; frosted glass is CSS alone. */}
        {clear && (
          <ControlGroup
            title={zh ? "渲染" : "Rendering"}
            icon={<Activity />}
            action={
              <GroupAction
                label={zh ? "刷新效果" : "Refresh effect"}
                icon={<RefreshCw />}
                onClick={() => refreshGlass(scene)}
              />
            }
          >
            <SwitchField
              label={zh ? "显示折射镜片" : "Show refraction lens"}
              checked={showProbe}
              onChange={setShowProbe}
            />
            <RenderingStatus scene={scene} zh={zh} />
          </ControlGroup>
        )}
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
            {/* Popups render outside the scene, so the variable is set on every
                frosted surface while the Playground is open. */}
            {material === "frosted" && (
              <style>{`[data-frosted="true"] { ${frostedRule} }`}</style>
            )}
            <div
              data-lab-appearance={material}
              className="mx-auto max-w-6xl @min-[44rem]:columns-2 @min-[72rem]:columns-3 columns-1 gap-6"
            >
              <GlassLabBlocks
                locale={locale}
                material={materialProps(material, settings)}
              />
            </div>
          </div>
          {clear && showProbe && (
            <GlassRefractionProbe
              scene={scene}
              locale={locale}
              settings={settings}
            />
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
