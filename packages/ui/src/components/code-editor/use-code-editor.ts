"use client";

import type { Monaco } from "@monaco-editor/react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useColorScheme } from "../../hooks/use-color-scheme";
import { useFullscreen } from "../../hooks/use-fullscreen";
import { useShikiThemes } from "../../lib/highlight/provider";
import type { HighlightThemes } from "../../lib/highlight/shiki";
import { type CodeEditorLabelOverrides, codeEditorLabels } from "./labels";
import { normalizeLanguage } from "./languages";
import { usePreviewScrollSync } from "./scroll-sync";
import type {
  CodeEditorButtonSize,
  CodeEditorInstance,
  CodeEditorPlugin,
  CodeEditorPreviewContext,
  CodeEditorTheme,
  CodeEditorViewMode,
  MonacoEditorInstance,
  MonacoEditorOptions,
} from "./types";

export interface UseCodeEditorOptions {
  readonly value?: string;
  readonly defaultValue?: string;
  readonly onChange?: (value: string) => void;
  readonly language?: string;
  readonly disabled?: boolean;
  /** Content height. Without it the editor fills its parent. */
  readonly height?: string | number;
  readonly size?: CodeEditorButtonSize;
  readonly labels?: CodeEditorLabelOverrides;
  readonly plugins?: readonly CodeEditorPlugin[];
  /** Monaco options, merged over the defaults and plugin options. */
  readonly options?: MonacoEditorOptions;
}

const NO_PLUGINS: readonly CodeEditorPlugin[] = [];
let nextModelId = 0;

const defaultOptions: MonacoEditorOptions = {
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
  padding: { top: 8, bottom: 8 },
};

