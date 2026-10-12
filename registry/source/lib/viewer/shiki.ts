import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { type BundledLanguage, bundledLanguages } from "shiki/langs";
import { type BundledTheme, bundledThemes } from "shiki/themes";

export type { ThemedToken } from "shiki/core";
export type ViewerThemes = { light: BundledTheme; dark: BundledTheme };
export const defaultViewerThemes: ViewerThemes = {
  light: "one-light",
  dark: "one-dark-pro",
};
const highlighter = createHighlighterCore({
  engine: createJavaScriptRegexEngine(),
  langs: [],
  themes: [],
});
const loadedLanguages = new Map<string, Promise<void>>();
const loadedThemes = new Map<BundledTheme, Promise<void>>();
export async function getViewerHighlighter(
  language: string,
  theme: "light" | "dark",
  themes: ViewerThemes = defaultViewerThemes,
) {
  const instance = await highlighter;
  const requested = language.trim().toLowerCase();
  const languageLoader = Object.hasOwn(bundledLanguages, requested)
    ? (
        bundledLanguages as Partial<
          Record<string, (typeof bundledLanguages)[BundledLanguage]>
        >
      )[requested]
    : undefined;
  const lang = languageLoader ? requested : "text";
  const themeName = themes[theme];
  let languageReady = Promise.resolve();
  if (languageLoader) {
    languageReady =
      loadedLanguages.get(lang) ??
      instance.loadLanguage(languageLoader()).catch((error) => {
        loadedLanguages.delete(lang);
        throw error;
      });
    loadedLanguages.set(lang, languageReady);
  }
  let themeReady = loadedThemes.get(themeName);
  if (!themeReady) {
    themeReady = instance
      .loadTheme(bundledThemes[themeName]())
      .catch((error) => {
        loadedThemes.delete(themeName);
        throw error;
      });
    loadedThemes.set(themeName, themeReady);
  }
  await Promise.all([languageReady, themeReady]);
  return { instance, lang, themeName };
}
export async function codeToViewerTokens(
  code: string,
  language: string,
  theme: "light" | "dark",
  themes: ViewerThemes = defaultViewerThemes,
) {
  const { instance, lang, themeName } = await getViewerHighlighter(
    language,
    theme,
    themes,
  );
  return instance.codeToTokensBase(code, { lang, theme: themeName });
}
