"use client";

import { Columns2, Eye, EyeOff } from "lucide-react";
import { useCodeEditorContext } from "../context";
import { CodeEditorToolbarButton } from "../toolbar";
import type { CodeEditorPlugin, CodeEditorPreviewConfig } from "../types";

export interface PreviewOptions extends CodeEditorPreviewConfig {
  /** Show the preview and split toggles. Defaults to true. */
  readonly toggles?: boolean;
}

function PreviewToggles() {
  const editor = useCodeEditorContext();
  const previewing = editor.mode === "preview";
  return (
    <>
      <CodeEditorToolbarButton
        variant={previewing ? "secondary" : "ghost"}
        tooltip={previewing ? editor.labels.hidePreview : editor.labels.preview}
        onClick={() => editor.setMode(previewing ? "edit" : "preview")}
      >
        {previewing ? <EyeOff /> : <Eye />}
      </CodeEditorToolbarButton>
      <CodeEditorToolbarButton
        variant={editor.isSplitView ? "secondary" : "ghost"}
        tooltip={editor.labels.split}
        onClick={() =>
          editor.setMode(editor.mode === "split" ? "edit" : "split")
        }
      >
        <Columns2 />
      </CodeEditorToolbarButton>
    </>
  );
}

/**
 * A preview pane next to or instead of the editor. CodeEditor has no
 * built-in renderers: `render` returns any component, such as
 * `<MarkdownViewer content={value} />`. Scroll sync follows the pane, or
 * the element passed to `context.setScrollElement`.
 */
export function preview({
  toggles = true,
  ...config
}: PreviewOptions): CodeEditorPlugin {
  return {
    name: "preview",
    preview: config,
    toolbar: toggles ? () => <PreviewToggles /> : undefined,
  };
}
