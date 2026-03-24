import Link from 'next/link';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import type { DemoPersonaType } from '@/lib/adapters/demo-adapter';
import {
  computePersonaScore,
  comparePlatforms,
  formatNumber,
  type PersonaScore,
  type CrossPlatformComparison,
} from '@/lib/engine';
import CompareTable from './compare-table';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_PERSONAS = new Set<DemoPersonaType>([
  'tutorial',
  'entertainment',
  'lifestyle',
]);

const PLATFORM_LABELS: Record<string, string> = {
  douyin: 'Douyin',
  tiktok: 'TikTok',
  xhs: 'Red Note',
};

const PLATFORMS = ['douyin', 'tiktok', 'xhs'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(value: number): string {
  if (value >= 70) return 'var(--accent-green)';
  if (value >= 40) return 'var(--accent-yellow)';
  return 'var(--accent-red)';
}

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
  const personaParam = params.persona ?? 'tutorial';
  const personaType: DemoPersonaType = VALID_PERSONAS.has(
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
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      {/* a) Header */}
      <header className="flex flex-col gap-2">
        <Link
          href={`/dashboard?source=${params.source ?? 'demo'}&persona=${personaType}`}
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-green)' }}
          aria-label="Back to dashboard"
        >
          &larr; Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Cross-Platform Comparison
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
          Persona: {personaType}
        </p>
      </header>

      {/* b) Key metrics comparison table */}
      <section aria-labelledby="metrics-heading">
        <h2 id="metrics-heading" className="kicker mb-3">
          Key Metrics
        </h2>
        <CompareTable
          metricRows={metricRows}
          scoreEntries={scoreEntries}
          contentOverlap={contentOverlap}
          insights={comparison.insights.map((i) => i.text)}
        />
      </section>

      {/* c) Insight highlights (server-rendered) */}
      {comparison.insights.length > 0 && (
        <section aria-labelledby="insights-heading">
          <h2 id="insights-heading" className="kicker mb-3">
            Insight Highlights
          </h2>
          <div className="flex flex-col gap-3">
            {comparison.insights.map((insight, i) => (
              <div
                key={i}
                className="card px-5 py-4"
                style={{
                  borderLeft: '3px solid var(--accent-highlight)',
                }}
              >
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {insight.text}
                </p>
                <p
                  className="mt-1 text-[10px] uppercase tracking-wider"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  {insight.type.replace(/_/g, ' ')}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* d) Content type overlap (server-rendered) */}
      <section aria-labelledby="content-overlap-heading">
        <h2 id="content-overlap-heading" className="kicker mb-3">
          Content Type Overlap
        </h2>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    Category
                  </th>
                  {PLATFORMS.map((p) => (
                    <th
                      key={p}
                      className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider"
                      style={{ color: 'var(--text-subtle)' }}
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
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      <td
                        className="px-4 py-2.5 capitalize"
                        style={{ color: 'var(--text-secondary)' }}
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
          Persona Score Comparison
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {scoreEntries.map((entry) => {
            const bestScore = Math.max(...scoreEntries.map((e) => e.overall));
            const isBest = entry.overall === bestScore;
            return (
              <div
                key={entry.platform}
                className="card p-6"
                style={
                  isBest
                    ? { borderColor: 'var(--accent-green)', borderWidth: '1px' }
                    : undefined
                }
              >
                <p
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  {entry.label}
                </p>
                <p
                  className="metric-value mt-2 text-4xl font-bold"
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
  rows.push({ label: 'Followers', values: followerValues, winnerPlatform: followerWinner });

  // Engagement Rate
  const engValues = PLATFORMS.map((p) => ({
    platform: p,
    display: `${(scores[p].engagement.overallRate * 100).toFixed(1)}%`,
    raw: scores[p].engagement.overallRate,
  }));
  const engWinner = engValues.reduce((a, b) => (b.raw > a.raw ? b : a)).platform;
  rows.push({ label: 'Engagement Rate', values: engValues, winnerPlatform: engWinner });

  // Posts analysed
  const postValues = PLATFORMS.map((p) => ({
    platform: p,
    display: String(scores[p].postsAnalysed),
    raw: scores[p].postsAnalysed,
  }));
  const postWinner = postValues.reduce((a, b) => (b.raw > a.raw ? b : a)).platform;
  rows.push({ label: 'Posts', values: postValues, winnerPlatform: postWinner });

  // Likes Total
  const likeValues = PLATFORMS.map((p) => ({
    platform: p,
    display: formatNumber(profiles[p].profile.likesTotal),
    raw: profiles[p].profile.likesTotal,
  }));
  const likeWinner = likeValues.reduce((a, b) => (b.raw > a.raw ? b : a)).platform;
  rows.push({ label: 'Likes Total', values: likeValues, winnerPlatform: likeWinner });

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
  rows.push({ label: 'Saves Total', values: saveValues, winnerPlatform: saveWinner });

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
