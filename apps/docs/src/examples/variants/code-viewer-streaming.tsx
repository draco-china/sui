"use client";
import { Button } from "@workspace/ui/components/button";
import {
  CodeViewer,
  codeViewerLabelsZhCN,
} from "@workspace/ui/viewers/code-viewer";
import { useEffect, useState } from "react";
import type { ExampleProps } from "../types";

const lines = [
  'const colors = ["bamboo", "mauve", "mist"];',
  "",
  "export function getTheme(name: string) {",
  "  if (colors.includes(name)) {",
  "    return { name, active: true };",
  "  }",
  '  return { name: "default", active: false };',
  "}",
  "",
  "export const settings = {",
  '  theme: "bamboo",',
  "  palettes: [",
  '    "bamboo",',
  '    "mauve",',
  '    "mist",',
  '    "sand",',
  '    "pine",',
  '    "rose",',
  "  ],",
  "  layout: {",
  '    density: "comfortable",',
  '    width: "content",',
  "  },",
  "};",
];
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [count, setCount] = useState(lines.length);
  const streaming = count < lines.length;
  useEffect(() => {
    if (!streaming) return;
    const timer = setTimeout(() => setCount(count + 1), 240);
    return () => clearTimeout(timer);
  }, [streaming, count]);
  return (
    <div className="grid w-full gap-3">
      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        disabled={streaming}
        onClick={() => setCount(1)}
      >
        {chinese ? "重新播放流式输入" : "Replay streaming input"}
      </Button>
      <CodeViewer
        code={lines.slice(0, count).join("\n")}
        status={streaming ? "streaming" : "complete"}
        language="typescript"
        title="theme.ts"
        wrap
        showLineNumbers={false}
        maxHeight={180}
        labels={chinese ? codeViewerLabelsZhCN : undefined}
      />
    </div>
  );
}
