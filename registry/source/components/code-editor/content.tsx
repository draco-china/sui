"use client";

import { cn } from "cn";
import { lazy, Suspense, useEffect, useState } from "react";
import { useCodeEditorContext } from "@/components/ui/code-editor/context";

const MonacoEditor = lazy(() => import("@/lib/editor/monaco-client"));

function Skeleton({ label }: Readonly<{ label?: string }>) {
  return (
    <div
      role="status"
      aria-label={label}
      className="size-full animate-pulse bg-muted motion-reduce:animate-none"
    />
  );
}

/** The Monaco pane and, when a preview plugin is active, the preview pane. */
export function CodeEditorContent({
  className,
}: Readonly<{ className?: string }>) {
  const editor = useCodeEditorContext();
  const { internal, labels } = editor;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const half = editor.isSplitView ? "w-1/2" : "w-full";

  return (
    <div
      data-slot="code-editor-content"
      className={cn(
        "flex min-h-0",
        internal.fillsParent && "flex-1",
        editor.isSplitView && "divide-x divide-input",
        className,
      )}
      style={internal.contentStyle}
    >
      {internal.showEditorPane && (
        <div className={cn("min-w-0 flex-1", half)}>
          {mounted ? (
            <Suspense fallback={<Skeleton />}>
              <MonacoEditor
                key={internal.modelPath}
                loading={<Skeleton label={labels.loading} />}
                errorLabel={labels.error}
                wrapperProps={{ "data-slot": "code-editor-monaco" }}
                height="100%"
                language={editor.language}
                path={internal.modelPath}
                value={editor.value}
                theme={internal.themeName}
                themeMode={editor.theme}
                shikiThemes={internal.shikiThemes}
                themeElement={internal.rootRef}
                onMount={internal.onMount}
                onChange={(next) => internal.onChange(next ?? "")}
                options={internal.options}
              />
            </Suspense>
          ) : (
            <Skeleton label={labels.loading} />
          )}
        </div>
      )}
      {internal.showPreviewPane && internal.preview && (
        <div
          data-slot="code-editor-preview"
          ref={internal.previewPaneRef}
          onScroll={(event) => internal.onPreviewScroll(event.currentTarget)}
          className={cn(
            "scrollbar-thin h-full overflow-auto bg-background [scrollbar-color:transparent_transparent] hover:[scrollbar-color:var(--code-editor-scrollbar-thumb)_transparent] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/35 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:size-2",
            half,
          )}
        >
          <Suspense
            fallback={
              <div className="animate-pulse p-4 text-muted-foreground text-sm motion-reduce:animate-none">
                {labels.loadingPreview}
              </div>
            }
          >
            {internal.preview.render(editor.value, internal.previewContext)}
          </Suspense>
        </div>
      )}
    </div>
  );
}
