"use client";

import {
  Editor,
  type EditorProps,
  type EditorViewMode,
} from "@workspace/ui/components/editor";
import { MarkdownViewer } from "@workspace/ui/components/markdown-viewer";
import {
  type ComponentProps,
  createContext,
  useContext,
  useState,
} from "react";
import type { ExampleProps } from "../types";

type PreviewProps = ComponentProps<
  NonNullable<EditorProps["preview"]>["component"]
>;
const PreviewLocale = createContext(false);
const sections = Array.from({ length: 24 }, (_, index) => index + 1);
function Preview({ content, scrollContainerRef, onScroll }: PreviewProps) {
  const chinese = useContext(PreviewLocale);
  return (
    <div
      ref={scrollContainerRef}
      onScroll={onScroll}
      className="h-full overflow-auto p-4"
    >
      <MarkdownViewer
        content={content}
        labels={chinese ? { empty: "没有预览内容" } : undefined}
      />
    </div>
  );
}
export default function Example({ locale }: ExampleProps) {
  const chinese = locale === "zh-CN";
  const [mode, setMode] = useState<EditorViewMode>("split");
  const [value, setValue] = useState(() =>
    sections
      .map((section) =>
        chinese
          ? `## 第 ${section} 节\n\n在编辑区和预览区分别滚动，另一区域按可滚动距离的比例跟随。\n\n这一段用于产生真实的长内容。\n`
          : `## Section ${section}\n\nScroll either pane to synchronize its relative position with the other pane.\n\nThis paragraph creates real long-form content.\n`,
      )
      .join("\n"),
  );
  return (
    <PreviewLocale.Provider value={chinese}>
      <div className="grid w-full gap-3">
        <Editor
          value={value}
          onChange={setValue}
          language="markdown"
          height={360}
          toolbarTitle={chinese ? "自定义滚动预览" : "Custom scrolling preview"}
          preview={{ component: Preview, mode, onModeChange: setMode }}
          fullscreen={{ mode: "screen" }}
          labels={
            chinese
              ? {
                  copied: "已复制",
                  copyFailed: "复制失败",
                  loading: "正在加载编辑器",
                  loadingPreview: "正在加载预览",
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
        <output className="text-muted-foreground text-sm" aria-live="polite">
          {chinese ? "受控模式" : "Controlled mode"}: {mode}
        </output>
      </div>
    </PreviewLocale.Provider>
  );
}
