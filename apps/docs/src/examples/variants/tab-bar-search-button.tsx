"use client";
import { TabBar } from "@workspace/ui/components/tab-bar";
import { SparklesIcon } from "lucide-react";
import { useState } from "react";
import { TabBarStage, tabBarItems } from "../support/tab-bar-stage";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [value, setValue] = useState("home");
  const [count, setCount] = useState(0);
  return (
    <TabBarStage
      status={
        chinese
          ? `助手按钮已点按 ${count} 次`
          : `Assistant button pressed ${count} times`
      }
    >
      <TabBar
        glass
        aria-label={chinese ? "应用导航" : "Application navigation"}
        items={tabBarItems(chinese)}
        value={value}
        onValueChange={setValue}
        search={{
          mode: "button",
          label: chinese ? "助手" : "Assistant",
          icon: <SparklesIcon />,
          onActivate: () => setCount((previous) => previous + 1),
        }}
      />
    </TabBarStage>
  );
}
