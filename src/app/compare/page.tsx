import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import type { DemoPersonaType } from '@/lib/adapters/demo-adapter';
import {
  computePersonaScore,
  comparePlatforms,
  formatNumber,
  overallScore,
  type PersonaScore,
  type CrossPlatformComparison,
} from '@/lib/engine';
import { PLATFORM_LABELS, VALID_PERSONAS, scoreColor } from '@/lib/utils/constants';
import CompareTable from './compare-table';
import CompareRadarChart from './compare-radar-chart';
import ImportCompareLoader from './import-compare-loader';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; persona?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  return {
    title:
      params.source === 'demo'
        ? 'Demo Comparison — DashPersona'
        : 'Cross-Platform Comparison — DashPersona',
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_PERSONAS_SET = new Set<DemoPersonaType>(
  VALID_PERSONAS as readonly DemoPersonaType[],
);

const PLATFORMS = ['douyin', 'tiktok', 'xhs'] as const;

// ---------------------------------------------------------------------------
// Types for serialized data passed to client component
// ---------------------------------------------------------------------------

export interface MetricRow {
  label: string;
  values: { platform: string; display: string; raw: number }[];
  winnerPlatform: string;
}

export interface PlatformScoreEntry {
  platform: string;
  label: string;
  overall: number;
}

export interface ContentOverlapEntry {
  category: string;
  platforms: { platform: string; pct: number }[];
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

interface ComparePageProps {
  searchParams: Promise<{ source?: string; persona?: string }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;

  // --- Import mode ---
  if (params.source === 'import') {
    return <ImportCompareLoader />;
  }

  const personaParam = params.persona ?? 'tutorial';
  const personaType: DemoPersonaType = VALID_PERSONAS_SET.has(
    personaParam as DemoPersonaType,
  )
    ? (personaParam as DemoPersonaType)
    : 'tutorial';

  // Load all 3 platform profiles
  const profiles = getDemoProfile(personaType);

  // Compute persona score for each
  const personaScores: Record<string, PersonaScore> = {};
  for (const [platform, profile] of Object.entries(profiles)) {
    personaScores[platform] = computePersonaScore(profile);
  }

  // Cross-platform comparison
  const comparison: CrossPlatformComparison = comparePlatforms(
    Object.values(profiles),
  );

  // Build metric rows for the comparison table
  const metricRows: MetricRow[] = buildMetricRows(profiles, personaScores, comparison);

  // Build persona score comparison
  const scoreEntries: PlatformScoreEntry[] = PLATFORMS.map((p) => ({
    platform: p,
    label: PLATFORM_LABELS[p],
    overall: overallScore(personaScores[p]),
  }));

  // Build content overlap data
  const contentOverlap: ContentOverlapEntry[] = buildContentOverlap(comparison);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      {/* a) Header */}
      <header className="flex flex-col gap-2">
        <Link
          href={`/dashboard?source=${params.source ?? 'demo'}&persona=${personaType}`}
          className="nav-pill"
          aria-label="Back to dashboard"
        >
          &larr; Dashboard
        </Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          {t('ui.compare.title')}
        </h1>
        <p className="text-sm text-[var(--text-subtle)]">
          {t('ui.compare.persona', { type: personaType })}
        </p>
      </header>

      {/* b) Key metrics comparison table */}
      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="kicker mb-3">
          {t('ui.compare.keyMetrics')}
        </h2>
        <CompareTable
          metricRows={metricRows}
          scoreEntries={scoreEntries}
          contentOverlap={contentOverlap}
          insights={comparison.insights.map((i) => i.text)}
        />
      </section>

      {/* c) Radar chart */}
      <section aria-labelledby="radar-heading">
        <h2 id="radar-heading" className="kicker mb-3">
          {t('ui.compare.radarOverview')}
        </h2>
        <CompareRadarChart summaries={comparison.summaries} />
      </section>

      {/* d) Insight highlights (server-rendered) */}
      {comparison.insights.length > 0 && (
        <section aria-labelledby="insights-heading">
          <h2 id="insights-heading" className="kicker mb-3">
            {t('ui.compare.insightHighlights')}
          </h2>
          <div className="flex flex-col gap-3">
            {comparison.insights.map((insight) => (
              <div
                key={`${insight.type}-${insight.text.slice(0, 30)}`}
                className="card px-5 py-4"
              >
                <p
                  className="mb-1 text-[0.6875rem] font-medium uppercase tracking-wider text-[var(--accent-highlight)]"
                >
                  {insight.type.replace(/_/g, ' ')}
                </p>
                <p
                  className="text-sm leading-relaxed text-[var(--text-secondary)]"
                >
                  {insight.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* d) Content type overlap (server-rendered) */}
      <section aria-labelledby="content-overlap-heading">
        <h2 id="content-overlap-heading" className="kicker mb-3">
          {t('ui.compare.contentTypeOverlap')}
        </h2>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-subtle)]"
                  >
                    {t('ui.compare.category')}
                  </th>
                  {PLATFORMS.map((p) => (
                    <th
                      key={p}
                      className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-subtle)]"
                    >
                      {PLATFORM_LABELS[p]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contentOverlap.map((row) => {
                  const maxPct = Math.max(...row.platforms.map((p) => p.pct));
                  return (
                    <tr
                      key={row.category}
                      className="border-b border-[var(--border-subtle)]"
                    >
                      <td
                        className="px-4 py-2.5 capitalize text-[var(--text-secondary)]"
                      >
                        {row.category}
                      </td>
                      {row.platforms.map((entry) => {
                        const isMax = entry.pct === maxPct && maxPct > 0;
                        const isEmpty = entry.pct === 0;
                        return (
                          <td
                            key={entry.platform}
                            className="metric-value px-4 py-2.5 text-right"
                            style={{
                              color: isEmpty
                                ? 'var(--text-subtle)'
                                : isMax
                                  ? 'var(--accent-green)'
                                  : 'var(--text-primary)',
                              fontWeight: isMax ? 600 : 400,
                            }}
                          >
                            {isEmpty ? '\u2014' : `${entry.pct.toFixed(1)}%`}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* e) Persona score comparison */}
      <section aria-labelledby="scores-heading">
        <h2 id="scores-heading" className="kicker mb-3">
          {t('ui.compare.personaScoreComparison')}
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {scoreEntries.map((entry) => {
            const bestScore = Math.max(...scoreEntries.map((e) => e.overall));
            const isBest = entry.overall === bestScore;
            return (
              <div
                key={entry.platform}
                className="card p-5"
                style={
                  isBest
                    ? {
                        borderColor: 'var(--accent-green)',
                        borderWidth: '1px',
                        background: 'rgba(126, 210, 154, 0.06)',
                      }
                    : undefined
                }
              >
                <p
                  className="text-xs font-medium uppercase tracking-wider text-[var(--text-subtle)]"
                >
                  {entry.label}
                </p>
                <p
                  className={`metric-value mt-2 font-bold ${isBest ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'}`}
                  style={{ color: scoreColor(entry.overall) }}
                >
                  {entry.overall}
                </p>
                {isBest && (
                  <span className="badge badge-green mt-2">Best</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data builders
// ---------------------------------------------------------------------------

function buildMetricRows(
  profiles: Record<string, import('@/lib/schema/creator-data').CreatorProfile>,
  scores: Record<string, PersonaScore>,
  comparison: CrossPlatformComparison,
): MetricRow[] {
  const rows: MetricRow[] = [];

  // Followers
  const followerValues = PLATFORMS.map((p) => ({
    platform: p,
    display: formatNumber(profiles[p].profile.followers),
    raw: profiles[p].profile.followers,
  }));
  const followerWinner = followerValues.reduce((a, b) =>
    b.raw > a.raw ? b : a,
  ).platform;
  rows.push({ label: t('ui.compare.followers'), values: followerValues, winnerPlatform: followerWinner });

  // Engagement Rate
  const engValues = PLATFORMS.map((p) => ({
    platform: p,
    display: `${(scores[p].engagement.overallRate * 100).toFixed(1)}%`,
    raw: scores[p].engagement.overallRate,
  }));
  const engWinner = engValues.reduce((a, b) => (b.raw > a.raw ? b : a)).platform;
  rows.push({ label: t('ui.compare.engagementRate'), values: engValues, winnerPlatform: engWinner });

  // Posts analysed
  const postValues = PLATFORMS.map((p) => ({
    platform: p,
    display: String(scores[p].postsAnalysed),
    raw: scores[p].postsAnalysed,
  }));
  const postWinner = postValues.reduce((a, b) => (b.raw > a.raw ? b : a)).platform;
  rows.push({ label: t('ui.common.posts'), values: postValues, winnerPlatform: postWinner });

  // Likes Total
  const likeValues = PLATFORMS.map((p) => ({
    platform: p,
    display: formatNumber(profiles[p].profile.likesTotal),
    raw: profiles[p].profile.likesTotal,
  }));
  const likeWinner = likeValues.reduce((a, b) => (b.raw > a.raw ? b : a)).platform;
  rows.push({ label: t('ui.compare.likesTotal'), values: likeValues, winnerPlatform: likeWinner });

  // Saves Total (from comparison summaries)
  const saveValues = PLATFORMS.map((p) => {
    const summary = comparison.summaries.find((s) => s.platform === p);
    const totalSaves = profiles[p].posts.reduce((s, post) => s + post.saves, 0);
    return {
      platform: p,
      display: formatNumber(totalSaves),
      raw: totalSaves,
    };
  });
  const saveWinner = saveValues.reduce((a, b) => (b.raw > a.raw ? b : a)).platform;
  rows.push({ label: t('ui.compare.savesTotal'), values: saveValues, winnerPlatform: saveWinner });

  return rows;
}

function buildContentOverlap(
  comparison: CrossPlatformComparison,
): ContentOverlapEntry[] {
  // Collect all categories across all platforms
  const allCategories = new Set<string>();
  for (const summary of comparison.summaries) {
    for (const cat of Object.keys(summary.contentDistribution)) {
      allCategories.add(cat);
    }
  }

  const entries: ContentOverlapEntry[] = [];
  for (const cat of allCategories) {
    const platforms = PLATFORMS.map((p) => {
      const summary = comparison.summaries.find((s) => s.platform === p);
      return {
        platform: p,
        pct: summary?.contentDistribution[cat] ?? 0,
      };
    });
    entries.push({ category: cat, platforms });
  }

  // Sort by max pct across platforms
  entries.sort((a, b) => {
    const aMax = Math.max(...a.platforms.map((p) => p.pct));
    const bMax = Math.max(...b.platforms.map((p) => p.pct));
    return bMax - aMax;
  });

  return entries;
}
