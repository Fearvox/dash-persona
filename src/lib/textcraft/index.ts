// Core
export type {
  Glyph, GlyphGrid, TextLine, MeasureResult,
  AsciiFont, TextRenderer, Effect, TextFieldKeyword,
} from './core/types'
export { measureText, measureLines, initMeasure } from './core/measure'

// Fonts
export { registerFont, getFont, listFonts, clearFonts } from './fonts/registry'
import './fonts/dash-brand'
import './fonts/block-digits'

// Effects
export { drift } from './effects/drift'
export { assemble } from './effects/assemble'
export { composeEffects } from './effects/compose'

// Renderers
export { CanvasTextRenderer } from './renderers/canvas'
export { DomTextRenderer } from './renderers/dom'

// Composers
export { renderAsciiText } from './composers/ascii-logo'
export { renderProgressBar, renderColumnChart } from './composers/char-chart'
export { renderBrailleLine } from './composers/braille-line'
export { generateTextField } from './composers/text-field'
export type { TextFieldOptions } from './composers/text-field'
export { renderPortraitText } from './composers/data-portrait'
export type { PortraitData, PortraitMetric } from './composers/data-portrait'
