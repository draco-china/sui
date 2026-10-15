import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { DirectionProvider } from "@workspace/ui/components/direction";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { GlassSurface } from "@workspace/ui/components/glass";
import { Input } from "@workspace/ui/components/input";
import { TabBar } from "@workspace/ui/components/tab-bar";
import { Toaster } from "@workspace/ui/components/toast";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  BoldIcon,
  HomeIcon,
  ItalicIcon,
  PlusIcon,
  SearchIcon,
  UnderlineIcon,
} from "lucide-react";
import { useId, useState } from "react";
import { useGlassEnabled } from "../../../../packages/ui/src/lib/glass/context";
import type { ExampleProps } from "../examples/types";

export function GlassToggleGroupCase({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const layouts = [
    {
      id: "spaced",
      spacing: 2,
      orientation: "horizontal",
      label: zh ? "横向间距" : "Spaced horizontal",
    },
    {
      id: "joined",
      spacing: 0,
      orientation: "horizontal",
      label: zh ? "横向紧凑" : "Joined horizontal",
    },
    {
      id: "vertical",
      spacing: 0,
      orientation: "vertical",
      label: zh ? "纵向紧凑" : "Joined vertical",
    },
  ] as const;
  const formats = [
    { value: "bold", label: zh ? "粗体" : "Bold", icon: BoldIcon },
    { value: "italic", label: zh ? "斜体" : "Italic", icon: ItalicIcon },
    {
      value: "underline",
      label: zh ? "下划线" : "Underline",
      icon: UnderlineIcon,
    },
  ];
  return (
    <div className="flex w-full flex-wrap items-start justify-center gap-6">
      {layouts.map((layout) => (
        <ToggleGroup
          key={layout.id}
          aria-label={layout.label}
          multiple
          variant="outline"
          spacing={layout.spacing}
          orientation={layout.orientation}
        >
          {formats.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              aria-label={`${layout.label} · ${label}`}
            >
              <Icon />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ))}
    </div>
  );
}

export function GlassTooltipCase({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const labels = { top: "上方", right: "右侧", bottom: "下方", left: "左侧" };
  return (
    <TooltipProvider>
      <div className="flex w-full flex-wrap justify-center gap-3 px-14 py-14">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <Tooltip key={side}>
            <TooltipTrigger render={<Button variant="outline" />}>
              {zh ? labels[side] : side}
            </TooltipTrigger>
            <TooltipContent side={side}>
              {zh ? "添加到资料库" : "Add to library"}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

export function GlassStateCases({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const enabled = useGlassEnabled();
  const id = useId();
  const [count, setCount] = useState(0);
  return (
    <div className="grid w-full gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {(
          ["default", "secondary", "outline", "ghost", "destructive"] as const
        ).map((variant) => (
          <Button
            key={variant}
            variant={variant}
            onClick={() => setCount((value) => value + 1)}
          >
            {variant}
          </Button>
        ))}
        <Button disabled>{zh ? "禁用" : "Disabled"}</Button>
      </div>
      <output className="text-sm" aria-live="polite">
        {zh ? "点击次数" : "Clicks"}: {count}
      </output>
      <div className="flex flex-wrap items-center gap-2">
        {(["xs", "sm", "default", "lg"] as const).map((size) => (
          <Button key={size} size={size} variant="outline">
            {size}
          </Button>
        ))}
        <Button
          size="icon"
          variant="outline"
          className="rounded-full"
          aria-label={zh ? "圆形按钮" : "Round button"}
        >
          <PlusIcon />
        </Button>
        <Badge>{zh ? "主色" : "Primary"}</Badge>
        <Badge variant="destructive">{zh ? "危险色" : "Danger"}</Badge>
      </div>
      <Field>
        <FieldLabel htmlFor={`${id}-input`}>
          {zh ? "输入与键盘焦点" : "Typing and keyboard focus"}
        </FieldLabel>
        <Input
          id={`${id}-input`}
          placeholder={
            zh
              ? "观察清透度，聚焦不叠加 ring"
              : "Inspect clarity without a focus ring"
          }
        />
      </Field>
      <Field data-invalid>
        <FieldLabel htmlFor={`${id}-error`}>
          {zh ? "错误状态" : "Invalid state"}
        </FieldLabel>
        <Input
          id={`${id}-error`}
          aria-invalid
          placeholder={zh ? "错误提示仍可辨识" : "Invalid state stays visible"}
        />
      </Field>
      <Input
        disabled
        aria-label={zh ? "禁用输入" : "Disabled input"}
        placeholder={zh ? "禁用输入" : "Disabled input"}
      />
      <GlassSurface
        glass={enabled}
        className="grid gap-3 rounded-2xl bg-background p-5"
      >
        <p className="text-sm">
          {zh ? "嵌套玻璃 · 内容与控件" : "Nested glass · content and controls"}
        </p>
        <Input
          glass={enabled}
          aria-label={zh ? "嵌套输入" : "Nested input"}
          placeholder={zh ? "独立玻璃输入框" : "Independent glass input"}
        />
        <Button glass={enabled} variant="outline">
          {zh ? "内部按钮" : "Inner button"}
        </Button>
      </GlassSurface>
      <GlassSurface
        glass={enabled}
        className="rounded-2xl p-5"
        style={{
          backgroundColor:
            "color-mix(in srgb, var(--primary) 20%, transparent)",
        }}
      >
        <p className="text-primary text-sm">
          {zh ? "自定义 20% 着色层" : "Custom 20% color layer"}
        </p>
      </GlassSurface>
    </div>
  );
}

export function GlassDirectionCase({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  return (
    <div className="grid w-full gap-4">
      {(["ltr", "rtl"] as const).map((direction) => (
        <DirectionProvider key={direction} direction={direction}>
          <div dir={direction} className="flex flex-wrap gap-2">
            <Input
              aria-label={`${direction} input`}
              placeholder={`${direction.toUpperCase()} · ${zh ? "输入" : "Input"}`}
            />
            <Button variant="outline">{direction.toUpperCase()}</Button>
          </div>
        </DirectionProvider>
      ))}
    </div>
  );
}

export function GlassTabBarCase({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [value, setValue] = useState("home");
  return (
    <TabBar
      value={value}
      onValueChange={setValue}
      items={[
        { value: "home", label: zh ? "首页" : "Home", icon: <HomeIcon /> },
        {
          value: "search",
          label: zh ? "搜索" : "Search",
          icon: <SearchIcon />,
        },
      ]}
    />
  );
}

export function GlassToastCase({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [manager] = useState(() => ToastPrimitive.createToastManager());
  return (
    <Toaster toastManager={manager}>
      <Button
        variant="outline"
        onClick={() =>
          manager.add({
            title: zh ? "玻璃通知" : "Glass notification",
            description: zh
              ? "在 Portal 中继承当前材质参数"
              : "Inherits current material settings through a portal",
          })
        }
      >
        {zh ? "显示测试通知" : "Show test notification"}
      </Button>
    </Toaster>
  );
}
