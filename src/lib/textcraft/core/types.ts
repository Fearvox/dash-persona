/** A single positioned character with visual properties */
export interface Glyph {
  char: string
  x: number
  y: number
  opacity: number
  color: string
  scale: number
}

/** 2D grid of glyphs for rendering */
export interface GlyphGrid {
  glyphs: Glyph[]
  width: number
  height: number
}

/** Result from text measurement */
export interface MeasureResult {
  width: number
  height: number
  lineCount: number
}

/** A single measured text line */
export interface TextLine {
  text: string
  width: number
}

/** ASCII art font definition */
export interface AsciiFont {
  name: string
  charMap: Record<string, string[]>
  height: number
  spacing: number
}

/** Renderer interface — generic over target element type */
export interface TextRenderer<T extends HTMLElement = HTMLElement> {
  render(grid: GlyphGrid, target: T): void
  clear(target: T): void
}

/** Effect function — transforms glyphs per animation frame */
export type Effect = (frame: number, glyphs: Glyph[]) => Glyph[]

/** Options for Canvas text field keyword positioning */
export interface TextFieldKeyword {
  text: string
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
}
