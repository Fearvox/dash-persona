'use client';

import { formatRelativeTime, isStale } from '@/lib/utils/relative-time';
import { getLocale } from '@/lib/i18n';

interface CollectedAtProps {
  timestamp: string; // ISO-8601
  className?: string;
}

export function CollectedAt({ timestamp, className }: CollectedAtProps) {
  const locale = getLocale();
  const relative = formatRelativeTime(timestamp, locale);
  const stale = isStale(timestamp, 7);

  return (
    <time
      dateTime={timestamp}
      title={new Date(timestamp).toLocaleString()}
      className={`font-mono text-[0.6875rem] tabular-nums ${
        stale ? 'text-[var(--accent-yellow)]' : 'text-[var(--text-subtle)]'
      } ${className ?? ''}`}
    >
      {relative}
    </time>
  );
}
