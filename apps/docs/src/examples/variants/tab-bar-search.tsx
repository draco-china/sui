"use client";
import { TabBar } from "@workspace/ui/components/tab-bar";
import { useState } from "react";
import { TabBarStage, tabBarItems } from "../support/tab-bar-stage";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [value, setValue] = useState("home");
  const [submitted, setSubmitted] = useState("");
  const prefix = chinese ? "已搜索：" : "Searched: ";
  const hint = chinese
    ? "点按搜索按钮，输入后按 Enter"
    : "Press the search button, type and press Enter";
  return (
    <TabBarStage status={submitted ? `${prefix}${submitted}` : hint}>
      <TabBar
        frosted
        aria-label={chinese ? "应用导航" : "Application navigation"}
        items={tabBarItems(chinese)}
        value={value}
        onValueChange={setValue}
        search={{
          label: chinese ? "搜索" : "Search",
          placeholder: chinese ? "搜索收藏与动态" : "Search saved and activity",
          onSubmit: setSubmitted,
        }}
      />
    </TabBarStage>
  );
}
