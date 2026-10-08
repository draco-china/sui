"use client";
import {
  CodeViewer,
  ShikiProvider,
} from "@workspace/ui/components/code-viewer";
import type { ExampleProps } from "../types";

const themes = { light: "github-light", dark: "github-dark" } as const;
const languages = ["python", "sql"] as const;
const code =
  'def greeting(name: str):\n    return f"Hello, {name}"\n\nprint(greeting("SUI"))';
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <ShikiProvider themes={themes} languages={languages}>
      <div className="w-full rounded-xl bg-muted p-4">
        <CodeViewer
          code={code}
          lang="python"
          variant="plain"
          highlightLines={[2]}
          className="[--code-highlight-bg:var(--accent)]"
          labels={
            chinese
              ? {
                  copy: "复制代码",
                  copied: "已复制",
                  copyFailed: "复制失败",
                  loading: "正在高亮",
                  error: "无法高亮代码",
                  empty: "没有代码",
                  expand: "展开",
                  collapse: "折叠",
                  writing: "正在编写",
                  ready: "就绪",
                }
              : undefined
          }
        />
      </div>
    </ShikiProvider>
  );
}
