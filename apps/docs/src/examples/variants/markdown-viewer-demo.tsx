"use client";
import {
  MarkdownViewer,
  markdownViewerLabelsZhCN,
} from "@workspace/ui/viewers/markdown-viewer";
import type { ExampleProps } from "../types";
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const content = chinese
    ? '# 发布说明\n\n支持 **Markdown**、表格和任务列表。\n\n> [!TIP]\n> 使用语义颜色构建一致的界面。\n\n| 组件 | 状态 |\n| --- | --- |\n| Editor | 就绪 |\n| Markdown Viewer | 就绪 |\n\n- [x] 双语文档\n- [ ] 发布\n\n```tsx\nconst theme = "bamboo";\n```'
    : '# Release notes\n\nSupports **Markdown**, tables, and task lists.\n\n> [!TIP]\n> Use semantic colors to keep interfaces consistent.\n\n| Component | Status |\n| --- | --- |\n| Editor | Ready |\n| Markdown Viewer | Ready |\n\n- [x] Bilingual docs\n- [ ] Release\n\n```tsx\nconst theme = "bamboo";\n```';
  return (
    <MarkdownViewer
      content={content}
      className="w-full"
      labels={chinese ? markdownViewerLabelsZhCN : undefined}
    />
  );
}