async function applyShikiTheme(
  monaco: Monaco,
  theme: CodeEditorTheme,
  element: HTMLElement,
  name: string,
  isCurrent: () => boolean,
  language: string,
  themes: HighlightThemes,
) {
  const { applyEditorTheme } = await import("./monaco/monaco-theme");
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

function useEditorValue(
  value: string | undefined,
  defaultValue: string,
  onChange: ((value: string) => void) | undefined,
  disabled: boolean,
) {
  const [localValue, setLocalValue] = useState(value ?? defaultValue);
  useEffect(() => {
    if (value !== undefined) setLocalValue(value);
  }, [value]);
  const setValue = useCallback(
    (next: string) => {
      if (disabled) return;
      if (value === undefined) setLocalValue(next);
      onChange?.(next);
    },
    [disabled, onChange, value],
  );
  return [value ?? localValue, setValue] as const;
}

function useModelPath(language: string) {
  // Monaco keeps models process-wide by URI, including across separate React roots.
  // The path is only rendered after mount, so a client-local ID is sufficient.
  const [id] = useState(() => ++nextModelId);
  let extension = language;
  if (language === "typescript") extension = "ts";
  else if (language === "javascript") extension = "jsx";
  return `file:///code-editor-${id}/index.${extension}`;
}

/** Follows the nearest `.dark` ancestor, so scoped dark sections work. */
function useScopedTheme(element: { current: HTMLElement | null }) {
  const [localDark, setLocalDark] = useState(false);
  const { resolvedTheme } = useColorScheme();
  useEffect(() => {
    const node = element.current;
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
  }, [element]);
  const theme: CodeEditorTheme = localDark ? "dark" : resolvedTheme;
  return theme;
}

function cssSize(height: string | number | undefined) {
  if (typeof height === "number") return `${height}px`;
  return height;
}

export function useCodeEditor({
  value: controlledValue,
  defaultValue = "",
  onChange,
  language: requestedLanguage = "plaintext",
  disabled = false,
  height,
  size = "icon-sm",
  labels: labelOverrides,
  plugins = NO_PLUGINS,
  options,
}: UseCodeEditorOptions = {}): CodeEditorInstance {
  const language = normalizeLanguage(requestedLanguage);
  const labels = useMemo(
    () => ({ ...codeEditorLabels, ...labelOverrides }),
    [labelOverrides],
  );
  const [value, setValue] = useEditorValue(
    controlledValue,
    defaultValue,
    onChange,
    disabled,
  );
  const modelPath = useModelPath(language);
  // Keep the registered name stable while the async Shiki theme is rebuilt.
  // Monaco's React wrapper applies a changed `theme` prop synchronously.
  const themeName = `code-editor-${useId()
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toLowerCase()}`;
  const shikiThemes = useShikiThemes();
  const rootRef = useRef<HTMLDivElement>(null);
  const theme = useScopedTheme(rootRef);

  const previewConfig = plugins.find((plugin) => plugin.preview)?.preview;
  const fullscreenConfig = plugins.find(
    (plugin) => plugin.fullscreen,
  )?.fullscreen;

  // View mode
  const hasPreview = previewConfig !== undefined;
  const [uncontrolledMode, setUncontrolledMode] = useState<CodeEditorViewMode>(
    () => {
      if (!previewConfig) return "edit";
      return previewConfig.defaultMode ?? "split";
    },
  );
  let mode: CodeEditorViewMode = "edit";
  if (hasPreview) mode = previewConfig.mode ?? uncontrolledMode;
  const controlledMode = previewConfig?.mode;
  const onModeChange = previewConfig?.onModeChange;
  const setMode = useCallback(
    (next: CodeEditorViewMode) => {
      const resolved = hasPreview ? next : "edit";
      if (controlledMode === undefined) setUncontrolledMode(resolved);
      onModeChange?.(resolved);
    },
    [controlledMode, hasPreview, onModeChange],
  );
  const showEditorPane = mode !== "preview";
  const showPreviewPane = hasPreview && mode !== "edit";
  const isSplitView = showEditorPane && showPreviewPane;

  // Fullscreen
  const fullscreenMode = fullscreenConfig?.mode ?? "fixed";
  const fullscreenState = useFullscreen({
    fullscreen: fullscreenConfig?.value,
    defaultFullscreen: fullscreenConfig?.defaultValue,
    onFullscreenChange: fullscreenConfig?.onChange,
    mode: fullscreenMode,
    ref: rootRef,
  });
  const fullscreen = fullscreenState.fullscreen;
  const hasHeight = height !== undefined;
  const contentHeight = cssSize(height);
  const fixedFullscreen = fullscreen && fullscreenMode === "fixed";

  // Monaco
  const scroll = usePreviewScrollSync();
  const [monacoEditor, setMonacoEditor] = useState<MonacoEditorInstance | null>(
    null,
  );
  const monacoRef = useRef<Monaco | null>(null);
  const themeRef = useRef({ theme, name: themeName });
  const themeGeneration = useRef(0);

  useEffect(() => {
    themeRef.current = { theme, name: themeName };
  }, [theme, themeName]);

  useEffect(() => {
    scroll.setEnabled(isSplitView);
  }, [isSplitView, scroll.setEnabled]);

  useEffect(
    () => () => {
      themeGeneration.current++;
    },
    [],
  );

  const updateTheme = useCallback(
    (monaco: Monaco, nextTheme: CodeEditorTheme, name: string) => {
      const element = rootRef.current;
      if (!element) return;
      const generation = ++themeGeneration.current;
      applyShikiTheme(
        monaco,
        nextTheme,
        element,
        name,
        () =>
          themeGeneration.current === generation &&
          rootRef.current === element &&
          element.isConnected,
        language,
        shikiThemes,
      ).catch(() => {});
    },
    [language, shikiThemes],
  );

  useEffect(() => {
    const monaco = monacoRef.current;
    if (monaco) updateTheme(monaco, theme, themeName);
  }, [theme, themeName, updateTheme]);

  const onMount = useCallback(
    (instance: MonacoEditorInstance, monaco: Monaco) => {
      setMonacoEditor(instance);
      monacoRef.current = monaco;
      scroll.attach(instance);
      const current = themeRef.current;
      updateTheme(monaco, current.theme, current.name);
    },
    [scroll.attach, updateTheme],
  );

  const format = useCallback(() => {
    if (disabled) return;
    scroll.editorRef.current?.getAction("editor.action.formatDocument")?.run();
  }, [disabled, scroll.editorRef]);

  // Stable options, so Monaco does not re-apply them on every keystroke.
  // Memoize the plugin list for the same reason.
  const monacoOptions = useMemo<MonacoEditorOptions>(
    () =>
      Object.assign(
        {},
        defaultOptions,
        ...plugins.map((plugin) => plugin.options),
        options,
        { readOnly: disabled, domReadOnly: disabled },
      ),
    [disabled, options, plugins],
  );

  const previewContext = useMemo<CodeEditorPreviewContext>(
    () => ({
      language,
      setScrollElement: scroll.setScrollElement,
      syncFromPreview: scroll.syncFromPreview,
    }),
    [language, scroll.setScrollElement, scroll.syncFromPreview],
  );

  return {
    value,
    language,
    disabled,
    theme,
    size,
    labels,
    plugins,
    mode,
    hasPreview,
    isSplitView,
    fullscreen,
    fullscreenMode,
    editor: monacoEditor,
    hasPlugin: (name) => plugins.some((plugin) => plugin.name === name),
    setValue,
    setMode,
    setFullscreen: fullscreenState.setFullscreen,
    format,
    internal: {
      rootRef,
      rootStyle:
        fixedFullscreen && hasHeight ? { height: contentHeight } : undefined,
      contentStyle:
        hasHeight && !fullscreen ? { height: contentHeight } : undefined,
      fillsParent: fullscreen || !hasHeight,
      fixedFullscreen,
      screenFullscreen: fullscreen && fullscreenMode === "screen",
      showEditorPane,
      showPreviewPane,
      preview: previewConfig,
      previewContext,
      previewPaneRef: scroll.previewPaneRef,
      onPreviewScroll: scroll.syncFromPreview,
      modelPath,
      themeName,
      shikiThemes,
      options: monacoOptions,
      onMount,
      onChange: setValue,
    },
  };
}
