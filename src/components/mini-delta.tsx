/**
 * Inline delta indicator for metrics.
 * Shows +/- change with color coding: green for positive, red for negative.
 */

interface MiniDeltaProps {
  /** The numeric change value. */
  value: number;
  /** Format: 'number' (default), 'percent', 'compact' */
  format?: 'number' | 'percent' | 'compact';
  /** Suffix to append (e.g. "pp" for percentage points). */
  suffix?: string;
  /** Extra CSS classes. */
  className?: string;
}

function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function MiniDelta({
  value,
  format = 'number',
  suffix = '',
  className = '',
}: MiniDeltaProps) {
  if (value === 0) return null;

  const sign = value > 0 ? '+' : '';
  const color = value > 0 ? 'var(--accent-green)' : 'var(--accent-red)';

  let display: string;
  if (format === 'percent') {
    display = `${sign}${(value * 100).toFixed(1)}%`;
  } else if (format === 'compact') {
    display = `${sign}${formatCompact(value)}`;
  } else {
    display = `${sign}${value}`;
  }

  return (
    <span
      className={`font-mono text-xs font-medium ${className}`}
      style={{ color }}
    >
      {display}{suffix}
    </span>
  );
}
