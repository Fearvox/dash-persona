import type { StrategySuggestion, SuggestionPriority } from '@/lib/engine';

interface StrategySuggestionsProps {
  suggestions: StrategySuggestion[];
}

const AREA_ICONS: Record<string, string> = {
  content_mix: '\u{1F3AF}', // target
  rhythm: '\u{23F0}',       // alarm clock
  cross_platform: '\u{1F310}', // globe
  engagement: '\u{1F4AC}',    // speech bubble
  growth: '\u{1F680}',        // rocket
};

const PRIORITY_STYLES: Record<
  SuggestionPriority,
  { border: string; badge: string; badgeText: string }
> = {
  high: {
    border: 'rgba(126, 210, 154, 0.2)',
    badge: 'rgba(126, 210, 154, 0.15)',
    badgeText: 'var(--accent-green)',
  },
  medium: {
    border: 'rgba(210, 200, 126, 0.2)',
    badge: 'rgba(210, 200, 126, 0.15)',
    badgeText: 'var(--accent-yellow)',
  },
  low: {
    border: 'var(--border-subtle)',
    badge: 'rgba(126, 184, 210, 0.15)',
    badgeText: 'var(--accent-blue)',
  },
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

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {suggestions.map((s) => {
        const styles = PRIORITY_STYLES[s.priority];
        const icon = AREA_ICONS[s.area] ?? '\u{2728}';

        return (
          <div
            key={s.ruleId}
            className="card p-5"
            style={{ borderColor: styles.border }}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl leading-none" aria-hidden="true">
                {icon}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3
                    className="text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {s.title}
                  </h3>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
                    style={{
                      background: styles.badge,
                      color: styles.badgeText,
                    }}
                  >
                    {s.priority}
                  </span>
                </div>
                <p
                  className="mt-1.5 text-xs leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {s.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
