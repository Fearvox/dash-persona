import type { TextRenderer, GlyphGrid } from '../core/types'

export class DomTextRenderer implements TextRenderer<HTMLElement> {
  render(grid: GlyphGrid, container: HTMLElement): void {
    container.replaceChildren()
    container.style.position = 'relative'
    container.style.fontFamily = '"Geist Mono", monospace'
    container.style.lineHeight = '1'
    container.style.letterSpacing = '0'
    container.style.fontVariantLigatures = 'none'
    for (const glyph of grid.glyphs) {
      if (glyph.opacity <= 0) continue
      const span = document.createElement('span')
      span.textContent = glyph.char
      span.style.position = 'absolute'
      span.style.left = `${glyph.x}px`
      span.style.top = `${glyph.y}px`
      span.style.opacity = String(glyph.opacity)
      span.style.color = glyph.color
      span.style.fontSize = `${14 * glyph.scale}px`
      container.appendChild(span)
    }
  }

  clear(container: HTMLElement): void {
    container.replaceChildren()
  }
}
