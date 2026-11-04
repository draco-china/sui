import type { BundledLanguage } from "shiki/langs";
import type { BundledTheme } from "shiki/themes";

export type { ThemedToken } from "shiki/core";
export type HighlightThemes = { light: BundledTheme; dark: BundledTheme };
export const defaultHighlightThemes: HighlightThemes = {
  light: "one-light",
  dark: "one-dark-pro",
};
let dependencies: ReturnType<typeof loadDependencies> | undefined;
async function loadDependencies() {
  const [core, regex, languages, themes] = await Promise.all([
    import("shiki/core"),
    import("shiki/engine/javascript"),
    import("shiki/langs"),
    import("shiki/themes"),
  ]);
  const instance = await core.createHighlighterCore({
    engine: regex.createJavaScriptRegexEngine(),
    langs: [],
    themes: [],
  });
  return {
    instance,
    bundledLanguages: languages.bundledLanguages,
    bundledThemes: themes.bundledThemes,
  };
}
function loadHighlighter() {
  dependencies ??= loadDependencies().catch((error) => {
    dependencies = undefined;
    throw error;
  });
  return dependencies;
}
const loadedLanguages = new Map<string, Promise<void>>();
const loadedThemes = new Map<BundledTheme, Promise<void>>();
export async function getHighlighter(
  language: string,
  theme: "light" | "dark",
  themes: HighlightThemes = defaultHighlightThemes,
) {
  const { instance, bundledLanguages, bundledThemes } = await loadHighlighter();
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
export async function codeToTokens(
  code: string,
  language: string,
  theme: "light" | "dark",
  themes: HighlightThemes = defaultHighlightThemes,
) {
  const { instance, lang, themeName } = await getHighlighter(
    language,
    theme,
    themes,
  );
  return instance.codeToTokensBase(code, { lang, theme: themeName });
}
