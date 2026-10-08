import { createThemeTokens as computeThemeTokens } from "@workspace/ui/lib/theme/palette";
import {
  createThemeTokens,
  getThemeId,
  normalizeHex,
  themePresets,
  themeTokenNames,
} from "@workspace/ui/lib/theme/theme";

declare const __THEME_PALETTE_SOURCE__: string;

const themePaletteSource =
  typeof __THEME_PALETTE_SOURCE__ === "undefined"
    ? `const createThemeTokens=${computeThemeTokens.toString()};`
    : __THEME_PALETTE_SOURCE__;

export type { ThemeMode } from "@workspace/ui/lib/theme/theme";
export {
  contrastRatio,
  createThemeTokens,
  normalizeHex,
  themePresets,
} from "@workspace/ui/lib/theme/theme";

export const THEME_STORAGE_KEY = "sui-docs-accent-v1";

export function readAccent(): string | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored ? normalizeHex(stored) : null;
  } catch {
    return null;
  }
}

export function saveAccent(seed: string | null): void {
  try {
    if (seed) localStorage.setItem(THEME_STORAGE_KEY, seed);
    else localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Theme selection still works for the current mounted view.
  }
}

export function applyAccent(seed: string | null, dark: boolean): void {
  const root = document.documentElement;
  root.dataset.color = getThemeId(seed);
  if (root.dataset.color === "custom" && seed) root.dataset.colorSeed = seed;
  else delete root.dataset.colorSeed;
  for (const name of themeTokenNames) root.style.removeProperty(name);
  if (getThemeId(seed) === "custom") {
    for (const [name, value] of Object.entries(createThemeTokens(seed, dark))) {
      root.style.setProperty(name, value);
    }
  }
}

export const themeBootstrapScript = `(()=>{let seed=null,mode='system';try{const value=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(value&&/^#[\\da-f]{6}$/i.test(value))seed=value.toUpperCase();mode=localStorage.getItem('theme')||'system'}catch{}const dark=mode==='dark'||(mode!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);const root=document.documentElement;root.classList.toggle('dark',dark);root.style.colorScheme=dark?'dark':'light';${themePaletteSource}const presets=${JSON.stringify(themePresets)};const preset=presets.find(preset=>preset.color===seed);root.dataset.color=seed===null?'default':preset?.id||'custom';if(root.dataset.color==='custom')root.dataset.colorSeed=seed;else delete root.dataset.colorSeed;for(const name of ${JSON.stringify(themeTokenNames)})root.style.removeProperty(name);if(root.dataset.color==='custom'){const tokens=createThemeTokens(seed,dark);for(const [name,value] of Object.entries(tokens))root.style.setProperty(name,value)}})()`;
