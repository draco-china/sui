import type { CodeEditorPlugin } from "../types";
import { copy, fullscreen } from "./toolbar-buttons";

export {
  type LanguageSelectOptions,
  languageSelect,
} from "./language-select";
export { type PreviewOptions, preview } from "./preview";
export { copy, format, fullscreen } from "./toolbar-buttons";

/** Copy and fullscreen. Spread more plugins before or after it. */
export function defaultPlugins(): CodeEditorPlugin[] {
  return [copy(), fullscreen()];
}
