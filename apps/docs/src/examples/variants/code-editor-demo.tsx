"use client";
import {
  CodeEditor,
  codeEditorLabelsZhCN,
  defaultPlugins,
  languageSelect,
  preview,
} from "@workspace/ui/components/code-editor";
import { HtmlViewer } from "@workspace/ui/components/html-viewer";
import { MarkdownViewer } from "@workspace/ui/components/markdown-viewer";
import { useMemo, useState } from "react";
import type { ExampleProps } from "../types";

const languages = [
  { value: "markdown", label: "Markdown" },
  { value: "html", label: "HTML" },
  { value: "typescript", label: "TypeScript" },
  { value: "tsx", label: "TSX" },
  { value: "json", label: "JSON" },
];

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [language, setLanguage] = useState("markdown");
  const [value, setValue] = useState(
    chinese
      ? "# 项目说明\n\n编辑这里的 **Markdown**，然后切换预览。\n\n- [x] 双语文档\n- [ ] 下一次发布"
      : "# Project notes\n\nEdit this **Markdown**, then switch to preview.\n\n- [x] Bilingual docs\n- [ ] Next release",
  );
  // Memoize plugins so Monaco options are not rebuilt on every keystroke.
  const plugins = useMemo(() => {
    const list = [languageSelect({ onChange: setLanguage, languages })];
    if (language === "markdown")
      list.push(
        preview({
          defaultMode: "edit",
          render: (content) => (
            <MarkdownViewer className="p-4" content={content} />
          ),
        }),
      );
    if (language === "html")
      list.push(
        preview({
          defaultMode: "edit",
          render: (content) => <HtmlViewer content={content} />,
        }),
      );
    return [...list, ...defaultPlugins()];
  }, [language]);
  return (
    <CodeEditor
      value={value}
      onChange={setValue}
      language={language}
      height={320}
      title={chinese ? "项目说明" : "Project notes"}
      labels={chinese ? codeEditorLabelsZhCN : undefined}
      plugins={plugins}
    />
  );
}
