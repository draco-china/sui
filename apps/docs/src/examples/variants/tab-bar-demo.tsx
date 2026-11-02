"use client";
import { TabBar } from "@workspace/ui/components/tab-bar";
import { useState } from "react";
import { TabBarStage, tabBarItems } from "../support/tab-bar-stage";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const items = tabBarItems(chinese);
  const [value, setValue] = useState("home");
  const [query, setQuery] = useState("");
  const current = items.find((item) => item.value === value)?.label;
  return (
    <TabBarStage status={query ? `${current} · ${query}` : current}>
      <TabBar
        glass
        aria-label={chinese ? "应用导航" : "Application navigation"}
        items={items}
        value={value}
        onValueChange={setValue}
        search={{
          label: chinese ? "搜索" : "Search",
          value: query,
          onValueChange: setQuery,
        }}
      />
    </TabBarStage>
  );
}
