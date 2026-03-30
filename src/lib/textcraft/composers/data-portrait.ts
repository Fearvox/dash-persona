import { renderProgressBar } from './char-chart'
import { renderBrailleLine } from './braille-line'

export interface PortraitMetric {
  label: string
  value: number
  color: string
}

export interface PortraitData {
  name: string
  platform: string
  window: string
  tags: string[]
  metrics: PortraitMetric[]
  trendData: number[]
}

// ---------------------------------------------------------------------------
// CJK-aware monospace width helpers (mirrors page.tsx helpers for plain-text)
// ---------------------------------------------------------------------------

function charWidth(code: number): number {
  if (code >= 0x4e00 && code <= 0x9fff) return 2
  if (code >= 0x3400 && code <= 0x4dbf) return 2
  if (code >= 0xf900 && code <= 0xfaff) return 2
  if (code >= 0x20000 && code <= 0x2fa1f) return 2
  if (code >= 0xff01 && code <= 0xff60) return 2
  if (code >= 0xffe0 && code <= 0xffe6) return 2
  if (code >= 0xac00 && code <= 0xd7af) return 2
  if (code >= 0x3000 && code <= 0x33ff) return 2
  if (code >= 0x3200 && code <= 0x32ff) return 2
  return 1
}

function strWidth(s: string): number {
  let w = 0
  for (const ch of s) w += charWidth(ch.codePointAt(0)!)
  return w
}

function sliceCols(s: string, maxCols: number): string {
  let w = 0, i = 0
  for (const ch of s) {
    const cw = charWidth(ch.codePointAt(0)!)
    if (w + cw > maxCols) break
    w += cw
    i += ch.length
  }
  return s.slice(0, i)
}

function padEndCols(s: string, cols: number): string {
  const w = strWidth(s)
  return w >= cols ? s : s + ' '.repeat(cols - w)
}

// ---------------------------------------------------------------------------

export function renderPortraitText(data: PortraitData): string {
  const barWidth = 10
  const lines: string[] = []

  // Identity box (heavy box drawing) — CJK-aware padding
  const nameSliced = sliceCols(data.name, 12)
  lines.push('\u250F\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2513')
  lines.push('\u2503  CREATOR  ID     \u2503')
  lines.push('\u2523\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u252B')
  lines.push(`\u2503  \u2588\u2588 ${padEndCols(nameSliced, 12)}\u2503`)
  lines.push('\u2503                  \u2503')
  lines.push(`\u2503  \u25B8 ${padEndCols(sliceCols(data.platform, 13), 13)}\u2503`)
  lines.push(`\u2503  \u25B8 ${padEndCols(sliceCols(data.window, 13), 13)}\u2503`)
  lines.push('\u2517\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u251B')
  lines.push('')

  // Tags (light box drawing) — CJK-aware widths
  if (data.tags.length > 0) {
    const tagCells = data.tags.map(tg => ` ${tg} `)
    const widths = tagCells.map(c => strWidth(c))
    lines.push('\u250C' + widths.map(w => '\u2500'.repeat(w)).join('\u252C') + '\u2510')
    lines.push('\u2502' + tagCells.map((c, i) => padEndCols(c, widths[i])).join('\u2502') + '\u2502')
    lines.push('\u2514' + widths.map(w => '\u2500'.repeat(w)).join('\u2534') + '\u2518')
    lines.push('')
  }

  // Metrics
  lines.push('PERFORMANCE MATRIX')
  for (const m of data.metrics) {
    const bar = renderProgressBar(m.value, barWidth)
    const pct = `${Math.round(m.value * 100)}%`.padStart(4)
    lines.push(`${m.label.padEnd(6)}${bar} ${pct}`)
  }
  lines.push('')

  // Trend
  if (data.trendData.length > 0) {
    lines.push('30D TREND')
    lines.push(renderBrailleLine(data.trendData))
  }

  lines.push('')
  lines.push('DASH \u2014/ Creator Intelligence')
  return lines.join('\n')
}
