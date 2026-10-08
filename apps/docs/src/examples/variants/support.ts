import { useEffect, useState } from "react";

export type Translations = Record<
  string,
  { dir: "ltr" | "rtl"; values: Record<string, string> }
>;

// The upstream RTL galleries use their initial language as the preview language.
export function useTranslation(translations: Translations, language = "ar") {
  const entry = translations[language] ?? translations.en;
  return { language, dir: entry?.dir ?? "ltr", t: entry?.values ?? {} };
}

export type Language = "en" | "ar" | "he";

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}
