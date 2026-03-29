interface TextcraftLoaderProps {
  label?: string
  progress?: number
}

export function TextcraftLoader({ label = 'analyzing', progress }: TextcraftLoaderProps) {
  const BAR_WIDTH = 20

  let bar: string
  if (progress !== undefined) {
    const filled = Math.round(Math.max(0, Math.min(1, progress)) * BAR_WIDTH)
    const empty = BAR_WIDTH - filled
    bar = '█'.repeat(filled) + '░'.repeat(empty)
  } else {
    bar = '██████████░░░░░░░░░░'
  }

  const pct = progress !== undefined ? ` ${Math.round(progress * 100)}%` : ''
  const content = `[ ${bar} ]${pct}\n  — ${label} —`

  return (
    <pre
      className="font-mono text-center text-[11px] leading-tight animate-[pulse-strong_2s_ease-in-out_infinite] motion-reduce:animate-none"
      style={{ color: 'var(--accent-green)' }}
    >
      {content}
    </pre>
  )
}
