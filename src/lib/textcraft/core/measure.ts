import type { MeasureResult, TextLine } from './types'

let pretextModule: typeof import('@chenglou/pretext') | null = null

async function loadPretext() {
  if (!pretextModule && typeof window !== 'undefined') {
    pretextModule = await import('@chenglou/pretext')
  }
  return pretextModule
}

export function measureText(
  text: string, font: string, maxWidth: number, lineHeight: number = 20
): MeasureResult {
  if (typeof window === 'undefined' || !pretextModule) {
    const avgCharWidth = parseFloat(font) * 0.6
    const charsPerLine = Math.floor(maxWidth / avgCharWidth) || 1
    const lineCount = Math.ceil(text.length / charsPerLine)
    return { width: maxWidth, height: lineCount * lineHeight, lineCount }
  }
  const prepared = pretextModule.prepare(text, font)
  const result = pretextModule.layout(prepared, maxWidth, lineHeight)
  return { width: maxWidth, height: result.height, lineCount: result.lineCount }
}

export function measureLines(
  text: string, font: string, maxWidth: number, lineHeight: number = 20
): TextLine[] {
  if (typeof window === 'undefined' || !pretextModule) {
    const avgCharWidth = parseFloat(font) * 0.6
    const charsPerLine = Math.floor(maxWidth / avgCharWidth) || 1
    const lines: TextLine[] = []
    for (let i = 0; i < text.length; i += charsPerLine) {
      const lineText = text.slice(i, i + charsPerLine)
      lines.push({ text: lineText, width: lineText.length * avgCharWidth })
    }
    return lines
  }
  const prepared = pretextModule.prepareWithSegments(text, font)
  const { lines } = pretextModule.layoutWithLines(prepared, maxWidth, lineHeight)
  return lines.map(l => ({ text: l.text, width: l.width }))
}

export async function initMeasure(): Promise<void> {
  await loadPretext()
}
