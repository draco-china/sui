# Shared themes

`@workspace/ui/globals.css` provides the default tokens and seven reusable themes: `bamboo`, `mauve`, `mist`, `sand`, `pine`, `rose`, and `lime`. Choose a theme on the root or an individual container:

```html
<html data-color="bamboo">
```

Add the `dark` class for dark mode. Containers inherit dark mode from a `.dark` ancestor. Without a root `data-color`, or with `data-color="default"`, the Apple-inspired default light and dark tokens in `globals.css` apply: a pale gray canvas, white surfaces, and blue accents in light mode; deep gray surfaces and brighter blue accents in dark mode. Inter remains the shared font. Reset a root theme by choosing `default` and clearing any custom inline accent tokens; no separate default CSS file is needed. Background, text, borders, and destructive colors remain neutral or semantic across the seven themes; primary, accessible links, focus rings, selection, sidebar accents, and chart colors follow the selected palette.

The global stylesheet loads component styles and all seven built-in themes. For a Tailwind setup that already provides the SUI base tokens, import only the theme you need after its base stylesheet:

```css
@import "@workspace/ui/globals.css";
/* With an existing SUI base stylesheet, instead import:
   @import "@workspace/ui/themes/bamboo.css"; */
```

`@workspace/ui/lib/theme/theme` is the single source for the seven seed colors, bilingual names, five chart colors per palette, HEX normalization, and contrast calculation. The seven seed colors are `#727F65`, `#77608E`, `#4A5A69`, `#B8967A`, `#527A71`, `#D35C7C`, and `#D5F267`. Semantic CSS values and `createThemeTokens` output use OKLCH while seed inputs and preset definitions remain HEX. The conversion preserves the sRGB colors and contrast targets. Shared tokens contain no documentation or Fumadocs-specific variables; applications can map `accent-foreground` to accessible links and `ring` to focus indicators. Preset CSS is generated from that source and the default semantic tokens in `globals.css`:

```sh
bun run --cwd packages/ui themes:generate
```

Regenerate and commit the CSS files whenever theme definitions or default tokens change. Each theme is imported directly by `globals.css` and exported as an individual CSS file.

For custom HEX colors, keep the default base tokens and apply the shared dynamic accent tokens:

```tsx
import {
  createThemeTokens,
  getThemeId,
  normalizeHex,
  themeTokenNames,
} from "@workspace/ui/lib/theme/theme";

function selectTheme(input: string | null, dark: boolean) {
  const seed = input === null ? null : normalizeHex(input);
  if (input !== null && seed === null) return;
  const root = document.documentElement;
  const id = getThemeId(seed);
  root.dataset.color = id;
  root.classList.toggle("dark", dark);
  for (const name of themeTokenNames) root.style.removeProperty(name);
  if (id === "custom") {
    for (const [name, value] of Object.entries(createThemeTokens(seed, dark))) {
      root.style.setProperty(name, value);
    }
  }
}
```

Clearing prior inline accent tokens lets static preset CSS take over after a custom selection. Recalculate custom tokens when dark mode changes. Theme selection, storage, and framework providers remain application responsibilities.

The Lime theme pairs a bright `#D5F267` primary with black text, accessible olive links and focus rings, and a chart palette of deep olive, leaf green, lime, pale lime, and muted sage. It uses the same neutral light and dark surfaces as the other presets. Select it with `data-color="lime"`.
