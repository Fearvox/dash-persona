import { t } from '@/lib/i18n';
import type { NicheDetectionResult } from '@/lib/engine/niche-detect';
import { CATEGORY_TO_NICHE } from '@/lib/engine/niche-detect';
import type { BenchmarkNiche } from '@/lib/engine/benchmark-data';

// ---------------------------------------------------------------------------
// Reverse map: niche → categories (keywords)
// ---------------------------------------------------------------------------

function getKeywordsForNiche(niche: BenchmarkNiche): string[] {
  const keywords: string[] = [];
  for (const [category, mappedNiche] of Object.entries(CATEGORY_TO_NICHE)) {
    if (mappedNiche === niche) {
      keywords.push(category.replace(/_/g, ' '));
    }
  }
  return keywords;
}

// ---------------------------------------------------------------------------
// Confidence bar
// ---------------------------------------------------------------------------

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-[var(--accent-green)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-mono tabular-nums text-[var(--text-secondary)]">
        {pct}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NicheDetectCard
// ---------------------------------------------------------------------------

interface NicheDetectCardProps {
  result: NicheDetectionResult;
}

export default function NicheDetectCard({ result }: NicheDetectCardProps) {
  const keywords = getKeywordsForNiche(result.niche);

  return (
    <div className="card flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm bg-[rgba(126,210,154,0.12)] text-[var(--accent-green)]"
          aria-hidden="true"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8" cy="8" r="2" fill="currentColor" />
          </svg>
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            {t('ui.dashboard.nicheDetection')}
          </h3>
        </div>
      </div>

      {/* Niche label */}
      <p className="text-base font-semibold text-[var(--text-primary)]">
        {result.label}
      </p>

      {/* Confidence */}
      <div className="flex flex-col gap-1">
        <p className="text-xs text-[var(--text-subtle)]">
          {t('ui.components.confidence')}
        </p>
        <ConfidenceBar value={result.confidence} />
      </div>

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-[var(--text-subtle)]">
            {t('ui.components.relatedCategories')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="rounded-md px-2 py-0.5 text-xs font-medium bg-[rgba(126,210,154,0.08)] text-[var(--accent-green)]"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
