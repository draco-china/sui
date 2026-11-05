"use client";

import type { ReactNode } from "react";
import { CodeEditorContent } from "@/components/ui/code-editor/content";
import { defaultPlugins } from "@/components/ui/code-editor/plugins";
import { CodeEditorRoot } from "@/components/ui/code-editor/root";
import {
  CodeEditorActions,
  CodeEditorTitle,
  CodeEditorToolbar,
} from "@/components/ui/code-editor/toolbar";
import { type UseCodeEditorOptions, useCodeEditor } from "@/components/ui/code-editor/use-code-editor";

export interface CodeEditorProps extends UseCodeEditorOptions {
  readonly className?: string;
  /** Toolbar title. Defaults to the language name. */
  readonly title?: ReactNode;
  /** Extra toolbar actions before the plugins' items, or `false` to hide the toolbar. */
  readonly toolbar?: false | ReactNode;
}

const DEFAULT_PLUGINS = defaultPlugins();

/**
 * A Monaco code editor. Features come from `plugins`, which default to
 * copy and fullscreen. For custom layouts, compose `useCodeEditor` with
 * CodeEditorRoot, CodeEditorToolbar and CodeEditorContent.
 */
export function CodeEditor({
  className,
  title,
  toolbar,
  plugins = DEFAULT_PLUGINS,
  ...options
}: Readonly<CodeEditorProps>) {
  const editor = useCodeEditor({ ...options, plugins });
  return (
    <CodeEditorRoot editor={editor} className={className}>
      {toolbar !== false && (
        <CodeEditorToolbar>
          <CodeEditorTitle>{title}</CodeEditorTitle>
          <CodeEditorActions>{toolbar}</CodeEditorActions>
        </CodeEditorToolbar>
      )}
      <CodeEditorContent />
    </CodeEditorRoot>
  );
}
