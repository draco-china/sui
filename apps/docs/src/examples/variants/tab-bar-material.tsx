"use client";
import { TabBar } from "@workspace/ui/components/tab-bar";
import { useState } from "react";
import { TabBarStage, tabBarItems } from "../support/tab-bar-stage";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const items = tabBarItems(chinese);
  const [value, setValue] = useState("home");
  const modes = [
    { key: "default", label: chinese ? "默认" : "Default", props: {} },
    { key: "glass", label: chinese ? "玻璃" : "Glass", props: { glass: true } },
    {
      key: "frosted",
      label: chinese ? "磨砂" : "Frosted",
      props: { frosted: true },
    },
  ];
  return (
    <TabBarStage>
      {modes.map((mode) => (
        <div key={mode.key} className="grid justify-items-center gap-2">
          <p className="text-sm">{mode.label}</p>
          <TabBar
            {...mode.props}
            aria-label={mode.label}
            items={items}
            value={value}
            onValueChange={setValue}
            search={{ label: chinese ? "搜索" : "Search" }}
          />
        </div>
      ))}
    </TabBarStage>
  );
}
