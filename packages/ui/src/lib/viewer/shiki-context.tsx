"use client";
import { createContext, type ReactNode, useContext, useEffect } from "react";
import type { BundledTheme } from "shiki/themes";
export interface ShikiProviderProps {
  children: ReactNode;
  themes?: { light: BundledTheme; dark: BundledTheme };
  languages?: readonly string[];
  onError?: (error: unknown) => void;
}
const defaultThemes = { light: "one-light", dark: "one-dark-pro" } as const;
const ShikiContext = createContext<{ light: BundledTheme; dark: BundledTheme }>(
  defaultThemes,
);
function ShikiProvider({
  children,
  themes = defaultThemes,
  languages,
  onError,
}: ShikiProviderProps) {
  useEffect(() => {
    let active = true;
    if (languages?.length)
      import("./shiki")
        .then(({ getViewerHighlighter }) =>
          Promise.all(
            languages.map((lang) =>
              Promise.all([
                getViewerHighlighter(lang, "light", themes),
                getViewerHighlighter(lang, "dark", themes),
              ]),
            ),
          ),
        )
        .catch((error) => {
          if (active) onError?.(error);
        });
    return () => {
      active = false;
    };
  }, [languages, themes, onError]);
  return (
    <ShikiContext.Provider value={themes}>{children}</ShikiContext.Provider>
  );
}
function useShikiThemes() {
  return useContext(ShikiContext);
}

export { ShikiProvider, useShikiThemes };
