"use client";

import { useCallback, useEffect, useRef } from "react";
import type { MonacoEditorInstance } from "./types";

function maxScrollTop(element: HTMLElement) {
  return Math.max(element.scrollHeight - element.clientHeight, 0);
}

function editorMaxScrollTop(editor: MonacoEditorInstance) {
  return Math.max(editor.getScrollHeight() - editor.getLayoutInfo().height, 0);
}

/** Keeps the editor and preview at the same relative scroll position. */
export function usePreviewScrollSync() {
  const previewPaneRef = useRef<HTMLDivElement | null>(null);
  const scrollElementRef = useRef<HTMLElement | null>(null);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const disposableRef = useRef<{ dispose: () => void } | null>(null);
  const sourceRef = useRef<"editor" | "preview" | null>(null);
  const enabledRef = useRef(false);

  const releaseLock = useCallback(() => {
    window.requestAnimationFrame(() => {
      sourceRef.current = null;
    });
  }, []);

  const syncFromEditor = useCallback(
    (editor: MonacoEditorInstance) => {
      if (!enabledRef.current || sourceRef.current === "preview") return;
      const preview = scrollElementRef.current ?? previewPaneRef.current;
      if (!preview) return;
      const editorMax = editorMaxScrollTop(editor);
      const previewMax = maxScrollTop(preview);
      if (editorMax <= 0 || previewMax <= 0) return;
      sourceRef.current = "editor";
      preview.scrollTop = (editor.getScrollTop() / editorMax) * previewMax;
      releaseLock();
    },
    [releaseLock],
  );

  const syncFromPreview = useCallback(
    (preview: HTMLElement) => {
      const editor = editorRef.current;
      if (!enabledRef.current || sourceRef.current === "editor" || !editor)
        return;
      const previewMax = maxScrollTop(preview);
      const editorMax = editorMaxScrollTop(editor);
      if (previewMax <= 0 || editorMax <= 0) return;
      sourceRef.current = "preview";
      editor.setScrollTop((preview.scrollTop / previewMax) * editorMax);
      releaseLock();
    },
    [releaseLock],
  );

  const attach = useCallback(
    (editor: MonacoEditorInstance) => {
      editorRef.current = editor;
      disposableRef.current?.dispose();
      disposableRef.current = editor.onDidScrollChange(() =>
        syncFromEditor(editor),
      );
    },
    [syncFromEditor],
  );

  const setScrollElement = useCallback((element: HTMLElement | null) => {
    scrollElementRef.current = element;
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  useEffect(() => () => disposableRef.current?.dispose(), []);

  return {
    previewPaneRef,
    editorRef,
    attach,
    setScrollElement,
    syncFromPreview,
    setEnabled,
  };
}
