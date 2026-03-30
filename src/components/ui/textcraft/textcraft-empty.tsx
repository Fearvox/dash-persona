interface TextcraftEmptyProps {
  message?: string
}

export function TextcraftEmpty({ message = 'no data yet' }: TextcraftEmptyProps) {
  const inner = ` ${message} `
  const width = inner.length
  const top = `┌${'─'.repeat(width)}┐`
  const mid = `│${inner}│`
  const bot = `└${'─'.repeat(width)}┘`

  return (
    <pre
      className="font-mono text-center text-[10px] leading-snug"
      style={{ color: 'var(--text-subtle)', opacity: 0.6 }}
    >
      {`${top}\n${mid}\n${bot}`}
    </pre>
  )
}
