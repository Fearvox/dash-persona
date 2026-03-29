export function renderProgressBar(value: number, width: number = 10): string {
  const clamped = Math.max(0, Math.min(1, value))
  const filled = Math.round(clamped * width)
  return '\u2588'.repeat(filled) + '\u2591'.repeat(width - filled)
}

export function renderColumnChart(
  values: number[], opts: { height?: number; gap?: string } = {}
): string[] {
  const height = opts.height || 8
  const gap = opts.gap || ' '
  const rows: string[] = []
  for (let row = height; row > 0; row--) {
    const threshold = row / height
    rows.push(values.map(v => (v >= threshold ? '\u2588' : ' ')).join(gap))
  }
  return rows
}
