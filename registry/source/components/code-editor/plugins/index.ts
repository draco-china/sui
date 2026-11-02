import type { CodeEditorPlugin } from "@/components/ui/code-editor/types";
import { copy, fullscreen } from "@/components/ui/code-editor/plugins/toolbar-buttons";

export {
  type LanguageSelectOptions,
  languageSelect,
} from "@/components/ui/code-editor/plugins/language-select";
export { type PreviewOptions, preview } from "@/components/ui/code-editor/plugins/preview";
export { copy, format, fullscreen } from "@/components/ui/code-editor/plugins/toolbar-buttons";

/** Copy and fullscreen. Spread more plugins before or after it. */
export function defaultPlugins(): CodeEditorPlugin[] {
  return [copy(), fullscreen()];
}
