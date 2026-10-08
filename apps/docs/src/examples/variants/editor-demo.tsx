"use client";
import { Editor } from "@workspace/ui/components/editor";
import { useState } from "react";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [language, setLanguage] = useState("markdown");
  const [value, setValue] = useState(
    chinese
      ? "# 项目说明\n\n编辑这里的 **Markdown**，然后切换预览。\n\n- [x] 双语文档\n- [ ] 下一次发布"
      : "# Project notes\n\nEdit this **Markdown**, then switch to preview.\n\n- [x] Bilingual docs\n- [ ] Next release",
  );
  return (
    <Editor
      value={value}
      onChange={setValue}
      language={language}
      onLanguageChange={setLanguage}
      languages={[
        { value: "markdown", label: "Markdown" },
        { value: "html", label: "HTML" },
        { value: "typescript", label: "TypeScript" },
        { value: "tsx", label: "TSX" },
        { value: "json", label: "JSON" },
      ]}
      height={320}
      toolbarTitle={chinese ? "项目说明" : "Project notes"}
      labels={
        chinese
          ? {
              copied: "已复制",
              copyFailed: "复制失败",
              loading: "正在加载编辑器",
              loadingPreview: "正在加载预览",
              language: "语言",
              error: "无法加载编辑器",
              preview: "预览",
              hidePreview: "隐藏预览",
              split: "并排",
              copy: "复制",
              fullscreen: "全屏",
              exitFullscreen: "退出全屏",
            }
          : undefined
      }
    />
  );
}
