# Textcraft Engine

Deterministic ASCII/glyph text rendering for DashPersona. No AI, no external fonts.

## Quick Start

```ts
import {
  renderAsciiText, renderProgressBar, renderBrailleLine,
  generateTextField, renderPortraitText,
  CanvasTextRenderer, DomTextRenderer,
  drift, assemble, composeEffects,
} from '@/lib/textcraft'
```

Fonts are auto-registered on import. No setup needed unless you add custom fonts.

## Composer Reference

| Function | Input | Output | Use case |
|---|---|---|---|
| `renderAsciiText(text, fontName)` | string + font name | multiline string | Landing hero, decorative headers |
| `renderProgressBar(value, width)` | 0–1 ratio, char count | string (█░) | Metric bars in portrait/detail |
| `renderColumnChart(values, opts)` | number[], height/gap | string[] rows | Inline mini bar charts |
| `renderBrailleLine(data)` | number[] | multiline string | 30-day trend sparkline |
| `generateTextField(keywords, opts)` | string[], width/height/seed | TextFieldKeyword[] | Floating keyword cloud for Canvas |
| `renderPortraitText(data)` | PortraitData | multiline string | Full creator data portrait block |

## Adding a Font

1. Create `src/lib/textcraft/fonts/my-font.ts`
2. Define an `AsciiFont` object: `{ name, charMap, height, spacing }`
3. Call `registerBuiltinFont(myFont)` at module level (survives `clearFonts()`)
4. Add `import './fonts/my-font'` to `index.ts`

```ts
import { registerBuiltinFont } from './registry'
import type { AsciiFont } from '../core/types'
const myFont: AsciiFont = { name: 'my-font', height: 3, spacing: 1, charMap: { 'A': ['▄█▄',...] } }
registerBuiltinFont(myFont)
```

## Adding an Effect

Effects are pure functions: `(frame: number, glyphs: Glyph[]) => Glyph[]`

```ts
import type { Effect } from '@/lib/textcraft'
export const pulse: Effect = (frame, glyphs) =>
  glyphs.map(g => ({ ...g, opacity: g.opacity * (0.8 + 0.2 * Math.sin(frame * 0.05)) }))
```

Chain effects with `composeEffects(drift, pulse)`.

## Adding a Renderer

Implement the `TextRenderer<T extends HTMLElement>` interface:

```ts
export class SvgTextRenderer implements TextRenderer<SVGElement> {
  render(grid: GlyphGrid, target: SVGElement): void { /* ... */ }
  clear(target: SVGElement): void { /* ... */ }
}
```

## Rendering Target Guide

| Renderer | Target | When to use |
|---|---|---|
| `CanvasTextRenderer` | `<canvas>` | Landing page animated backgrounds, text fields |
| `DomTextRenderer` | `<div>` | Data portrait, per-glyph opacity/color control |
| `<pre>` (plain string) | None | Static decorations, SSR-safe ASCII art |

## Measurement

`measureText` / `measureLines` fall back to estimated char widths in Node/SSR. For accurate browser layout call `await initMeasure()` once on mount before measuring.

## Color Tokens

```
--text-primary   #e8fff6   primary glyphs
--text-secondary #b8c4be   secondary / faded
--text-subtle    #8a9590   ghost / background noise
accent-green     #7ed29a   positive metrics
accent-red       #c87e7e   negative metrics
accent-yellow    #d2c87e   neutral / score
accent-blue      #7eb8d2   informational
highlight        #f0f545   DASH brand accent
```
