import type { Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { ComponentProps, ReactNode, RefObject } from "react";
import type { ViewerThemes } from "../../lib/viewer/shiki";
import type { Button } from "../button";
import type { CodeEditorLabels } from "./labels";

export type CodeEditorTheme = "light" | "dark";
export type CodeEditorViewMode = "edit" | "preview" | "split";
export type CodeEditorFullscreenMode = "fixed" | "screen";
export type CodeEditorButtonSize = ComponentProps<typeof Button>["size"];
export type MonacoEditorInstance = editor.IStandaloneCodeEditor;
export type MonacoEditorOptions = editor.IStandaloneEditorConstructionOptions;

/** What a preview renderer receives besides the current value. */
export interface CodeEditorPreviewContext {
  readonly language: string;
  /**
   * Point scroll sync at an element other than the preview pane, such as
   * the document inside an iframe. Pass `null` to fall back to the pane.
   */
  setScrollElement(element: HTMLElement | null): void;
  /** Report a scroll of that element so the editor follows it. */
  syncFromPreview(element: HTMLElement): void;
}

export interface CodeEditorPreviewConfig {
  readonly render: (
    value: string,
    context: CodeEditorPreviewContext,
  ) => ReactNode;
  readonly mode?: CodeEditorViewMode;
  readonly defaultMode?: CodeEditorViewMode;
  readonly onModeChange?: (mode: CodeEditorViewMode) => void;
}

export interface CodeEditorFullscreenConfig {
  readonly mode?: CodeEditorFullscreenMode;
  readonly value?: boolean;
  readonly defaultValue?: boolean;
  readonly onChange?: (fullscreen: boolean) => void;
}

/**
 * Features beyond editing are plugins. `toolbar` renders in the toolbar's
 * action area in plugin order; `setup` runs as a hook under the provider.
 */
export interface CodeEditorPlugin {
  readonly name: string;
  readonly preview?: CodeEditorPreviewConfig;
  readonly fullscreen?: CodeEditorFullscreenConfig;
  readonly options?: MonacoEditorOptions;
  readonly toolbar?: (editor: CodeEditorInstance) => ReactNode;
  readonly setup?: (editor: CodeEditorInstance) => void;
}

export interface CodeEditorInstance {
  readonly value: string;
  readonly language: string;
  readonly disabled: boolean;
  readonly theme: CodeEditorTheme;
  readonly size: CodeEditorButtonSize;
  readonly labels: CodeEditorLabels;
  readonly plugins: readonly CodeEditorPlugin[];
  readonly mode: CodeEditorViewMode;
  readonly hasPreview: boolean;
  readonly isSplitView: boolean;
  readonly fullscreen: boolean;
  readonly fullscreenMode: CodeEditorFullscreenMode;
  /** The Monaco instance once it has mounted. */
  readonly editor: MonacoEditorInstance | null;
  hasPlugin(name: string): boolean;
  setValue(value: string): void;
  setMode(mode: CodeEditorViewMode): void;
  setFullscreen(fullscreen: boolean): void;
  format(): void;
  /** Internal wiring for CodeEditorRoot and CodeEditorContent. */
  readonly internal: CodeEditorInternal;
}

export interface CodeEditorInternal {
  readonly rootRef: RefObject<HTMLDivElement | null>;
  readonly rootStyle: { height: string | undefined } | undefined;
  readonly contentStyle: { height: string | undefined } | undefined;
  readonly fillsParent: boolean;
  readonly fixedFullscreen: boolean;
  readonly screenFullscreen: boolean;
  readonly showEditorPane: boolean;
  readonly showPreviewPane: boolean;
  readonly preview: CodeEditorPreviewConfig | undefined;
  readonly previewContext: CodeEditorPreviewContext;
  readonly previewPaneRef: RefObject<HTMLDivElement | null>;
  readonly onPreviewScroll: (element: HTMLElement) => void;
  readonly modelPath: string;
  readonly themeName: string;
  readonly shikiThemes: ViewerThemes;
  readonly options: MonacoEditorOptions;
  readonly onMount: (editor: MonacoEditorInstance, monaco: Monaco) => void;
  readonly onChange: (value: string) => void;
}
