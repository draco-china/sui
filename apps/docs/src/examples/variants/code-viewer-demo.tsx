"use client";
import { CodeViewer } from "@workspace/ui/components/code-viewer";
import type { ExampleProps } from "../types";

const code =
  'const colors = ["bamboo", "mauve", "mist"];\n\nexport function getTheme(name: string) {\n  if (colors.includes(name)) {\n    return { name, active: true };\n  }\n  return { name: "default", active: false };\n}';
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <CodeViewer
      code={code}
      lang="typescript"
      title="theme.ts"
      highlightLines={[4, 5]}
      maxHeight={240}
      labels={
        chinese
          ? {
              copy: "复制代码",
              loading: "正在高亮",
              error: "无法高亮代码",
              empty: "没有代码",
              expand: "展开",
              collapse: "折叠",
              writing: "正在编写",
              ready: "就绪",
              copied: "已复制",
              copyFailed: "复制失败",
            }
          : undefined
      }
    />
  );
}
