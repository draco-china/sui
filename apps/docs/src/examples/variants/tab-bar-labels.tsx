"use client";
import { TabBar } from "@workspace/ui/components/tab-bar";
import { useState } from "react";
import { TabBarStage } from "../support/tab-bar-stage";
import type { ExampleProps } from "../types";

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [value, setValue] = useState("all");
  return (
    <TabBarStage>
      <TabBar
        aria-label={chinese ? "收件箱筛选" : "Inbox filters"}
        size="sm"
        items={[
          { value: "all", label: chinese ? "全部" : "All" },
          { value: "unread", label: chinese ? "未读" : "Unread" },
          { value: "flagged", label: chinese ? "已标记" : "Flagged" },
          {
            value: "archived",
            label: chinese ? "已归档" : "Archived",
            disabled: true,
          },
        ]}
        value={value}
        onValueChange={setValue}
      />
    </TabBarStage>
  );
}
