"use client";
import { Label } from "@workspace/ui/components/label";
import { MarkdownViewer } from "@workspace/ui/components/markdown-viewer";
import { Textarea } from "@workspace/ui/components/textarea";
import { useId, useState } from "react";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const id = useId();
  const [content, setContent] = useState(
    chinese
      ? '## 可编辑的内容\n\n<details><summary>展开详情</summary>允许的 HTML 会保留。</details>\n\n<script>alert("removed")</script>'
      : '## Editable content\n\n<details><summary>Show details</summary>Allowed HTML is preserved.</details>\n\n<script>alert("removed")</script>',
  );
  return (
    <div className="grid w-full gap-4">
      <Label htmlFor={id}>
        {chinese ? "Markdown 源码" : "Markdown source"}
      </Label>
      <Textarea
        id={id}
        rows={5}
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      <MarkdownViewer
        content={content}
        labels={
          chinese
            ? {
                empty: "没有 Markdown 内容",
                note: "备注",
                tip: "提示",
                important: "重要",
                warning: "警告",
                caution: "注意",
                code: {
                  copy: "复制代码",
                  copied: "已复制",
                  copyFailed: "复制失败",
                  loading: "正在加载",
                  error: "无法高亮代码",
                  empty: "没有代码",
                  expand: "展开",
                  collapse: "收起",
                  writing: "正在生成",
                  ready: "就绪",
                },
              }
            : undefined
        }
      />
    </div>
  );
}
