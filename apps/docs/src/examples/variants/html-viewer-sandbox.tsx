"use client";
import { HtmlViewer } from "@workspace/ui/components/html-viewer";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { useId, useState } from "react";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const id = useId();
  const [content, setContent] = useState(
    chinese
      ? "<h2>静态 HTML</h2><p>没有脚本权限的预览。</p>"
      : "<h2>Static HTML</h2><p>A preview without script permission.</p>",
  );
  return (
    <div className="grid w-full gap-3">
      <Label htmlFor={id}>{chinese ? "HTML 源码" : "HTML source"}</Label>
      <Textarea
        id={id}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={3}
      />
      <HtmlViewer
        content={content}
        sandbox=""
        title={
          chinese
            ? "禁止脚本的 HTML 预览"
            : "HTML preview with scripts disabled"
        }
        className="h-48 w-full rounded-xl border"
      />
    </div>
  );
}
