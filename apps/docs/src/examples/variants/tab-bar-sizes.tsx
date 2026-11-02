"use client";
import { TabBar } from "@workspace/ui/components/tab-bar";
import { useState } from "react";
import { TabBarStage, tabBarItems } from "../support/tab-bar-stage";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const items = tabBarItems(chinese).slice(0, 3);
  const [value, setValue] = useState("home");
  return (
    <TabBarStage>
      {(["sm", "default", "lg"] as const).map((size) => (
        <TabBar
          key={size}
          size={size}
          glass
          aria-label={size}
          items={items}
          value={value}
          onValueChange={setValue}
          search={{ label: chinese ? "搜索" : "Search" }}
        />
      ))}
    </TabBarStage>
  );
}
