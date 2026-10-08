"use client";
import { HtmlViewer } from "@workspace/ui/components/html-viewer";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const content = `<!doctype html><html lang="${chinese ? "zh-CN" : "en-US"}"><head><meta charset="utf-8"><style>body{font:14px system-ui;margin:24px;color:#202020;background:#f5f5f7}button{font:inherit;padding:8px 12px;border:1px solid #ccc;border-radius:12px;background:white}p{line-height:1.6}</style></head><body><h2>${chinese ? "隔离的 HTML 预览" : "Isolated HTML preview"}</h2><p>${chinese ? "此按钮仅改变 iframe 内的文字" : "This button changes text only inside the iframe."}</p><button onclick="this.textContent='${chinese ? "脚本已运行" : "Script ran"}'">${chinese ? "测试沙箱脚本" : "Test sandboxed script"}</button></body></html>`;
  return (
    <HtmlViewer
      content={content}
      title={chinese ? "交互式 HTML 示例" : "Interactive HTML example"}
      className="h-64 w-full rounded-xl border"
    />
  );
}
