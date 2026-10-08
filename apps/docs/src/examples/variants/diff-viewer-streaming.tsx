"use client";
import { Button } from "@workspace/ui/components/button";
import { DiffViewer } from "@workspace/ui/components/diff-viewer";
import { useEffect, useState } from "react";
import type { ExampleProps } from "../types";

const oldCode = '{\n  "name": "default",\n  "enabled": false\n}';
const newLines = [
  "{",
  '  "name": "rose",',
  '  "enabled": true,',
  ...Array.from(
    { length: 12 },
    (_, index) => `  "item${index + 1}": ${index + 1},`,
  ),
  '  "version": 2',
  "}",
];
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [count, setCount] = useState(newLines.length);
  const streaming = count < newLines.length;
  useEffect(() => {
    if (!streaming) return;
    const timer = setTimeout(() => setCount(count + 1), 350);
    return () => clearTimeout(timer);
  }, [streaming, count]);
  return (
    <div className="grid w-full gap-3">
      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        disabled={streaming}
        onClick={() => setCount(1)}
      >
        {chinese ? "重新播放修改" : "Replay changes"}
      </Button>
      <DiffViewer
        oldCode={oldCode}
        newCode={newLines.slice(0, count).join("\n")}
        lang="json"
        status={streaming ? "streaming" : "complete"}
        filename="settings.json"
        maxHeight={180}
        copyable={false}
        labels={
          chinese
            ? {
                before: "修改前",
                after: "修改后",
                viewMode: "差异视图",
                split: "并排",
                unified: "合并",
                writing: "正在编写",
                loading: "正在高亮",
                ready: "就绪",
                error: "无法高亮差异",
                copy: "复制修改后的代码",
                copied: "已复制",
                copyFailed: "复制失败",
              }
            : undefined
        }
      />
    </div>
  );
}
