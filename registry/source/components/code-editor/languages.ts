export type CodeEditorLanguageOption = { value: string; label: string };

const LANGUAGE_NAMES: Readonly<Record<string, string>> = {
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

export const codeEditorLanguages: readonly CodeEditorLanguageOption[] =
  Object.entries(LANGUAGE_NAMES).map(([value, label]) => ({ value, label }));

/** Maps aliases such as `ts` or `md` to Monaco language ids. */
export function normalizeLanguage(value: string) {
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

export function languageLabel(value: string) {
  if (Object.hasOwn(LANGUAGE_NAMES, value)) return LANGUAGE_NAMES[value];
  return value;
}
