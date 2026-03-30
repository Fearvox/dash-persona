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

export function renderPortraitText(data: PortraitData): string {
  const barWidth = 10
  const lines: string[] = []

  // Identity box (heavy box drawing)
  lines.push('\u250F\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2513')
  lines.push('\u2503  CREATOR  ID     \u2503')
  lines.push('\u2523\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u252B')
  lines.push(`\u2503  \u2588\u2588 ${data.name.padEnd(12)}\u2503`)
  lines.push('\u2503                  \u2503')
  lines.push(`\u2503  \u25B8 ${data.platform.padEnd(13)}\u2503`)
  lines.push(`\u2503  \u25B8 ${data.window.padEnd(13)}\u2503`)
  lines.push('\u2517\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u251B')
  lines.push('')

  // Tags (light box drawing)
  if (data.tags.length > 0) {
    const tagCells = data.tags.map(t => ` ${t} `)
    lines.push('\u250C' + tagCells.map(t => '\u2500'.repeat(t.length)).join('\u252C') + '\u2510')
    lines.push('\u2502' + tagCells.join('\u2502') + '\u2502')
    lines.push('\u2514' + tagCells.map(t => '\u2500'.repeat(t.length)).join('\u2534') + '\u2518')
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
