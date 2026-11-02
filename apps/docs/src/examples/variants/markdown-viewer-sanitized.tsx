"use client";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  MarkdownViewer,
  markdownViewerLabelsZhCN,
} from "@workspace/ui/viewers/markdown-viewer";
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
        labels={chinese ? markdownViewerLabelsZhCN : undefined}
      />
    </div>
  );
}
