"use client";

import { cn } from "cn";
import type { ReactNode } from "react";
import { CodeEditorProvider } from "@/components/ui/code-editor/context";
import type { CodeEditorInstance } from "@/components/ui/code-editor/types";

export interface CodeEditorRootProps {
  readonly editor: CodeEditorInstance;
  readonly className?: string;
  readonly children?: ReactNode;
}

/** The surface and fullscreen container. Parts read `editor` from context. */
export function CodeEditorRoot({
  editor,
  className,
  children,
}: Readonly<CodeEditorRootProps>) {
  const { internal, labels } = editor;
  return (
    <CodeEditorProvider editor={editor}>
      <div
        data-slot="code-editor"
        {...(internal.fixedFullscreen
          ? {
              role: "dialog",
              "aria-modal": true,
              "aria-label": labels.fullscreen,
            }
          : {})}
        ref={internal.rootRef}
        className={cn(
          "min-h-0 w-full min-w-0",
          internal.fillsParent && "h-full",
          internal.screenFullscreen && "bg-background",
          className,
        )}
        style={internal.rootStyle}
      >
        <div
          data-slot="code-editor-surface"
          className={cn(
            "flex min-h-0 w-full flex-col overflow-hidden rounded-2xl bg-muted/80 text-foreground text-sm ring-1 ring-foreground/5 dark:ring-foreground/10",
            internal.fillsParent && "h-full min-h-0",
            internal.fixedFullscreen &&
              "fixed inset-0 z-50 h-full rounded-none border-0",
            internal.screenFullscreen && "h-screen rounded-none border-0",
          )}
        >
          {children}
        </div>
      </div>
    </CodeEditorProvider>
  );
}
