import Link from 'next/link';
import type { PersonaScore, StrategySuggestion } from '@/lib/engine';
import { overallScore } from '@/lib/engine';
import { PLATFORM_LABELS, scoreColor } from '@/lib/utils/constants';
import { t } from '@/lib/i18n';
import PersonaBarChart from './persona-bar-chart';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_NAMES = [
  'ui.common.daySunday',
  'ui.common.dayMonday',
  'ui.common.dayTuesday',
  'ui.common.dayWednesday',
  'ui.common.dayThursday',
  'ui.common.dayFriday',
  'ui.common.daySaturday',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function momentumBadge(momentum: string) {
  const map: Record<string, { label: string; cls: string }> = {
    accelerating: { label: t('momentum.accelerating'), cls: 'badge-green' },
    steady: { label: t('momentum.steady'), cls: 'badge-yellow' },
    decelerating: { label: t('momentum.decelerating'), cls: 'badge-red' },
    insufficient_data: { label: t('momentum.insufficient_data'), cls: 'badge-yellow' },
  };
  const entry = map[momentum] ?? map.insufficient_data;
  return <span className={`badge ${entry.cls}`}>{entry.label}</span>;
}

function viralPotentialScore(score: PersonaScore): number {
  if (score.engagement.byCategory.length === 0) return 0;
  const bestRate = score.engagement.byCategory[0].meanEngagementRate;
  return Math.min(Math.round(bestRate * 100 * 6.67), 100);
}

function tagColor(confidence: number): { bg: string; text: string } {
  if (confidence >= 0.7)
    return { bg: 'rgba(126, 210, 154, 0.15)', text: 'var(--accent-green)' };
  if (confidence >= 0.4)
    return { bg: 'rgba(210, 200, 126, 0.15)', text: 'var(--accent-yellow)' };
  return { bg: 'rgba(126, 184, 210, 0.15)', text: 'var(--accent-blue)' };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PersonaDetailContentProps {
  score: PersonaScore;
  suggestions: StrategySuggestion[];
  platform: string;
  platforms: string[];
  source: string;
  personaType: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PersonaDetailContent({
  score,
  suggestions,
  platform,
  platforms,
  source,
  personaType,
}: PersonaDetailContentProps) {
  // Derived values
  const overall = overallScore(score);
  const viral = viralPotentialScore(score);

  const distEntries = Object.entries(score.contentDistribution)
    .sort((a, b) => b[1] - a[1]);

  const top3 = distEntries.slice(0, 3);
  const diversityIndex = distEntries.length;

  const bestHourLabel =
    score.rhythm.bestHour !== null
      ? `${String(score.rhythm.bestHour).padStart(2, '0')}:00 UTC`
      : 'N/A';
  const bestDay =
    score.rhythm.bestDayOfWeek !== null
      ? t(DAY_NAMES[score.rhythm.bestDayOfWeek])
      : t('ui.common.na');

  // Build search params for platform tabs
  function platformHref(p: string) {
    const sp = new URLSearchParams();
    if (source) sp.set('source', source);
    sp.set('persona', personaType);
    sp.set('platform', p);
    return `/persona?${sp.toString()}`;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      {/* a) Header */}
      <header className="flex flex-col gap-4">
        <Link
          href={`/dashboard?source=${source}&persona=${personaType}`}
          className="nav-pill"
          aria-label="Back to dashboard"
        >
          &larr; Dashboard
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            {t('ui.persona.title')}
          </h1>

          {/* Platform selector tabs */}
          <div
            className="flex rounded-lg bg-[var(--bg-secondary)] p-1"
            role="tablist"
          >
            {platforms.map((p) => {
              const isActive = p === platform;
              return (
                <Link
                  key={p}
                  href={platformHref(p)}
                  role="tab"
                  aria-selected={isActive}
                  className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${isActive ? 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-subtle)]' : 'bg-transparent text-[var(--text-subtle)] border border-transparent'}`}
                >
                  {PLATFORM_LABELS[p]}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* b) Overall persona score + momentum */}
      <section className="card p-6">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-8">
          <div className="flex flex-col items-center gap-1 sm:min-w-[140px]">
            <p
              className="metric-value text-4xl font-bold sm:text-5xl lg:text-6xl"
              style={{ color: scoreColor(overall) }}
            >
              {overall}
            </p>
            <p
              className="text-xs font-medium text-[var(--text-subtle)]"
            >
              {t('ui.persona.overallPersonaScore')}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-medium text-[var(--text-secondary)]"
              >
                {t('ui.persona.momentum')}
              </span>
              {momentumBadge(score.growthHealth.momentum)}
            </div>
            <p className="text-xs text-[var(--text-subtle)]">
              {PLATFORM_LABELS[platform]} &middot; {personaType} &middot;{' '}
              {t('ui.persona.postsAnalysed', { count: score.postsAnalysed })}
            </p>
          </div>
        </div>
      </section>

      {/* c) 6-dimension detail cards (2x3 grid) */}
      <section aria-labelledby="dimensions-heading">
        <h2 id="dimensions-heading" className="kicker mb-3">
          {t('ui.persona.dimensionBreakdown')}
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Content Mix */}
          <div className="card p-5">
            <p
              className="text-xs font-medium uppercase tracking-wider text-[var(--text-subtle)]"
            >
              {t('ui.persona.contentMix')}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {top3.map(([cat, pct]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className="capitalize text-[var(--text-secondary)]"
                    >
                      {cat}
                    </span>
                    <span
                      className="metric-value text-[var(--text-primary)]"
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]"
                  >
                    <div
                      className="h-full rounded-full bg-[var(--accent-green)] opacity-70"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="mt-1 text-xs text-[var(--text-subtle)]">
                {t('ui.persona.diversityIndex', { count: diversityIndex })}
              </p>
            </div>
          </div>

          {/* Engagement Profile */}
          <div className="card p-5">
            <p
              className="text-xs font-medium uppercase tracking-wider text-[var(--text-subtle)]"
            >
              {t('ui.persona.engagementProfile')}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">{t('ui.persona.avgRate')}</span>
                <span
                  className="metric-value text-lg font-semibold"
                  style={{
                    color: scoreColor(
                      Math.min(
                        Math.round(score.engagement.overallRate * 100 * 5),
                        100,
                      ),
                    ),
                  }}
                >
                  {(score.engagement.overallRate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">
                  {t('ui.persona.bestCategory')}
                </span>
                <span
                  className="capitalize text-[var(--text-primary)]"
                >
                  {score.engagement.bestCategory ?? 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">{t('ui.persona.trend')}</span>
                <span
                  className="font-medium"
                  style={{
                    color:
                      score.engagement.trend > 0
                        ? 'var(--accent-green)'
                        : score.engagement.trend < 0
                          ? 'var(--accent-red)'
                          : 'var(--text-subtle)',
                  }}
                >
                  {score.engagement.trend > 0 ? '\u2191' : score.engagement.trend < 0 ? '\u2193' : '\u2192'}{' '}
                  {(score.engagement.trend * 100).toFixed(2)}pp
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">
                  {t('ui.persona.viralPotential')}
                </span>
                <span
                  className="metric-value font-semibold"
                  style={{ color: scoreColor(viral) }}
                >
                  {viral}
                </span>
              </div>
            </div>
          </div>

          {/* Posting Rhythm */}
          <div className="card p-5">
            <p
              className="text-xs font-medium uppercase tracking-wider text-[var(--text-subtle)]"
            >
              {t('ui.persona.postingRhythm')}
            </p>
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">
                  {t('ui.persona.postsPerWeek')}
                </span>
                <span
                  className="metric-value text-lg font-semibold text-[var(--text-primary)]"
                >
                  {score.rhythm.postsPerWeek}
                </span>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">
                    {t('ui.persona.consistency')}
                  </span>
                  <span
                    className="metric-value font-medium"
                    style={{ color: scoreColor(score.rhythm.consistencyScore) }}
                  >
                    {score.rhythm.consistencyScore}/100
                  </span>
                </div>
                <div
                  className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-secondary)]"
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${score.rhythm.consistencyScore}%`,
                      background: scoreColor(score.rhythm.consistencyScore),
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">
                  {t('ui.persona.bestSlots')}
                </span>
                <span className="text-[var(--text-primary)]">
                  {bestDay}, {bestHourLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Persona Consistency */}
          <div className="card p-5">
            <p
              className="text-xs font-medium uppercase tracking-wider text-[var(--text-subtle)]"
            >
              {t('ui.persona.personaConsistency')}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <p
                className="metric-value text-2xl font-bold sm:text-3xl"
                style={{ color: scoreColor(score.consistency.score) }}
              >
                {score.consistency.score}
                <span className="text-sm font-normal">/100</span>
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {score.consistency.isConsistent
                  ? t('ui.persona.stableIdentity')
                  : t('ui.persona.diverseTopics')}
              </p>
              {score.consistency.dominantCategory && (
                <p className="text-xs text-[var(--text-subtle)]">
                  {t('ui.persona.dominant')}:{' '}
                  <span className="capitalize">
                    {score.consistency.dominantCategory}
                  </span>{' '}
                  ({score.consistency.dominantCategoryPct}%)
                </p>
              )}
            </div>
          </div>

          {/* Growth Health */}
          <div className="card p-5">
            <p
              className="text-xs font-medium uppercase tracking-wider text-[var(--text-subtle)]"
            >
              {t('ui.persona.growthHealth')}
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">
                  {t('ui.persona.followerGrowth')}
                </span>
                <span
                  className="metric-value font-semibold"
                  style={{
                    color:
                      score.growthHealth.followerGrowthRate > 0
                        ? 'var(--accent-green)'
                        : score.growthHealth.followerGrowthRate < 0
                          ? 'var(--accent-red)'
                          : 'var(--text-subtle)',
                  }}
                >
                  {score.growthHealth.followerGrowthRate > 0 ? '+' : ''}
                  {score.growthHealth.followerGrowthRate}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">
                  {t('ui.persona.viewGrowth')}
                </span>
                <span
                  className="metric-value text-[var(--text-subtle)]"
                >
                  {score.growthHealth.viewGrowthRate === 0
                    ? 'N/A'
                    : `${score.growthHealth.viewGrowthRate}%`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">
                  {t('ui.persona.momentum')}
                </span>
                {momentumBadge(score.growthHealth.momentum)}
              </div>
            </div>
          </div>

          {/* Strategy */}
          <div className="card p-5">
            <p
              className="text-xs font-medium uppercase tracking-wider text-[var(--text-subtle)]"
            >
              {t('ui.persona.strategy')}
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {suggestions.length > 0 ? (
                suggestions.map((s) => (
                  <div key={s.ruleId}>
                    <p
                      className="text-xs font-semibold text-[var(--text-primary)]"
                    >
                      {s.title}
                    </p>
                    <p
                      className="mt-0.5 text-xs leading-relaxed text-[var(--text-subtle)]"
                    >
                      {s.description.length > 120
                        ? s.description.slice(0, 120) + '...'
                        : s.description}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--text-subtle)]">
                  {t('ui.persona.noSuggestions')}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* d) Persona Tags */}
      {score.tags.length > 0 && (
        <section aria-labelledby="tags-heading">
          <h2 id="tags-heading" className="kicker mb-3">
            {t('ui.persona.personaTags')}
          </h2>
          <div className="card p-5">
            <div className="flex flex-wrap gap-2">
              {score.tags.map((tag) => {
                const colors = tagColor(tag.confidence);
                return (
                  <span
                    key={tag.slug}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: colors.bg, color: colors.text }}
                    title={tag.evidence}
                  >
                    {tag.label}
                    <span
                      className="metric-value text-[10px] opacity-70"
                      style={{ color: colors.text }}
                    >
                      {Math.round(tag.confidence * 100)}%
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* e) Content type distribution bar chart */}
      <section aria-labelledby="distribution-heading">
        <h2 id="distribution-heading" className="kicker mb-3">
          {t('ui.persona.contentTypeDistribution')}
        </h2>
        <div className="card p-6">
          <PersonaBarChart data={distEntries} />
        </div>
      </section>
    </div>
  );
}
