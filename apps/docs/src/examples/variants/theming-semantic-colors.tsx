import { Button } from "@workspace/ui/components/button";
import { InlineCopyText } from "@workspace/ui/components/inline-copy-text";
import { useState } from "react";
import { previewTokens, tokenValue } from "../support/theming-tokens";
import type { ExampleProps } from "../types";

const groups = [
  {
    en: "Surfaces",
    zh: "表面",
    tokens: [
      ["background", "bg-background", "Page canvas", "页面画布"],
      ["card", "bg-card", "Card surface", "卡片表面"],
      ["popover", "bg-popover", "Floating surface", "浮层表面"],
      ["secondary", "bg-secondary", "Secondary control", "次要控件"],
      ["muted", "bg-muted", "Quiet surface", "低强调表面"],
      ["accent", "bg-accent", "Selection and hover", "选中与悬停"],
    ],
  },
  {
    en: "Text",
    zh: "正文",
    tokens: [
      ["foreground", "text-foreground", "Page text", "页面正文"],
      ["card-foreground", "text-card-foreground", "Text on card", "卡片正文"],
      [
        "popover-foreground",
        "text-popover-foreground",
        "Text on floating surface",
        "浮层正文",
      ],
      [
        "secondary-foreground",
        "text-secondary-foreground",
        "Text on secondary control",
        "次要控件正文",
      ],
      [
        "muted-foreground",
        "text-muted-foreground",
        "Supporting text",
        "辅助文字",
      ],
      [
        "accent-foreground",
        "text-accent-foreground",
        "Text on selection",
        "选中态正文",
      ],
    ],
  },
  {
    en: "Primary",
    zh: "主色",
    tokens: [
      ["primary", "bg-primary", "Primary action", "主要操作"],
      [
        "primary-foreground",
        "text-primary-foreground",
        "Text on primary action",
        "主要操作正文",
      ],
    ],
  },
  {
    en: "Borders and focus",
    zh: "边框与焦点",
    tokens: [
      ["border", "border-border", "Surface boundary", "表面边界"],
      ["input", "bg-input/50", "Input fill", "输入控件填充"],
      ["ring", "ring-ring", "Keyboard focus", "键盘焦点"],
    ],
  },
  {
    en: "Status",
    zh: "状态",
    tokens: [
      [
        "destructive",
        "text-destructive",
        "Destructive action or invalid input",
        "危险操作或无效输入",
      ],
    ],
  },
  {
    en: "Charts",
    zh: "图表",
    tokens: [1, 2, 3, 4, 5].map((index) => [
      `chart-${index}`,
      `fill-chart-${index}`,
      `Data series ${index}`,
      `数据系列 ${index}`,
    ]),
  },
  {
    en: "Sidebar",
    zh: "侧栏",
    tokens: [
      ["sidebar", "bg-sidebar", "Sidebar surface", "侧栏表面"],
      [
        "sidebar-foreground",
        "text-sidebar-foreground",
        "Sidebar text",
        "侧栏正文",
      ],
      [
        "sidebar-primary",
        "bg-sidebar-primary",
        "Sidebar primary action",
        "侧栏主要操作",
      ],
      [
        "sidebar-primary-foreground",
        "text-sidebar-primary-foreground",
        "Text on sidebar action",
        "侧栏主要操作正文",
      ],
      [
        "sidebar-accent",
        "bg-sidebar-accent",
        "Sidebar selected item",
        "侧栏选中项",
      ],
      [
        "sidebar-accent-foreground",
        "text-sidebar-accent-foreground",
        "Selected sidebar text",
        "侧栏选中项正文",
      ],
      [
        "sidebar-border",
        "border-sidebar-border",
        "Sidebar boundary",
        "侧栏边界",
      ],
      [
        "sidebar-ring",
        "ring-sidebar-ring",
        "Sidebar keyboard focus",
        "侧栏键盘焦点",
      ],
    ],
  },
];

export default function Example({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const stateLabels = zh
    ? {
        dark: "深色",
        light: "浅色",
      }
    : {
        dark: "Dark",
        light: "Light",
      };
  const [selected, setSelected] = useState(0);
  const group = groups[selected] ?? groups[0];
  const labels = {
    copy: zh ? "复制" : "Copy",
    copied: zh ? "已复制" : "Copied",
    failed: zh
      ? "复制失败，请手动复制"
      : "Copy failed. Copy the text manually.",
  };
  return (
    <div className="w-full space-y-4 text-sm">
      <fieldset className="flex min-w-0 flex-wrap gap-2">
        <legend className="sr-only">{zh ? "颜色用途" : "Color roles"}</legend>
        {groups.map((item, index) => (
          <Button
            key={item.en}
            type="button"
            size="sm"
            variant={index === selected ? "default" : "outline"}
            aria-pressed={index === selected}
            onClick={() => setSelected(index)}
          >
            {zh ? item.zh : item.en}
          </Button>
        ))}
      </fieldset>
      <ul className="divide-y divide-border rounded-2xl border border-border">
        {group?.tokens.map(([token, utility, en, cn]) => (
          <li key={token} className="grid gap-3 p-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-1">
              <p className="font-semibold">{zh ? cn : en}</p>
              <InlineCopyText labels={labels}>{`--${token}`}</InlineCopyText>
              <div>
                <InlineCopyText labels={labels} variant="muted">
                  {utility ?? ""}
                </InlineCopyText>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[false, true].map((dark) => {
                const value = tokenValue(
                  previewTokens("default", dark),
                  `--${token}`,
                );
                return (
                  <div key={String(dark)} className="min-w-0 space-y-2">
                    <div
                      aria-hidden="true"
                      className="h-12 rounded-lg border border-border"
                      style={{ background: value }}
                    />
                    <p className="text-muted-foreground">
                      {dark ? stateLabels.dark : stateLabels.light}
                    </p>
                    <InlineCopyText labels={labels}>{value}</InlineCopyText>
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
