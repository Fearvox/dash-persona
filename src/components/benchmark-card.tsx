'use client';

import type { BenchmarkResult, MetricBenchmark } from '@/lib/engine';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import { t } from '@/lib/i18n';

interface BenchmarkCardProps {
  benchmarkResult: BenchmarkResult & { niche: string; nicheLabel: string };
  /** Current creator profile to add/remove from comparison. */
  profile?: CreatorProfile;
  /** Called when the user clicks "Add to Compare". */
  onAddToCompare?: (profile: CreatorProfile) => void;
  /** True when this profile is already in the comparison set. */
  isInComparison?: boolean;
}

export default function BenchmarkCard({
  benchmarkResult,
  profile,
  onAddToCompare,
  isInComparison,
}: BenchmarkCardProps) {
  const { metrics, nicheLabel, summary } = benchmarkResult;

  return (
    <div className="card p-5">
      <h3
        className="kicker mb-4 text-[var(--text-secondary)]"
      >
        {t('ui.components.vsBenchmark', { niche: nicheLabel })}
      </h3>

      <div className="flex flex-col gap-3">
        {metrics.map((m) => (
          <MetricRow key={m.metric} metric={m} />
        ))}
      </div>

      <p
        className="mt-4 text-xs leading-relaxed text-[var(--text-subtle)]"
      >
        {summary}
      </p>

      {profile && onAddToCompare && (
        <button
          type="button"
          onClick={() => onAddToCompare(profile)}
          className={`mt-4 w-full rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            isInComparison
              ? 'bg-[rgba(126,_210,_154,_0.15)] text-[var(--accent-green)] border border-[rgba(126,_210,_154,_0.3)]'
              : 'bg-[rgba(126,_210,_154,_0.08)] text-[var(--text-secondary)] border border-[rgba(126,_210,_154,_0.15)] hover:border-[rgba(126,_210,_154,_0.4)]'
          }`}
        >
          {isInComparison ? 'In comparison' : 'Add to Compare'}
        </button>
      )}
    </div>
  );
}

function MetricRow({ metric }: { metric: MetricBenchmark }) {
  const rankColor =
    metric.rank === 'above'
      ? 'var(--accent-green)'
      : metric.rank === 'below'
        ? 'var(--accent-red)'
        : 'var(--text-subtle)';

  const rankArrow =
    metric.rank === 'above' ? '↑' : metric.rank === 'below' ? '↓' : '―';

  const barWidth = Math.max(2, Math.min(metric.percentile, 100));
  const barColor = metric.percentile >= 50 ? 'var(--accent-green)' : 'var(--accent-red)';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-[var(--text-secondary)]">
          {metric.metric}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xs tabular-nums text-[var(--text-primary)]">
            {formatMetricValue(metric.userValue, metric.metric)}
          </span>
          <span className="text-xs text-[var(--text-subtle)]">
            vs {formatMetricValue(metric.benchmarkMean, metric.metric)}
          </span>
          <span className="text-xs font-medium" style={{ color: rankColor }}>
            {rankArrow}
          </span>
        </div>
      </div>

      {/* Percentile bar */}
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-[var(--bg-primary)]"
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${barWidth}%`, background: barColor }}
        />
      </div>
    </div>
  );
}

function formatMetricValue(value: number, metricName: string): string {
  if (metricName === 'Engagement Rate') {
    return `${(value * 100).toFixed(1)}%`;
  }
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  if (value >= 1_000) return value.toLocaleString();
  return String(value);
}
