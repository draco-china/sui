"use client";

import {
  CodeEditor,
  type CodeEditorViewMode,
  codeEditorLabelsZhCN,
  copy,
  fullscreen,
  preview,
} from "@workspace/ui/components/code-editor";
import { MarkdownViewer } from "@workspace/ui/components/markdown-viewer";
import { useMemo, useState } from "react";
import type { ExampleProps } from "../types";

const sections = Array.from({ length: 24 }, (_, index) => index + 1);

export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [mode, setMode] = useState<CodeEditorViewMode>("split");
  const [value, setValue] = useState(() =>
    sections
      .map((section) =>
        chinese
          ? `## 第 ${section} 节\n\n在编辑区和预览区分别滚动，另一区域按可滚动距离的比例跟随。\n\n这一段用于产生真实的长内容。\n`
          : `## Section ${section}\n\nScroll either pane to synchronize its relative position with the other pane.\n\nThis paragraph creates real long-form content.\n`,
      )
      .join("\n"),
  );
  const plugins = useMemo(
    () => [
      // The preview pane scrolls, so sync needs no extra wiring.
      preview({
        mode,
        onModeChange: setMode,
        render: (content) => (
          <MarkdownViewer
            className="p-4"
            content={content}
            labels={chinese ? { empty: "没有预览内容" } : undefined}
          />
        ),
      }),
      copy(),
      fullscreen({ mode: "screen" }),
    ],
    [mode, chinese],
  );
  return (
    <div className="grid w-full gap-3">
      <CodeEditor
        value={value}
        onChange={setValue}
        language="markdown"
        height={360}
        title={chinese ? "滚动同步预览" : "Synchronized preview"}
        labels={chinese ? codeEditorLabelsZhCN : undefined}
        plugins={plugins}
      />
      <output className="text-muted-foreground text-sm" aria-live="polite">
        {chinese ? "受控模式" : "Controlled mode"}: {mode}
      </output>
    </div>
  );
}
