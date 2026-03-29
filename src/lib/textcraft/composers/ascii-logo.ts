import { getFont } from '../fonts/registry'

export function renderAsciiText(text: string, fontName: string): string {
  const font = getFont(fontName)
  if (!font) return ''
  const chars = text.toUpperCase().split('')
  const rows: string[] = Array.from({ length: font.height }, () => '')
  for (const char of chars) {
    const charRows = font.charMap[char] || font.charMap[' '] ||
      Array.from({ length: font.height }, () => ' '.repeat(font.spacing))
    for (let row = 0; row < font.height; row++) {
      rows[row] += (charRows[row] || '') + ' '.repeat(font.spacing)
    }
  }
  return rows.join('\n')
}
