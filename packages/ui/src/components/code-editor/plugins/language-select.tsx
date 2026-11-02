"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectList,
  SelectTrigger,
  SelectValue,
} from "../../select";
import { useCodeEditorContext } from "../context";
import {
  type CodeEditorLanguageOption,
  codeEditorLanguages,
  languageLabel,
  normalizeLanguage,
} from "../languages";
import type { CodeEditorPlugin } from "../types";

export interface LanguageSelectOptions {
  readonly onChange: (language: string) => void;
  readonly languages?: readonly CodeEditorLanguageOption[];
}

function LanguageSelect({
  onChange,
  languages,
}: Readonly<Required<LanguageSelectOptions>>) {
  const editor = useCodeEditorContext();
  const options = new Map<string, string>();
  for (const option of languages) {
    const value = normalizeLanguage(option.value);
    if (!options.has(value)) options.set(value, option.label);
  }
  if (!options.has(editor.language))
    options.set(editor.language, languageLabel(editor.language));
  return (
    <Select
      value={editor.language}
      disabled={editor.disabled || options.size < 2}
      items={[...options].map(([value, label]) => ({ value, label }))}
      onValueChange={(next) => {
        if (next !== null && next !== editor.language) onChange(next);
      }}
    >
      <SelectTrigger
        type="button"
        size="sm"
        aria-label={editor.labels.language}
        className="w-fit max-w-36 bg-transparent text-muted-foreground"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectList>
          {[...options].map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectList>
      </SelectContent>
    </Select>
  );
}

/** A language picker. The parent owns `language` and updates it in `onChange`. */
export function languageSelect({
  onChange,
  languages = codeEditorLanguages,
}: LanguageSelectOptions): CodeEditorPlugin {
  return {
    name: "languageSelect",
    toolbar: () => <LanguageSelect onChange={onChange} languages={languages} />,
  };
}
