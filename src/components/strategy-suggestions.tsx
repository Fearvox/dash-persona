import type { StrategySuggestion, SuggestionPriority } from '@/lib/engine';

interface StrategySuggestionsProps {
  suggestions: StrategySuggestion[];
}

const PRIORITY_WEIGHT: Record<SuggestionPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const PRIORITY_ACCENT: Record<SuggestionPriority, string> = {
  high: 'var(--accent-green)',
  medium: 'var(--accent-yellow)',
  low: 'var(--accent-blue)',
};

export default function StrategySuggestions({
  suggestions,
}: StrategySuggestionsProps) {
  if (suggestions.length === 0) {
    return (
      <div
        className="card p-6 text-center text-sm"
        style={{ color: 'var(--text-subtle)' }}
      >
        No strategy suggestions available yet. Add more data to unlock
        personalised recommendations.
      </div>
    );
  }

  // Sort by priority weight (high first), then by relevance within same priority
  const sorted = [...suggestions].sort(
    (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority],
  );

  // Split into 3 equal-width columns
  const columns: StrategySuggestion[][] = [[], [], []];
  sorted.forEach((s, i) => {
    columns[i % 3].push(s);
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {columns.map((col, colIdx) => (
        <div key={colIdx} className="flex flex-col gap-0">
          {col.map((s, idx) => {
            const accent = PRIORITY_ACCENT[s.priority];
            return (
              <div
                key={s.ruleId}
                className="flex gap-3 py-4"
                style={{
                  borderBottom:
                    idx < col.length - 1
                      ? '1px solid var(--border-subtle)'
                      : 'none',
                }}
              >
                {/* Priority indicator bar */}
                <div
                  className="mt-0.5 h-full w-0.5 shrink-0 rounded-full"
                  style={{ background: accent, minHeight: '2rem' }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className="text-sm font-medium leading-snug"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {s.title}
                    </h3>
                    <span
                      className="shrink-0 text-xs font-medium uppercase"
                      style={{ color: accent }}
                    >
                      {s.priority}
                    </span>
                  </div>
                  <p
                    className="mt-1 text-xs leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {s.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
