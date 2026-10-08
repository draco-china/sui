import type { Monaco } from "@monaco-editor/react";
import { shikiToMonaco, textmateThemeToMonacoTheme } from "@shikijs/monaco";
import type { editor, languages as MonacoLanguages } from "monaco-editor";
import {
  defaultViewerThemes,
  getViewerHighlighter,
  type ViewerThemes,
} from "../viewer/shiki";

const nativeMethods = new WeakMap<
  Monaco,
  { setTheme: Monaco["editor"]["setTheme"]; create: Monaco["editor"]["create"] }
>();
export function registerEditorHighlighter(
  highlighter: Parameters<typeof shikiToMonaco>[0],
  monaco: Monaco,
) {
  const loaded = new Set(highlighter.getLoadedLanguages());
  const registered: MonacoLanguages.ILanguageExtensionPoint[] =
    monaco.languages.getLanguages();
  const ids = new Set(registered.map((language) => language.id));
  const languages: Monaco["languages"] = {
    ...monaco.languages,
    getLanguages() {
      const aliases: { id: string }[] = [];
      for (const [alias, native] of [
        ["tsx", "typescript"],
        ["jsx", "javascript"],
      ])
        if (loaded.has(alias) && ids.has(native) && !ids.has(alias))
          aliases.push({ id: alias });
      return [...registered, ...aliases];
    },
    setTokensProvider(
      language: string,
      provider: Parameters<typeof MonacoLanguages.setTokensProvider>[1],
    ) {
      if (
        (language === "typescript" && loaded.has("tsx")) ||
        (language === "javascript" && loaded.has("jsx"))
      )
        return { dispose() {} };
      let modelLanguage = language;
      if (language === "tsx" && ids.has("typescript"))
        modelLanguage = "typescript";
      else if (language === "jsx" && ids.has("javascript"))
        modelLanguage = "javascript";
      return monaco.languages.setTokensProvider(modelLanguage, provider);
    },
  };
  shikiToMonaco(highlighter, { ...monaco, languages });
}

function cssVar(element: HTMLElement, name: string) {
  const raw = getComputedStyle(element).getPropertyValue(name).trim();
  if (!raw) return "";
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = raw;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  const hex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}${a < 255 ? hex(a) : ""}`;
}
export async function applyEditorTheme(
  monaco: Monaco,
  theme: "light" | "dark",
  element: HTMLElement,
  name: string,
  isCurrent: () => boolean,
  language: string,
  themes: ViewerThemes = defaultViewerThemes,
) {
  const { instance, themeName } = await getViewerHighlighter(
    language,
    theme,
    themes,
  );
  await getViewerHighlighter(
    language,
    theme === "dark" ? "light" : "dark",
    themes,
  );
  if (!isCurrent()) return;
  await instance.loadTheme({ ...instance.getTheme(themeName), name });
  if (!isCurrent()) return;
  let native = nativeMethods.get(monaco);
  if (!native) {
    native = { setTheme: monaco.editor.setTheme, create: monaco.editor.create };
    nativeMethods.set(monaco, native);
  }
  // Re-register newly loaded grammars without stacking Shiki's global wrappers.
  monaco.editor.setTheme = native.setTheme;
  monaco.editor.create = native.create;
  registerEditorHighlighter(instance, monaco);
  const base = textmateThemeToMonacoTheme(
    instance.getTheme(name),
  ) as editor.IStandaloneThemeData;
  const colors = base.colors ?? {};
  const bg =
    cssVar(element, "--background") || colors["editor.background"] || "#ffffff";
  const fg =
    cssVar(element, "--foreground") || colors["editor.foreground"] || "#222222";
  const muted = cssVar(element, "--muted") || bg;
  const border = cssVar(element, "--border") || fg;
  const accent = cssVar(element, "--accent") || muted;
  const primary = cssVar(element, "--primary") || fg;
  monaco.editor.defineTheme(name, {
    ...base,
    colors: {
      ...colors,
      "editor.background": bg,
      "editor.foreground": fg,
      "editor.lineHighlightBackground": muted,
      "editor.selectionBackground": `${primary.slice(0, 7)}33`,
      "editorCursor.foreground": fg,
      "editorIndentGuide.background1": border,
      "editorSuggestWidget.background": bg,
      "editorSuggestWidget.foreground": fg,
      "editorSuggestWidget.selectedBackground": accent,
      "editorHoverWidget.background": bg,
      "editorWidget.background": bg,
      "editorGutter.background": bg,
      "scrollbar.shadow": "#00000000",
    },
  });
  monaco.editor.setTheme(name);
}
