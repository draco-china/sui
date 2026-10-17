## [3.0.1](https://github.com/draco-china/sui/compare/v3.0.0...v3.0.1) (2026-10-17)

### Bug Fixes

* **tab-bar:** drop the hover fill on items ([fb0580e](https://github.com/draco-china/sui/commit/fb0580e12a8d8eb25e1f850725661d841fa2d235))

## [3.0.0](https://github.com/draco-china/sui/compare/v2.0.2...v3.0.0) (2026-10-17)

### ⚠ BREAKING CHANGES

* **ui:** mergeClassNames and className callbacks are gone;
pass a string className, and style state with data attributes.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
* **glass:** glassConfig, GlassContent, withoutGlass, the glass
context and the material option are gone; set `glass` or `frosted` on
each component that should use a material.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

### Features

* **glass:** split glass and frosted, with no inheritance ([09cdd35](https://github.com/draco-china/sui/commit/09cdd3555e023f17c46337231f50e8fd6957be7a))
* **theme:** scale the radius steps from --radius by Tailwind's defaults ([2fe0484](https://github.com/draco-china/sui/commit/2fe0484f201547498788cfd39b9054965648ac79))

### Code Refactoring

* **ui:** adopt withGlass and Tailwind v4 classes across components ([d3412d6](https://github.com/draco-china/sui/commit/d3412d66e59cc8f693c3be92347162fcf4799c8d))

## [2.0.2](https://github.com/draco-china/sui/compare/v2.0.1...v2.0.2) (2026-10-16)

### Bug Fixes

* **glass:** keep glyphs colored for a fill free of the text glow ([3ed2498](https://github.com/draco-china/sui/commit/3ed24987e1721afce652ca4e641eda1b8a614177))

## [2.0.1](https://github.com/draco-china/sui/compare/v2.0.0...v2.0.1) (2026-10-16)

### Bug Fixes

* **glass:** keep content layered on glass free of the text glow ([cfdfb22](https://github.com/draco-china/sui/commit/cfdfb22c41a4aad8d9e9f2f4c80265395feb2cc5))
* **glass:** keep edge clarity exact on wide-gamut screens ([173a0d7](https://github.com/draco-china/sui/commit/173a0d71c7efc78ad380a37d351703a99d0fec8a))
* **glass:** tighten the text glow so it hugs the glyphs ([bfa137d](https://github.com/draco-china/sui/commit/bfa137d0ddf2c1df591942153cd193e32137e4f5))

## [2.0.0](https://github.com/draco-china/sui/compare/v1.3.0...v2.0.0) (2026-10-15)

### ⚠ BREAKING CHANGES

* **glass:** GlassConfig no longer accepts mode or captureTarget, and
the vgpu, html-to-image and @webgpu/types dependencies are removed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

### Features

* **bottom-sheet:** add a bottom sheet with default and lg sizes ([d525885](https://github.com/draco-china/sui/commit/d525885a4ef514ce16c9bf39da75effd28fc098d))
* **clipboard-text:** add variants, glass and steady copy tooltips ([7de93fd](https://github.com/draco-china/sui/commit/7de93fd8d9e595d0fc04d2af355f0a060090526f))
* **glass:** render glass with SVG refraction and a CSS fallback ([a405e62](https://github.com/draco-china/sui/commit/a405e622bd6310c40448f00387d5c52832c465ec))
* **separator:** place text between two lines ([bb3d315](https://github.com/draco-china/sui/commit/bb3d315b59677ee1fde3d100db5ab2fa85c3edee))
* **tab-bar:** share equal widths, a neutral pill and a rubber-band lens ([0da090e](https://github.com/draco-china/sui/commit/0da090e95ace74e4632f333af6b471825c91f973))
* **theme:** draw borders with the translucent foreground color ([2eba822](https://github.com/draco-china/sui/commit/2eba8225bfd77e78c5f412ce4cdfef77e7372c8d))
* **toast:** show colorful toasts at the top center by default ([67f2466](https://github.com/draco-china/sui/commit/67f2466a890c8922e7eeb1987e8873c0d209cbc5))

### Bug Fixes

* **code-viewer:** translate folded line counts and skip empty resets ([9325fcf](https://github.com/draco-china/sui/commit/9325fcf05519c9a962676710654c9d9f2618d226))
* **image-viewer:** zoom by the wheel distance ([7350c46](https://github.com/draco-china/sui/commit/7350c46ffb0322d72d349d5bbf3f021d7cbabee3))
* **markdown-viewer:** keep raw HTML from restyling the page ([480a4ed](https://github.com/draco-china/sui/commit/480a4edd08fa503d803b5e32b2edd5a3c3ff126d))
* **qr-code:** keep the shown code until its replacement is ready ([1a77afd](https://github.com/draco-china/sui/commit/1a77afd4455835d730b14159981e891caa32d68d))

### Performance Improvements

* **editor:** keep Monaco options and the HTML preview port stable ([ef841f2](https://github.com/draco-china/sui/commit/ef841f2e8c5f49a42f0a4fab2f628ae2456d7a37))
* **glass:** recompute only the surfaces that change ([46e8739](https://github.com/draco-china/sui/commit/46e873979302cfe25fa5fa8f77e1c9573a6932c9))
* **navigation-menu:** keep the content's glass override stable ([abd51ea](https://github.com/draco-china/sui/commit/abd51ea96e00fb8c73c611049a40a6916080e24e))

## [1.3.0](https://github.com/draco-china/sui/compare/v1.2.0...v1.3.0) (2026-10-15)

### Features

* **glass:** add local materials and component playground ([8040f36](https://github.com/draco-china/sui/commit/8040f36794d2221b7e4a40ef8cc9a4e7b72202f4))

## [1.2.0](https://github.com/draco-china/sui/compare/v1.1.0...v1.2.0) (2026-10-12)

### Features

* **registry:** support GitHub registries ([56cdf08](https://github.com/draco-china/sui/commit/56cdf087bdab6de877426fec9cd314f0214bbf94))

## [1.1.0](https://github.com/draco-china/sui/compare/v1.0.0...v1.1.0) (2026-10-08)

### Features

* **docs:** showcase glass on an animated homepage ([0b7d9b7](https://github.com/draco-china/sui/commit/0b7d9b708ba7918a1cc2bb38e922ff4f6a53458c))
* **ui:** add shared three-tier glass fallback ([63d0e30](https://github.com/draco-china/sui/commit/63d0e30b5c0661ecb6a200dc9f13caa26cc6a688))
* **ui:** refine glass rendering and tab bar gestures ([58bcceb](https://github.com/draco-china/sui/commit/58bcceb7f1b474e6d9238e67d3c39f07e09ce4bf))

### Bug Fixes

* **ci:** let semantic-release evaluate all unreleased commits ([b36ff80](https://github.com/draco-china/sui/commit/b36ff806a0e33ebb79c6c36ff6120dbcd1caabcd))
* **docs:** pause automatic gestures during real interaction ([86175b7](https://github.com/draco-china/sui/commit/86175b72fdf162780bb4aaaba02d090d96f416e4))
* **ui:** balance glass highlights and outer shadows ([2928343](https://github.com/draco-china/sui/commit/2928343bb8f07998870e16972e25fdc22ffd6c0e))
* **ui:** keep glass contrast correction continuous ([cd77430](https://github.com/draco-china/sui/commit/cd774307aa407a96a37612aa78e68959a281de03))
* **ui:** repair client boundaries and component interaction contracts ([91de6ef](https://github.com/draco-china/sui/commit/91de6ef40a947a22d2340a3ecdb17be38e1a5e09))

## 1.0.0 (2026-10-08)

### Features

* **docs:** add bilingual documentation and AI guides ([b71f655](https://github.com/draco-china/sui/commit/b71f6558e7e15c519dd78eb26009c038601927c6))
* **registry:** support shadcn CLI and MCP distribution ([3e56d56](https://github.com/draco-china/sui/commit/3e56d563ff1e86b020cb727dfe37fa39fae38b26))
* **ui:** add shared components blocks and themes ([f01e936](https://github.com/draco-china/sui/commit/f01e936a1ee62010a6a4636dfe01cfbe864075a2))
