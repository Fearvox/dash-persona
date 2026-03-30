const BRAILLE_DOTS: number[][] = [
  [0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80],
]
const BRAILLE_BASE = 0x2800
const ROWS_PER_CHAR = 4

export function renderBrailleLine(data: number[]): string {
  if (data.length === 0) return ''
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const charHeight = 2
  const totalRows = charHeight * ROWS_PER_CHAR
  const normalized = data.map(v => Math.round(((v - min) / range) * (totalRows - 1)))
  const charsWide = Math.ceil(normalized.length / 2)
  const rows: string[][] = Array.from({ length: charHeight }, () => Array(charsWide).fill(''))

  for (let i = 0; i < normalized.length; i++) {
    const charCol = Math.floor(i / 2)
    const dotCol = i % 2
    const level = normalized[i]
    const charRow = charHeight - 1 - Math.floor(level / ROWS_PER_CHAR)
    const dotRow = ROWS_PER_CHAR - 1 - (level % ROWS_PER_CHAR)
    for (let cr = 0; cr < charHeight; cr++) {
      if (!rows[cr][charCol]) rows[cr][charCol] = '\u2800'
      let code = rows[cr][charCol].codePointAt(0)! - BRAILLE_BASE
      if (cr === charRow) code |= BRAILLE_DOTS[dotRow][dotCol]
      rows[cr][charCol] = String.fromCodePoint(BRAILLE_BASE + code)
    }
  }
  return rows.map(row => row.join('')).join('\n')
}
