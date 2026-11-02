"use client";
import {
  CodeViewer,
  codeViewerLabelsZhCN,
} from "@workspace/ui/viewers/code-viewer";
import type { ExampleProps } from "../types";

const code =
  'const colors = ["bamboo", "mauve", "mist"];\n\nexport function getTheme(name: string) {\n  if (colors.includes(name)) {\n    return { name, active: true };\n  }\n  return { name: "default", active: false };\n}';
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  return (
    <CodeViewer
      code={code}
      language="typescript"
      title="theme.ts"
      highlightLines={[4, 5]}
      maxHeight={240}
      labels={chinese ? codeViewerLabelsZhCN : undefined}
    />
  );
}
