import { Input } from "@workspace/ui/components/input";
import { LongText } from "@workspace/ui/components/long-text";
import { useState } from "react";
import type { ExampleProps } from "../types";

export default function LongTextDemo({ locale }: ExampleProps) {
  const zh = locale === "zh-CN";
  const [text, setText] = useState(
    "production-api-gateway.asia-east-1.example.com",
  );
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <Input
        aria-label={zh ? "编辑文本" : "Edit text"}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
        <span className="text-muted-foreground text-sm">
          {zh ? "域名" : "Domain"}
        </span>
        <LongText
          className="w-44"
          label={zh ? "显示完整域名" : "Show full domain"}
        >
          {text}
        </LongText>
      </div>
      <p className="text-muted-foreground text-sm">
        {zh
          ? "悬停或键盘聚焦查看全文，触屏点击展开。短文本不会启用浮层。"
          : "Hover or focus to see the full text; tap on touch devices. Short text needs no overlay."}
      </p>
    </div>
  );
}
