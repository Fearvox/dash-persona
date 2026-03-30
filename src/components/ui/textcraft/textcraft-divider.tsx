interface TextcraftDividerProps {
  label: string
}

export function TextcraftDivider({ label }: TextcraftDividerProps) {
  const LINE_WIDTH = 40
  const decorated = ` ◆ ${label.toUpperCase()} ◆ `
  const remaining = LINE_WIDTH - decorated.length
  const leftCount = Math.max(0, Math.floor(remaining / 2))
  const rightCount = Math.max(0, LINE_WIDTH - decorated.length - leftCount)
  const line = '─'.repeat(leftCount) + decorated + '─'.repeat(rightCount)

  return (
    <pre
      className="font-mono text-center text-[10px] leading-none animate-[breathe_4s_ease-in-out_infinite] motion-reduce:animate-none"
      style={{ color: 'var(--text-subtle)' }}
    >
      {line}
    </pre>
  )
}
