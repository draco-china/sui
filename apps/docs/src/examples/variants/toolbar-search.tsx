import {
  Toolbar,
  ToolbarButton,
  ToolbarInput,
  ToolbarSeparator,
} from "@workspace/ui/components/toolbar";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { useState } from "react";
import type { ExampleProps } from "../types";

export default function ToolbarSearch({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const noMatchesLabel = chinese ? "没有匹配的笔记" : "No matching notes.";
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState(0);
  const notes = chinese
    ? ["检查键盘交互", "调整组件主题", "更新双语文档", "发布组件示例"]
    : [
        "Check keyboard interactions",
        "Customize component themes",
        "Update bilingual documentation",
        "Publish component examples",
      ];
  const filtered = notes.filter((note) =>
    note.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  const selected = filtered.length ? position % filtered.length : 0;

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-4">
      <Toolbar aria-label={chinese ? "查找笔记" : "Find notes"}>
        <ToolbarButton
          size="icon"
          aria-label={chinese ? "上一条结果" : "Previous result"}
          disabled={!filtered.length}
          onClick={() =>
            setPosition(
              (current) => (current + filtered.length - 1) % filtered.length,
            )
          }
        >
          <ArrowUpIcon />
        </ToolbarButton>
        <ToolbarButton
          size="icon"
          aria-label={chinese ? "下一条结果" : "Next result"}
          disabled={!filtered.length}
          onClick={() =>
            setPosition((current) => (current + 1) % filtered.length)
          }
        >
          <ArrowDownIcon />
        </ToolbarButton>
        <ToolbarSeparator />
        <ToolbarInput
          aria-label={chinese ? "搜索笔记" : "Search notes"}
          placeholder={chinese ? "搜索笔记…" : "Search notes…"}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPosition(0);
          }}
        />
      </Toolbar>
      <output className="text-muted-foreground text-sm" aria-live="polite">
        {filtered.length
          ? `${selected + 1} / ${filtered.length}: ${filtered[selected]}`
          : noMatchesLabel}
      </output>
    </div>
  );
}
