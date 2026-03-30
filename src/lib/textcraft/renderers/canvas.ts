import type { TextRenderer, GlyphGrid } from '../core/types'

export class CanvasTextRenderer implements TextRenderer<HTMLCanvasElement> {
  private fontFamily: string

  constructor(fontFamily: string = '"Geist Mono", monospace') {
    this.fontFamily = fontFamily
  }

  render(grid: GlyphGrid, canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const glyph of grid.glyphs) {
      if (glyph.opacity <= 0) continue
      const fontSize = 14 * glyph.scale
      ctx.font = `500 ${fontSize}px ${this.fontFamily}`
      ctx.fillStyle = glyph.color
      ctx.globalAlpha = glyph.opacity
      ctx.fillText(glyph.char, glyph.x, glyph.y)
    }
    ctx.globalAlpha = 1
  }

  clear(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}
