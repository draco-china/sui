"use client";

import { Maximize2, Minimize2, WandSparkles } from "lucide-react";
import { CopyButton } from "../../copy-button";
import { useCodeEditorContext } from "../context";
import { CodeEditorToolbarButton } from "../toolbar";
import type { CodeEditorFullscreenConfig, CodeEditorPlugin } from "../types";

function EditorCopyButton() {
  const editor = useCodeEditorContext();
  return (
    <CopyButton
      value={editor.value}
      labels={editor.labels}
      size={editor.size}
      disabled={editor.disabled}
      className="[&_svg]:size-3.5"
    />
  );
}

/** A toolbar button that copies the current value. */
export function copy(): CodeEditorPlugin {
  return { name: "copy", toolbar: () => <EditorCopyButton /> };
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
