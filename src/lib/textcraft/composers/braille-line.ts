const BRAILLE_DOTS: number[][] = [
  [0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80],
]
const BRAILLE_BASE = 0x2800
const ROWS_PER_CHAR = 4

/**
 * Render a braille trendline from numeric data.
 *
 * Each data point maps to one dot-column (2 data points per braille character).
 * The area from the baseline up to the data point is filled, producing a solid
 * area-chart effect that is much easier to read than single-dot plotting.
 */
export function renderBrailleLine(data: number[]): string {
  if (data.length === 0) return ''
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const charHeight = 2
  const totalRows = charHeight * ROWS_PER_CHAR
  const normalized = data.map(v => Math.round(((v - min) / range) * (totalRows - 1)))
  const charsWide = Math.ceil(normalized.length / 2)
  const rows: string[][] = Array.from({ length: charHeight }, () =>
    Array.from({ length: charsWide }, () => String.fromCodePoint(BRAILLE_BASE))
  )

  for (let i = 0; i < normalized.length; i++) {
    const charCol = Math.floor(i / 2)
    const dotCol = i % 2
    const level = normalized[i]

    // Fill every dot-row from the bottom (row 0) up to `level` inclusive.
    // This turns the single-dot sparkline into a filled area chart.
    for (let absRow = 0; absRow <= level; absRow++) {
      const cr = charHeight - 1 - Math.floor(absRow / ROWS_PER_CHAR)
      const dr = ROWS_PER_CHAR - 1 - (absRow % ROWS_PER_CHAR)
      let code = rows[cr][charCol].codePointAt(0)! - BRAILLE_BASE
      code |= BRAILLE_DOTS[dr][dotCol]
      rows[cr][charCol] = String.fromCodePoint(BRAILLE_BASE + code)
    }
  }
  return rows.map(row => row.join('')).join('\n')
}
