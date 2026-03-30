import type { StrategySuggestion, SuggestionPriority } from '@/lib/engine';
import { t } from '@/lib/i18n';

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
        className="card p-6 text-center text-sm text-[var(--text-subtle)]"
      >
        {t('ui.components.noStrategySuggestions')}
      </div>
    );
  }

  // Sort by priority weight (high first)
  const sorted = [...suggestions].sort(
    (a, b) => PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority],
  );

  return (
    <div className="flex flex-col gap-0">
      {sorted.map((s, idx) => {
        const accent = PRIORITY_ACCENT[s.priority];
        return (
          <div
            key={s.ruleId}
            className="flex gap-3 py-3"
            style={{
              borderBottom:
                idx < sorted.length - 1
                  ? '1px solid var(--border-subtle)'
                  : 'none',
            }}
          >
            {/* Priority dot */}
            <div
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ background: accent }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3
                  className="truncate text-sm font-medium leading-snug text-[var(--text-primary)]"
                >
                  {s.title}
                </h3>
                <span
                  className="shrink-0 text-xs font-medium uppercase"
                  style={{ color: accent }}
                >
                  {t(`priority.${s.priority}`)}
                </span>
              </div>
              <p
                className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]"
              >
                {s.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
