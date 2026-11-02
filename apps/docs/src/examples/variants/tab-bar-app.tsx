"use client";
import { TabBar } from "@workspace/ui/components/tab-bar";
import { useState } from "react";
import { tabBarItems } from "../support/tab-bar-stage";
import type { ExampleProps } from "../types";

const entries = {
  en: {
    home: ["Morning brief", "Team standup notes", "Quarterly roadmap"],
    saved: ["Design tokens", "Glass guidelines", "Motion checklist"],
    activity: ["Ana commented", "Build passed", "Release v4.0.0"],
    settings: ["Appearance", "Notifications", "Privacy"],
  },
  zh: {
    home: ["今日简报", "站会记录", "季度路线图"],
    saved: ["设计令牌", "玻璃规范", "动效清单"],
    activity: ["Ana 发表了评论", "构建通过", "发布 v4.0.0"],
    settings: ["外观", "通知", "隐私"],
  },
};

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const items = tabBarItems(chinese);
  const content = chinese ? entries.zh : entries.en;
  const [value, setValue] = useState<keyof typeof content>("home");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const all = Object.values(content).flat();
  const results = all.filter((entry) =>
    entry.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const rows = open ? results : content[value];
  const searchLabel = chinese ? "搜索" : "Search";
  const heading = open
    ? searchLabel
    : items.find((item) => item.value === value)?.label;
  return (
    <div className="relative mx-auto flex h-[30rem] w-full max-w-md flex-col overflow-hidden rounded-[2.5rem] border bg-background">
      <div className="h-36 shrink-0 bg-linear-to-br from-sky-400/70 via-violet-400/60 to-rose-400/60" />
      <div className="-mt-10 flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 pb-28">
        <h3 className="font-semibold text-2xl">{heading}</h3>
        <ul className="grid gap-2">
          {rows.map((entry) => (
            <li key={entry} className="rounded-2xl bg-muted px-4 py-3 text-sm">
              {entry}
            </li>
          ))}
        </ul>
        {rows.length ? null : (
          <p className="text-muted-foreground text-sm">
            {chinese ? "没有结果" : "No results"}
          </p>
        )}
      </div>
      <div className="absolute inset-x-4 bottom-4 flex justify-center">
        <TabBar
          glass
          size="sm"
          aria-label={chinese ? "应用导航" : "Application navigation"}
          items={items}
          value={value}
          onValueChange={(next) => setValue(next as keyof typeof content)}
          search={{
            label: searchLabel,
            open,
            onOpenChange: setOpen,
            value: query,
            onValueChange: setQuery,
          }}
        />
      </div>
    </div>
  );
}
