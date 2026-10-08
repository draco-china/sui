"use client";

import type { Monaco } from "@monaco-editor/react";
import { cn } from "cn";
import {
  Columns2,
  Eye,
  EyeOff,
  FileCode2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { editor } from "monaco-editor";
import {
  type ComponentProps,
  type ComponentType,
  createContext,
  lazy,
  type ReactNode,
  type Ref,
  type RefObject,
  Suspense,
  type UIEvent,
  type UIEventHandler,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useClipboard } from "../hooks/use-clipboard";
import { useFullscreen } from "../hooks/use-fullscreen";
import { useViewerTheme } from "../hooks/use-viewer-theme";
import { useGlassEnabled } from "../lib/glass/context";
import type { ViewerThemes } from "../lib/viewer/shiki";
import { useShikiThemes } from "../lib/viewer/shiki-context";
import type { Button } from "./button";
import { CopyIcon } from "./copy-icon";
import { GlassSurface } from "./glass";

type ButtonSize = ComponentProps<typeof Button>["size"];

import { useEditorModelPath, useEditorValue } from "../hooks/use-editor-state";
import { ViewerButton as TooltipButton } from "../lib/viewer/controls";
import { HtmlViewer } from "./html-viewer";
import { MarkdownViewer } from "./markdown-viewer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

type EditorTheme = "light" | "dark";
type MonacoEditorInstance = editor.IStandaloneCodeEditor;
export type EditorViewMode = "edit" | "preview" | "split";
export type EditorFullscreenMode = "fixed" | "screen";

type EditorToolbarSlot =
  | ReactNode
  | ((context: EditorToolbarActionContext) => ReactNode);

export interface EditorToolbarActionContext {
  value: string;
  disabled: boolean;
  language: string;
  theme: EditorTheme;
  size?: ButtonSize;
  mode: EditorViewMode;
  hasPreview: boolean;
  isSplitView: boolean;
  fullscreen: boolean;
  fullscreenMode: EditorFullscreenMode;
  editor: MonacoEditorInstance | null;
  format: () => void;
  setMode: (mode: EditorViewMode) => void;
  setFullscreen: (fullscreen: boolean) => void;
}

export type EditorLanguageOption = { value: string; label: string };

const EDITOR_LANGUAGE_NAMES: Readonly<Record<string, string>> = {
  plaintext: "Plain text",
  css: "CSS",
  go: "Go",
  html: "HTML",
  java: "Java",
  javascript: "JavaScript",
  json: "JSON",
  markdown: "Markdown",
  python: "Python",
  rust: "Rust",
  shell: "Shell",
  sql: "SQL",
  tsx: "TSX",
  typescript: "TypeScript",
  yaml: "YAML",
};
const DEFAULT_EDITOR_LANGUAGES = Object.entries(EDITOR_LANGUAGE_NAMES).map(
  ([value, label]) => ({ value, label }),
);
function normalizeEditorLanguage(value: string) {
  const id = value.trim().toLowerCase();
  if (!id) return "plaintext";
  switch (id) {
    case "ts":
      return "typescript";
    case "js":
      return "javascript";
    case "md":
      return "markdown";
    case "text":
      return "plaintext";
    default:
      return id;
  }
}
function editorLanguageLabel(value: string) {
  if (Object.hasOwn(EDITOR_LANGUAGE_NAMES, value))
    return EDITOR_LANGUAGE_NAMES[value];
  return value;
}

export interface EditorProps {
  readonly value?: string;
  readonly onChange?: (value: string) => void;
  readonly disabled?: boolean;
  readonly language?: string;
  readonly onLanguageChange?: (language: string) => void;
  readonly languages?: readonly EditorLanguageOption[];
  readonly toolbarLanguage?: boolean;
  readonly className?: string;
  readonly glass?: boolean;
  readonly defaultValue?: string;
  readonly height?: string | number;
  readonly size?: ButtonSize;
  readonly toolbar?: false | EditorToolbarSlot;
  readonly toolbarTitle?: EditorToolbarSlot;
  readonly toolbarMode?: boolean;
  readonly toolbarCopy?: boolean;
  readonly labels?: Partial<EditorLabels>;
  readonly fullscreen?:
    | false
    | {
        readonly value?: boolean;
        readonly defaultValue?: boolean;
        readonly onChange?: (fullscreen: boolean) => void;
        readonly mode?: EditorFullscreenMode;
      };
  readonly preview?: {
    readonly component: ComponentType<{
      readonly content: string;
      readonly language: string;
      readonly scrollContainerRef?: Ref<HTMLDivElement>;
      readonly onScroll?: UIEventHandler<HTMLDivElement>;
    }>;
    readonly mode?: EditorViewMode;
    readonly defaultMode?: EditorViewMode;
    readonly onModeChange?: (mode: EditorViewMode) => void;
  };
}

export type EditorLabels = {
  copied: string;
  copyFailed: string;
  loading: string;
  loadingPreview: string;
  language: string;
  error: string;
  preview: string;
  hidePreview: string;
  split: string;
  copy: string;
  fullscreen: string;
  exitFullscreen: string;
};

const DEFAULT_EDITOR_LABELS: EditorLabels = {
  copied: "Copied",
  copyFailed: "Copy failed",
  loading: "Loading editor",
  loadingPreview: "Loading preview…",
  language: "Language",
  error: "Unable to load editor",
  preview: "Preview",
  hidePreview: "Hide preview",
  split: "Split",
  copy: "Copy",
  fullscreen: "Fullscreen",
  exitFullscreen: "Exit fullscreen",
};

export function EditorToolbarButton({
  size = "icon-sm",
  variant = "ghost",
  className,
  ...props
}: Readonly<ComponentProps<typeof TooltipButton>>) {
  return (
    <TooltipButton
      size={size}
      variant={variant}
      className={cn(
        "text-muted-foreground hover:bg-background/70 hover:text-foreground [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}

const HtmlPreviewScrollContext = createContext<{
  setElement: (element: HTMLElement | null) => void;
  onScroll: (element: HTMLElement) => void;
} | null>(null);

const MonacoEditor = lazy(() => import("../lib/editor/monaco-client"));
async function applyShadcnTheme(
  monaco: Monaco,
  theme: EditorTheme,
  element: HTMLElement,
  name: string,
  isCurrent: () => boolean,
  language: string,
  themes: ViewerThemes,
) {
  const { applyEditorTheme } = await import("../lib/editor/monaco-theme");
  await applyEditorTheme(
    monaco,
    theme,
    element,
    name,
    isCurrent,
    language,
    themes,
  );
}

function useEditorState({
  value,
  defaultValue,
  onChange,
  disabled,
  language = "plaintext",
  theme,
  themeName,
  themes,
  rootRef,
  size,
  height,
  fullscreen,
  preview,
}: Pick<
  EditorProps,
  | "value"
  | "defaultValue"
  | "onChange"
  | "disabled"
  | "language"
  | "size"
  | "height"
  | "fullscreen"
  | "preview"
> & {
  theme: EditorTheme;
  themeName: string;
  themes: ViewerThemes;
  rootRef: RefObject<HTMLDivElement | null>;
}) {
  const { resolvedValue, handleChange } = useEditorValue({
    value,
    defaultValue,
    onChange,
    disabled,
  });
  const [uncontrolledMode, setUncontrolledMode] = useState<EditorViewMode>(
    () => {
      if (!preview) return "edit";
      return preview.defaultMode ?? "split";
    },
  );
  const PreviewComponent = preview?.component;
  const hasPreview = !!PreviewComponent;
  const controlledMode = preview?.mode;
  const onPreviewModeChange = preview?.onModeChange;
  const effectiveMode: EditorViewMode = hasPreview
    ? (controlledMode ?? uncontrolledMode)
    : "edit";
  const showEditorPane = effectiveMode !== "preview";
  const showPreviewPane = hasPreview && effectiveMode !== "edit";
  const isSplitView = showEditorPane && showPreviewPane;
  const fullscreenOption =
    typeof fullscreen === "object" ? fullscreen : undefined;
  const fullscreenMode = fullscreenOption?.mode ?? "fixed";
  const fullscreenState = useFullscreen({
    fullscreen: fullscreenOption?.value,
    defaultFullscreen: fullscreenOption?.defaultValue,
    onFullscreenChange: fullscreenOption?.onChange,
    mode: fullscreenMode,
    ref: rootRef,
  });
  const isFixedFullscreen =
    fullscreenState.fullscreen && fullscreenMode === "fixed";
  const isScreenFullscreen =
    fullscreenState.fullscreen && fullscreenMode === "screen";
  const previewScroll = useEditorPreviewScrollSync();
  const monacoEditor = useMonacoEditor({
    disabled,
    language,
    theme,
    themeName,
    themes,
    elementRef: rootRef,
    previewScroll,
  });
  const hasExplicitHeight = height !== undefined;
  const contentHeight = typeof height === "number" ? `${height}px` : height;
  const contentStyle =
    hasExplicitHeight && !fullscreenState.fullscreen
      ? { height: contentHeight }
      : undefined;
  const rootStyle =
    isFixedFullscreen && hasExplicitHeight
      ? { height: contentHeight }
      : undefined;

  const setMode = useCallback(
    (nextMode: EditorViewMode) => {
      const next = hasPreview ? nextMode : "edit";
      if (controlledMode === undefined) setUncontrolledMode(next);
      onPreviewModeChange?.(next);
    },
    [controlledMode, hasPreview, onPreviewModeChange],
  );

  useEffect(() => {
    previewScroll.setSyncEnabled(isSplitView);
  }, [isSplitView, previewScroll.setSyncEnabled]);

  const toolbarContext: EditorToolbarActionContext = {
    value: resolvedValue,
    disabled: disabled ?? false,
    language,
    theme,
    size,
    mode: effectiveMode,
    hasPreview,
    isSplitView,
    fullscreen: fullscreenState.fullscreen,
    fullscreenMode,
    editor: monacoEditor.currentEditor,
    format: monacoEditor.handleFormat,
    setMode,
    setFullscreen: fullscreenState.setFullscreen,
  };

  return {
    resolvedValue,
    rootRef: fullscreenState.ref,
    fullscreen: fullscreenState.fullscreen,
    isFixedFullscreen,
    isScreenFullscreen,
    setFullscreen: fullscreenState.setFullscreen,
    contentStyle,
    contentFillsParent: fullscreenState.fullscreen || !hasExplicitHeight,
    rootStyle,
    PreviewComponent,
    hasPreview,
    effectiveMode,
    showEditorPane,
    showPreviewPane,
    isSplitView,
    toolbarContext,
    editorRef: monacoEditor.editorRef,
    previewScroll,
    handleChange,
    handleMount: monacoEditor.handleMount,
    setMode,
  };
}

function useMonacoEditor({
  disabled,
  language,
  theme,
  themeName,
  themes,
  elementRef,
  previewScroll,
}: {
  disabled?: boolean;
  language: string;
  themes: ViewerThemes;
  theme: EditorTheme;
  themeName: string;
  elementRef: RefObject<HTMLDivElement | null>;
  previewScroll: ReturnType<typeof useEditorPreviewScrollSync>;
}) {
  const themeRef = useRef({ theme, name: themeName });
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const [currentEditor, setCurrentEditor] =
    useState<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const themeGeneration = useRef(0);
  const { scrollDisposableRef, syncPreviewFromEditor } = previewScroll;

  const updateTheme = useCallback(
    (monaco: Monaco, nextTheme: EditorTheme, name: string) => {
      const element = elementRef.current;
      if (!element) return;
      const generation = ++themeGeneration.current;
      applyShadcnTheme(
        monaco,
        nextTheme,
        element,
        name,
        () =>
          themeGeneration.current === generation &&
          elementRef.current === element &&
          element.isConnected,
        language,
        themes,
      ).catch(() => {});
    },
    [elementRef, language, themes],
  );

  useEffect(
    () => () => {
      themeGeneration.current++;
    },
    [],
  );

  useEffect(() => {
    themeRef.current = { theme, name: themeName };
  }, [theme, themeName]);

  const handleMount = useCallback(
    (editor: MonacoEditorInstance, monaco: Monaco) => {
      editorRef.current = editor;
      setCurrentEditor(editor);
      monacoRef.current = monaco;
      scrollDisposableRef.current?.dispose();
      scrollDisposableRef.current = editor.onDidScrollChange(() =>
        syncPreviewFromEditor(editor),
      );
      const currentTheme = themeRef.current;
      updateTheme(monaco, currentTheme.theme, currentTheme.name);
    },
    [scrollDisposableRef, syncPreviewFromEditor, updateTheme],
  );

  useEffect(() => {
    const monaco = monacoRef.current;
    if (monaco) updateTheme(monaco, theme, themeName);
  }, [theme, themeName, updateTheme]);

  const handleFormat = useCallback(() => {
    if (disabled) return;
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  }, [disabled]);

  return {
    editorRef,
    currentEditor,
    handleMount,
    handleFormat,
  };
}

function useEditorPreviewScrollSync() {
  const previewPaneRef = useRef<HTMLDivElement | null>(null);
  const previewScrollElementRef = useRef<HTMLElement | null>(null);
  const scrollDisposableRef = useRef<{ dispose: () => void } | null>(null);
  const syncSourceRef = useRef<"editor" | "preview" | null>(null);
  const syncEnabledRef = useRef(false);

  const setPreviewScrollElement = useCallback((node: HTMLElement | null) => {
    previewScrollElementRef.current = node;
  }, []);

  const releaseSyncLock = useCallback(() => {
    window.requestAnimationFrame(() => {
      syncSourceRef.current = null;
    });
  }, []);

  const syncPreviewFromEditor = useCallback(
    (editor: MonacoEditorInstance) => {
      if (!syncEnabledRef.current || syncSourceRef.current === "preview")
        return;
      const previewElement =
        previewScrollElementRef.current ?? previewPaneRef.current;
      if (!previewElement) return;

      const editorMaxScrollTop = Math.max(
        editor.getScrollHeight() - editor.getLayoutInfo().height,
        0,
      );
      const previewMaxScrollTop = Math.max(
        previewElement.scrollHeight - previewElement.clientHeight,
        0,
      );
      if (editorMaxScrollTop <= 0 || previewMaxScrollTop <= 0) return;

      syncSourceRef.current = "editor";
      previewElement.scrollTop =
        (editor.getScrollTop() / editorMaxScrollTop) * previewMaxScrollTop;
      releaseSyncLock();
    },
    [releaseSyncLock],
  );

  const syncEditorFromPreview = useCallback(
    (previewElement: HTMLElement, editor: MonacoEditorInstance | null) => {
      if (
        !syncEnabledRef.current ||
        syncSourceRef.current === "editor" ||
        !editor
      )
        return;

      const previewMaxScrollTop = Math.max(
        previewElement.scrollHeight - previewElement.clientHeight,
        0,
      );
      const editorMaxScrollTop = Math.max(
        editor.getScrollHeight() - editor.getLayoutInfo().height,
        0,
      );
      if (previewMaxScrollTop <= 0 || editorMaxScrollTop <= 0) return;

      syncSourceRef.current = "preview";
      editor.setScrollTop(
        (previewElement.scrollTop / previewMaxScrollTop) * editorMaxScrollTop,
      );
      releaseSyncLock();
    },
    [releaseSyncLock],
  );

  const handlePreviewScroll = useCallback(
    (event: UIEvent<HTMLDivElement>, editor: MonacoEditorInstance | null) => {
      syncEditorFromPreview(event.currentTarget, editor);
    },
    [syncEditorFromPreview],
  );

  const setSyncEnabled = useCallback((enabled: boolean) => {
    syncEnabledRef.current = enabled;
  }, []);

  useEffect(() => () => scrollDisposableRef.current?.dispose(), []);

  return {
    previewPaneRef,
    scrollDisposableRef,
    setPreviewScrollElement,
    syncPreviewFromEditor,
    handlePreviewScroll,
    syncEditorFromPreview,
    setSyncEnabled,
  };
}

export function Editor({
  value,
  onChange,
  disabled = false,
  language: requestedLanguage = "plaintext",
  onLanguageChange,
  languages = DEFAULT_EDITOR_LANGUAGES,
  toolbarLanguage = true,
  className,
  glass,
  defaultValue,
  height,
  size = "icon-sm",
  toolbar,
  toolbarTitle,
  toolbarMode = true,
  toolbarCopy = true,
  labels,
  fullscreen,
  preview,
}: Readonly<EditorProps>) {
  const glassEnabled = useGlassEnabled(glass);
  const language = normalizeEditorLanguage(requestedLanguage);
  const languageOptions = new Map<string, EditorLanguageOption>();
  for (const option of languages) {
    const value = normalizeEditorLanguage(option.value);
    if (value && !languageOptions.has(value))
      languageOptions.set(value, { value, label: option.label });
  }
  if (!languageOptions.has(language))
    languageOptions.set(language, {
      value: language,
      label: editorLanguageLabel(language),
    });
  const editorPath = useEditorModelPath(language);
  const text = { ...DEFAULT_EDITOR_LABELS, ...labels };
  const instanceId = useId()
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase();
  const rootRef = useRef<HTMLDivElement>(null);
  const [localDark, setLocalDark] = useState(false);
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const resolve = () => setLocalDark(node.closest(".dark") !== null);
    resolve();
    const observer = new MutationObserver(resolve);
    for (
      let ancestor: HTMLElement | null = node;
      ancestor;
      ancestor = ancestor.parentElement
    )
      observer.observe(ancestor, {
        attributes: true,
        attributeFilter: ["class"],
      });
    return () => observer.disconnect();
  }, []);
  const themes = useShikiThemes();
  const { resolvedTheme: appTheme } = useViewerTheme();
  const resolvedTheme = localDark ? "dark" : appTheme;
  // Keep the registered name stable while the async Shiki theme is rebuilt.
  // Monaco's React wrapper applies a changed `theme` prop synchronously.
  const themeName = `editor-${instanceId}`;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const editor = useEditorState({
    value,
    defaultValue,
    onChange,
    disabled,
    language,
    theme: resolvedTheme,
    themeName,
    themes,
    rootRef,
    size,
    height,
    fullscreen,
    preview:
      preview ??
      {
        html: { component: HtmlEditorPreview, defaultMode: "edit" as const },
        markdown: {
          component: MarkdownEditorPreview,
          defaultMode: "edit" as const,
        },
      }[language],
  });
  const { status: copyStatus, copy } = useClipboard(editor.resolvedValue);
  const PreviewComponent = editor.PreviewComponent;
  const defaultToolbarTitle = editorLanguageLabel(language);
  const previewModeActive = editor.effectiveMode === "preview";
  let copyTooltip = text.copy;
  if (copyStatus === "copied") {
    copyTooltip = text.copied;
  } else if (copyStatus === "error") {
    copyTooltip = text.copyFailed;
  }

  return (
    <div
      data-slot="editor"
      {...(editor.isFixedFullscreen
        ? { role: "dialog", "aria-modal": true, "aria-label": text.fullscreen }
        : {})}
      ref={editor.rootRef}
      className={cn(
        "min-h-0 w-full min-w-0",
        editor.contentFillsParent && "h-full",
        editor.isScreenFullscreen && "bg-background",
        className,
      )}
      style={editor.rootStyle}
    >
      <GlassSurface
        glass={glassEnabled}
        data-slot="editor-surface"
        className={cn(
          "flex min-h-0 w-full flex-col overflow-hidden rounded-2xl bg-muted/80 text-foreground text-sm ring-1 ring-border",
          editor.contentFillsParent && "h-full min-h-0",
          editor.isFixedFullscreen &&
            "fixed inset-0 z-50 h-full rounded-none border-0",
          editor.isScreenFullscreen && "h-screen rounded-none border-0",
        )}
      >
        {toolbar !== false && (
          <div className="flex min-h-10 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-border/70 border-b bg-muted/80 px-3 py-1">
            <FileCode2
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground/70"
            />
            <span
              className={cn(
                "min-w-0 truncate font-medium font-mono text-foreground/80 text-sm",
                "min-w-20 flex-1",
              )}
            >
              {typeof toolbarTitle === "function"
                ? (toolbarTitle(editor.toolbarContext) ?? defaultToolbarTitle)
                : (toolbarTitle ?? defaultToolbarTitle)}
            </span>
            <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1">
              {toolbarLanguage && onLanguageChange && (
                <Select
                  value={language}
                  disabled={disabled || languageOptions.size < 2}
                  items={Object.fromEntries(
                    [...languageOptions].map(([value, option]) => [
                      value,
                      option.label,
                    ]),
                  )}
                  onValueChange={(next) => {
                    if (next !== null && next !== language)
                      onLanguageChange(next);
                  }}
                >
                  <SelectTrigger
                    type="button"
                    size="sm"
                    aria-label={text.language}
                    className="max-w-36 bg-transparent text-muted-foreground"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...languageOptions.values()].map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {typeof toolbar === "function"
                ? toolbar(editor.toolbarContext)
                : toolbar}
              {editor.hasPreview && toolbarMode && (
                <>
                  <EditorToolbarButton
                    size={size}
                    variant={previewModeActive ? "secondary" : "ghost"}
                    tooltip={
                      previewModeActive ? text.hidePreview : text.preview
                    }
                    onClick={() =>
                      editor.setMode(previewModeActive ? "edit" : "preview")
                    }
                  >
                    {previewModeActive ? <EyeOff /> : <Eye />}
                  </EditorToolbarButton>
                  <EditorToolbarButton
                    size={size}
                    variant={editor.isSplitView ? "secondary" : "ghost"}
                    tooltip={text.split}
                    onClick={() =>
                      editor.setMode(
                        editor.effectiveMode === "split" ? "edit" : "split",
                      )
                    }
                  >
                    <Columns2 />
                  </EditorToolbarButton>
                </>
              )}
              {toolbarCopy && (
                <EditorToolbarButton
                  size={size}
                  variant="ghost"
                  tooltip={copyTooltip}
                  disabled={disabled || copyStatus === "pending"}
                  onClick={() => void copy(editor.toolbarContext.value)}
                >
                  <CopyIcon
                    status={copyStatus}
                    className={cn(
                      copyStatus === "copied" && "text-primary",
                      copyStatus === "error" && "text-destructive",
                    )}
                  />
                </EditorToolbarButton>
              )}
              {fullscreen !== false && (
                <EditorToolbarButton
                  size={size}
                  variant="ghost"
                  tooltip={
                    editor.fullscreen ? text.exitFullscreen : text.fullscreen
                  }
                  onClick={() => editor.setFullscreen(!editor.fullscreen)}
                >
                  {editor.fullscreen ? <Minimize2 /> : <Maximize2 />}
                </EditorToolbarButton>
              )}
            </div>
          </div>
        )}
        <div
          className={cn(
            "flex min-h-0",
            editor.contentFillsParent && "flex-1",
            editor.isSplitView && "divide-x divide-input",
          )}
          style={editor.contentStyle}
        >
          {editor.showEditorPane && (
            <div
              className={cn(
                "min-w-0 flex-1",
                editor.isSplitView ? "w-1/2" : "w-full",
              )}
            >
              {mounted ? (
                <Suspense
                  fallback={
                    <div className="size-full animate-pulse bg-muted motion-reduce:animate-none" />
                  }
                >
                  <MonacoEditor
                    key={editorPath}
                    loading={
                      <div
                        role="status"
                        className="size-full animate-pulse bg-muted motion-reduce:animate-none"
                      >
                        {text.loading}
                      </div>
                    }
                    errorLabel={text.error}
                    height="100%"
                    language={language}
                    path={editorPath}
                    value={editor.resolvedValue}
                    theme={themeName}
                    themeMode={resolvedTheme}
                    shikiThemes={themes}
                    themeElement={rootRef}
                    onMount={editor.handleMount}
                    onChange={(nextValue) =>
                      editor.handleChange(nextValue ?? "")
                    }
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      roundedSelection: false,
                      scrollBeyondLastLine: false,
                      scrollbar: {
                        vertical: "auto",
                        horizontal: "auto",
                        useShadows: false,
                        verticalScrollbarSize: 10,
                        horizontalScrollbarSize: 10,
                      },
                      automaticLayout: true,
                      readOnly: disabled,
                      domReadOnly: disabled,
                      padding: { top: 8, bottom: 8 },
                    }}
                  />
                </Suspense>
              ) : (
                <div
                  className="size-full animate-pulse bg-muted motion-reduce:animate-none"
                  role="status"
                  aria-label={text.loading}
                />
              )}
            </div>
          )}

          {editor.showPreviewPane && PreviewComponent && (
            <div
              ref={editor.previewScroll.previewPaneRef}
              onScroll={(event) =>
                editor.previewScroll.handlePreviewScroll(
                  event,
                  editor.editorRef.current,
                )
              }
              className={cn(
                "h-full overflow-auto bg-background [scrollbar-color:transparent_transparent] [scrollbar-width:thin] hover:[scrollbar-color:var(--editor-scrollbar-thumb)_transparent] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/35 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:size-2",
                editor.isSplitView ? "w-1/2" : "w-full",
              )}
            >
              <Suspense
                fallback={
                  <div className="animate-pulse p-4 text-muted-foreground text-sm motion-reduce:animate-none">
                    {text.loadingPreview}
                  </div>
                }
              >
                <HtmlPreviewScrollContext.Provider
                  value={{
                    setElement: editor.previewScroll.setPreviewScrollElement,
                    onScroll: (element) =>
                      editor.previewScroll.syncEditorFromPreview(
                        element,
                        editor.editorRef.current,
                      ),
                  }}
                >
                  <PreviewComponent
                    content={editor.resolvedValue}
                    language={language}
                    scrollContainerRef={
                      editor.previewScroll.setPreviewScrollElement
                    }
                    onScroll={(event) =>
                      editor.previewScroll.handlePreviewScroll(
                        event,
                        editor.editorRef.current,
                      )
                    }
                  />
                </HtmlPreviewScrollContext.Provider>
              </Suspense>
            </div>
          )}
        </div>
      </GlassSurface>
    </div>
  );
}

function HtmlEditorPreview({ content }: Readonly<{ content: string }>) {
  const port = useContext(HtmlPreviewScrollContext);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  useEffect(() => {
    const element =
      previewDocument?.scrollingElement ?? previewDocument?.documentElement;
    if (
      !port ||
      !previewDocument ||
      !element ||
      element.namespaceURI !== "http://www.w3.org/1999/xhtml"
    )
      return;
    const scrollElement = element as HTMLElement;
    port.setElement(scrollElement);
    const scroll = () => port.onScroll(scrollElement);
    previewDocument.addEventListener("scroll", scroll, {
      passive: true,
      capture: true,
    });
    previewDocument.defaultView?.addEventListener("scroll", scroll, {
      passive: true,
    });
    return () => {
      port.setElement(null);
      previewDocument.removeEventListener("scroll", scroll, true);
      previewDocument.defaultView?.removeEventListener("scroll", scroll);
    };
  }, [port, previewDocument]);
  return (
    <HtmlViewer
      ref={frameRef}
      content={content}
      sandbox="allow-same-origin"
      onLoad={() => {
        try {
          setPreviewDocument(frameRef.current?.contentDocument ?? null);
        } catch {
          setPreviewDocument(null);
        }
      }}
    />
  );
}

function MarkdownEditorPreview({ content }: Readonly<{ content: string }>) {
  return <MarkdownViewer className="p-4" content={content} />;
}
