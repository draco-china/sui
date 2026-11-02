"use client";
import { Button } from "@workspace/ui/components/button";
import { TabBar } from "@workspace/ui/components/tab-bar";
import { useState } from "react";
import { TabBarStage, tabBarItems } from "../support/tab-bar-stage";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [value, setValue] = useState("home");
  const [filter, setFilter] = useState<string | null>(null);
  const filters = chinese ? ["今天", "本周", "全部"] : ["Today", "Week", "All"];
  const prefix = chinese ? "筛选：" : "Filter: ";
  const hint = chinese ? "展开后显示自定义内容" : "Opens into custom content";
  return (
    <TabBarStage status={filter ? `${prefix}${filter}` : hint}>
      <TabBar
        glass
        aria-label={chinese ? "应用导航" : "Application navigation"}
        items={tabBarItems(chinese)}
        value={value}
        onValueChange={setValue}
        search={{
          label: chinese ? "筛选" : "Filter",
          render: ({ close }) => (
            <div className="flex flex-1 items-center justify-between gap-1 px-1">
              {filters.map((option) => (
                <Button
                  key={option}
                  variant="ghost"
                  className="flex-1 rounded-full"
                  onClick={() => {
                    setFilter(option);
                    close();
                  }}
                >
                  {option}
                </Button>
              ))}
            </div>
          ),
        }}
      />
    </TabBarStage>
  );
}
