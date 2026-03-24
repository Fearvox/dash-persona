import type { Metadata } from 'next';
import Link from 'next/link';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import type { DemoPersonaType } from '@/lib/adapters/demo-adapter';
import {
  computePersonaScore,
  generateStrategySuggestions,
  formatNumber,
  type PersonaScore,
} from '@/lib/engine';
import { PLATFORM_LABELS, VALID_PERSONAS, scoreColor } from '@/lib/utils/constants';
import PersonaBarChart from './persona-bar-chart';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; persona?: string; platform?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  return {
    title:
      params.source === 'demo'
        ? 'Demo Persona Detail — DashPersona'
        : 'Persona Detail — DashPersona',
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_PERSONAS_SET = new Set<DemoPersonaType>(
  VALID_PERSONAS as readonly DemoPersonaType[],
);

const PLATFORMS = ['douyin', 'tiktok', 'xhs'] as const;

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function overallScore(score: PersonaScore): number {
  const engagementPart = Math.min(score.engagement.overallRate * 100 * 5, 100);
  const rhythmPart = score.rhythm.consistencyScore;
  const consistencyPart = score.consistency.score;
  const growthPart =
    score.growthHealth.momentum === 'accelerating'
      ? 80
      : score.growthHealth.momentum === 'steady'
        ? 60
        : score.growthHealth.momentum === 'decelerating'
          ? 30
          : 0;

  return Math.round(
    engagementPart * 0.3 +
      rhythmPart * 0.2 +
      consistencyPart * 0.25 +
      growthPart * 0.25,
  );
}

function momentumBadge(momentum: string) {
  const map: Record<string, { label: string; cls: string }> = {
    accelerating: { label: 'Accelerating', cls: 'badge-green' },
    steady: { label: 'Steady', cls: 'badge-yellow' },
    decelerating: { label: 'Decelerating', cls: 'badge-red' },
    insufficient_data: { label: 'No data', cls: 'badge-yellow' },
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
// Page component
// ---------------------------------------------------------------------------

interface PersonaPageProps {
  searchParams: Promise<{
    source?: string;
    persona?: string;
    platform?: string;
  }>;
}

export default async function PersonaPage({ searchParams }: PersonaPageProps) {
  const params = await searchParams;
  const personaParam = params.persona ?? 'tutorial';
  const personaType: DemoPersonaType = VALID_PERSONAS_SET.has(
    personaParam as DemoPersonaType,
  )
    ? (personaParam as DemoPersonaType)
    : 'tutorial';

  const platformParam = params.platform ?? 'douyin';
  const platform = PLATFORMS.includes(platformParam as typeof PLATFORMS[number])
    ? platformParam
    : 'douyin';

  // Load data
  const profiles = getDemoProfile(personaType);
  const profile = profiles[platform];
  const score = computePersonaScore(profile);
  const overall = overallScore(score);
  const viral = viralPotentialScore(score);

  // Strategy (top 2)
  const suggestions = generateStrategySuggestions(score).slice(0, 2);

  // Content distribution sorted for bar chart
  const distEntries = Object.entries(score.contentDistribution)
    .sort((a, b) => b[1] - a[1]);

  // Top 3 categories
  const top3 = distEntries.slice(0, 3);
  const diversityIndex = distEntries.length;

  // Best time slots
  const bestHourLabel =
    score.rhythm.bestHour !== null
      ? `${String(score.rhythm.bestHour).padStart(2, '0')}:00 UTC`
      : 'N/A';
  const bestDay =
    score.rhythm.bestDayOfWeek !== null
      ? DAY_NAMES[score.rhythm.bestDayOfWeek]
      : 'N/A';

  // Build search params for platform tabs
  function platformHref(p: string) {
    const sp = new URLSearchParams();
    if (params.source) sp.set('source', params.source);
    sp.set('persona', personaType);
    sp.set('platform', p);
    return `/persona?${sp.toString()}`;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      {/* a) Header */}
      <header className="flex flex-col gap-4">
        <Link
          href={`/dashboard?source=${params.source ?? 'demo'}&persona=${personaType}`}
          className="nav-pill"
          aria-label="Back to dashboard"
        >
          &larr; Dashboard
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            Persona Detail
          </h1>

          {/* Platform selector tabs */}
          <div
            className="flex rounded-lg p-1"
            style={{ background: 'var(--bg-secondary)' }}
            role="tablist"
          >
            {PLATFORMS.map((p) => {
              const isActive = p === platform;
              return (
                <Link
                  key={p}
                  href={platformHref(p)}
                  role="tab"
                  aria-selected={isActive}
                  className="rounded-md px-4 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    background: isActive ? 'var(--bg-card)' : 'transparent',
                    color: isActive
                      ? 'var(--text-primary)'
                      : 'var(--text-subtle)',
                    border: isActive
                      ? '1px solid var(--border-subtle)'
                      : '1px solid transparent',
                  }}
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
              className="text-xs font-medium"
              style={{ color: 'var(--text-subtle)' }}
            >
              Overall Persona Score
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Momentum
              </span>
              {momentumBadge(score.growthHealth.momentum)}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
              {PLATFORM_LABELS[platform]} &middot; {personaType} &middot;{' '}
              {score.postsAnalysed} posts analysed
            </p>
          </div>
        </div>
      </section>

      {/* c) 6-dimension detail cards (2x3 grid) */}
      <section aria-labelledby="dimensions-heading">
        <h2 id="dimensions-heading" className="kicker mb-3">
          Dimension Breakdown
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Content Mix */}
          <div className="card p-5">
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-subtle)' }}
            >
              Content Mix
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {top3.map(([cat, pct]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className="capitalize"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {cat}
                    </span>
                    <span
                      className="metric-value"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className="mt-1 h-1.5 w-full overflow-hidden rounded-full"
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: 'var(--accent-green)',
                        opacity: 0.7,
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="mt-1 text-xs" style={{ color: 'var(--text-subtle)' }}>
                Diversity index: {diversityIndex} categories
              </p>
            </div>
          </div>

          {/* Engagement Profile */}
          <div className="card p-5">
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-subtle)' }}
            >
              Engagement Profile
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-secondary)' }}>Avg Rate</span>
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
                <span style={{ color: 'var(--text-secondary)' }}>
                  Best Category
                </span>
                <span
                  className="capitalize"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {score.engagement.bestCategory ?? 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-secondary)' }}>Trend</span>
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
                <span style={{ color: 'var(--text-secondary)' }}>
                  Viral Potential
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
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-subtle)' }}
            >
              Posting Rhythm
            </p>
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-secondary)' }}>
                  Posts / Week
                </span>
                <span
                  className="metric-value text-lg font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {score.rhythm.postsPerWeek}
                </span>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Consistency
                  </span>
                  <span
                    className="metric-value font-medium"
                    style={{
                      color: scoreColor(score.rhythm.consistencyScore),
                    }}
                  >
                    {score.rhythm.consistencyScore}/100
                  </span>
                </div>
                <div
                  className="mt-1 h-1.5 w-full overflow-hidden rounded-full"
                  style={{ background: 'var(--bg-secondary)' }}
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
                <span style={{ color: 'var(--text-secondary)' }}>
                  Best Slots
                </span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {bestDay}, {bestHourLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Persona Consistency */}
          <div className="card p-5">
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-subtle)' }}
            >
              Persona Consistency
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <p
                className="metric-value text-2xl font-bold sm:text-3xl"
                style={{
                  color: scoreColor(score.consistency.score),
                }}
              >
                {score.consistency.score}
                <span className="text-sm font-normal">/100</span>
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {score.consistency.isConsistent
                  ? 'Stable topical identity'
                  : 'Diverse topic coverage'}
              </p>
              {score.consistency.dominantCategory && (
                <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                  Dominant:{' '}
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
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-subtle)' }}
            >
              Growth Health
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-secondary)' }}>
                  Follower Growth
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
                <span style={{ color: 'var(--text-secondary)' }}>
                  View Growth
                </span>
                <span
                  className="metric-value"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  {score.growthHealth.viewGrowthRate === 0
                    ? 'N/A'
                    : `${score.growthHealth.viewGrowthRate}%`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-secondary)' }}>
                  Momentum
                </span>
                {momentumBadge(score.growthHealth.momentum)}
              </div>
            </div>
          </div>

          {/* Strategy */}
          <div className="card p-5">
            <p
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-subtle)' }}
            >
              Strategy
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {suggestions.length > 0 ? (
                suggestions.map((s) => (
                  <div key={s.ruleId}>
                    <p
                      className="text-xs font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {s.title}
                    </p>
                    <p
                      className="mt-0.5 text-xs leading-relaxed"
                      style={{ color: 'var(--text-subtle)' }}
                    >
                      {s.description.length > 120
                        ? s.description.slice(0, 120) + '...'
                        : s.description}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                  No urgent suggestions. Keep it up!
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
            Persona Tags
          </h2>
          <div className="card p-6">
            <div className="flex flex-col gap-3">
              {score.tags.map((tag) => {
                const colors = tagColor(tag.confidence);
                return (
                  <div
                    key={tag.slug}
                    className="flex items-center gap-3"
                  >
                    <span
                      className="inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {tag.label}
                    </span>
                    <div className="flex flex-1 items-center gap-2">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full"
                        style={{ background: 'var(--bg-secondary)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.round(tag.confidence * 100)}%`,
                            background: colors.text,
                            opacity: 0.6,
                          }}
                        />
                      </div>
                      <span
                        className="metric-value shrink-0 text-xs"
                        style={{ color: 'var(--text-subtle)' }}
                      >
                        {Math.round(tag.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* e) Content type distribution bar chart */}
      <section aria-labelledby="distribution-heading">
        <h2 id="distribution-heading" className="kicker mb-3">
          Content Type Distribution
        </h2>
        <div className="card p-6">
          <PersonaBarChart data={distEntries} />
        </div>
      </section>
    </div>
  );
}
