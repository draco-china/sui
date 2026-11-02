"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { CodeEditorInstance, CodeEditorPlugin } from "./types";

const CodeEditorContext = createContext<CodeEditorInstance | null>(null);

export function CodeEditorProvider({
  editor,
  children,
}: {
  editor: CodeEditorInstance;
  children: ReactNode;
}) {
  return (
    <CodeEditorContext.Provider value={editor}>
      {editor.plugins.map(
        (plugin) =>
          plugin.setup && (
            <PluginSetup key={plugin.name} plugin={plugin} editor={editor} />
          ),
      )}
      {children}
    </CodeEditorContext.Provider>
  );
}

/** Each plugin's hooks live in their own component, so plugins can change. */
function PluginSetup({
  plugin,
  editor,
}: {
  plugin: CodeEditorPlugin;
  editor: CodeEditorInstance;
}) {
  plugin.setup?.(editor);
  return null;
}

/** The editor from the nearest CodeEditor or CodeEditorRoot. */
export function useCodeEditorContext() {
  const editor = useContext(CodeEditorContext);
  if (!editor)
    throw new Error("CodeEditor parts must render inside CodeEditor");
  return editor;
}
