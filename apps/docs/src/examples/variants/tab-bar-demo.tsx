"use client";
import { GlassProvider } from "@workspace/ui/components/glass";
import { TabBar } from "@workspace/ui/components/tab-bar";
import { BellIcon, HomeIcon, SearchIcon, SettingsIcon } from "lucide-react";
import { useRef, useState } from "react";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const scene = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("home");
  const items = [
    { value: "home", label: chinese ? "首页" : "Home", icon: <HomeIcon /> },
    {
      value: "search",
      label: chinese ? "搜索" : "Search",
      icon: <SearchIcon />,
    },
    {
      value: "activity",
      label: chinese ? "动态" : "Activity",
      icon: <BellIcon />,
    },
    {
      value: "settings",
      label: chinese ? "设置" : "Settings",
      icon: <SettingsIcon />,
    },
  ];
  const current = items.find((item) => item.value === value);
  return (
    <GlassProvider mode="auto" material="clear" captureTarget={scene}>
      <div
        ref={scene}
        className="relative isolate flex min-h-80 w-full flex-col justify-between overflow-hidden rounded-2xl bg-muted p-6"
      >
        <div
          className="absolute inset-0 -z-10 grid grid-cols-3 gap-3 p-3"
          aria-hidden="true"
        >
          <div className="rounded-2xl bg-blue-400/60" />
          <div className="rounded-2xl bg-emerald-400/60" />
          <div className="rounded-2xl bg-rose-400/60" />
        </div>
        <p className="text-center text-sm" aria-live="polite">
          {chinese ? "当前目的地：" : "Current destination: "}
          {current?.label}
        </p>
        <div className="grid gap-6">
          <div className="grid gap-2">
            <p className="text-center text-sm">
              {chinese ? "默认外观" : "Default appearance"}
            </p>
            <TabBar
              aria-label={
                chinese ? "默认应用导航" : "Default application navigation"
              }
              items={items}
              value={value}
              onValueChange={setValue}
              className="mx-auto w-full max-w-md"
            />
          </div>
          <div className="grid gap-2">
            <p className="text-center text-sm">
              {chinese ? "玻璃模式" : "Glass mode"}
            </p>
            <TabBar
              glass
              aria-label={
                chinese ? "玻璃应用导航" : "Glass application navigation"
              }
              items={items}
              value={value}
              onValueChange={setValue}
              className="mx-auto w-full max-w-md"
            />
          </div>
        </div>
      </div>
    </GlassProvider>
  );
}
