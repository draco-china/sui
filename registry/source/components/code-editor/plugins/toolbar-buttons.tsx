"use client";

import { cn } from "cn";
import { Maximize2, Minimize2, WandSparkles } from "lucide-react";
import { useClipboard } from "@/hooks/use-clipboard";
import { CopyIcon } from "@/components/ui/copy-icon";
import { useCodeEditorContext } from "@/components/ui/code-editor/context";
import { CodeEditorToolbarButton } from "@/components/ui/code-editor/toolbar";
import type { CodeEditorFullscreenConfig, CodeEditorPlugin } from "@/components/ui/code-editor/types";

function CopyButton() {
  const editor = useCodeEditorContext();
  const { status, copy } = useClipboard(editor.value);
  let tooltip = editor.labels.copy;
  if (status === "copied") tooltip = editor.labels.copied;
  else if (status === "error") tooltip = editor.labels.copyFailed;
  return (
    <CodeEditorToolbarButton
      tooltip={tooltip}
      disabled={editor.disabled || status === "pending"}
      onClick={() => void copy(editor.value)}
    >
      <CopyIcon
        status={status}
        className={cn(
          status === "copied" && "text-primary",
          status === "error" && "text-destructive",
        )}
      />
    </CodeEditorToolbarButton>
  );
}

/** A toolbar button that copies the current value. */
export function copy(): CodeEditorPlugin {
  return { name: "copy", toolbar: () => <CopyButton /> };
}

function FormatButton() {
  const editor = useCodeEditorContext();
  return (
    <CodeEditorToolbarButton
      tooltip={editor.labels.format}
      disabled={editor.disabled}
      onClick={editor.format}
    >
      <WandSparkles />
    </CodeEditorToolbarButton>
  );
}

/** A toolbar button that runs Monaco's document formatter. */
export function format(): CodeEditorPlugin {
  return { name: "format", toolbar: () => <FormatButton /> };
}

function FullscreenButton() {
  const editor = useCodeEditorContext();
  return (
    <CodeEditorToolbarButton
      tooltip={
        editor.fullscreen
          ? editor.labels.exitFullscreen
          : editor.labels.fullscreen
      }
      onClick={() => editor.setFullscreen(!editor.fullscreen)}
    >
      {editor.fullscreen ? <Minimize2 /> : <Maximize2 />}
    </CodeEditorToolbarButton>
  );
}

/**
 * A fullscreen toggle. `fixed` covers the viewport inside the page;
 * `screen` uses the browser Fullscreen API.
 */
export function fullscreen(
  options: CodeEditorFullscreenConfig = {},
): CodeEditorPlugin {
  return {
    name: "fullscreen",
    fullscreen: options,
    toolbar: () => <FullscreenButton />,
  };
}
