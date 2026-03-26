'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import {
  computePersonaScore,
  comparePlatforms,
  formatNumber,
  overallScore,
  type PersonaScore,
  type CrossPlatformComparison,
} from '@/lib/engine';
import { PLATFORM_LABELS, scoreColor } from '@/lib/utils/constants';
import CompareTable from './compare-table';
import CompareRadarChart from './compare-radar-chart';
import type {
  MetricRow,
  PlatformScoreEntry,
  ContentOverlapEntry,
} from './page';

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function SinglePlatformNotice() {
  return (
    <div className="card flex flex-col items-center gap-4 px-8 py-12 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(210,200,126,0.12)]"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke="var(--accent-yellow)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-[var(--text-primary)]">
        Need at least 2 platforms to compare
      </p>
      <p className="max-w-sm text-xs leading-relaxed text-[var(--text-subtle)]">
        Import data from multiple platforms (Douyin, TikTok, Red Note) to see
        cross-platform comparison, radar charts, and actionable insights.
      </p>
      <Link href="/onboarding" className="nav-pill mt-2">
        Import more data
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data builders (client-side equivalent of server-side builders)
// ---------------------------------------------------------------------------

function buildMetricRows(
  profiles: Record<string, CreatorProfile>,
  scores: Record<string, PersonaScore>,
  comparison: CrossPlatformComparison,
): MetricRow[] {
  const platforms = Object.keys(profiles);
  const rows: MetricRow[] = [];

  const followerValues = platforms.map((p) => ({
    platform: p,
    display: formatNumber(profiles[p].profile.followers),
    raw: profiles[p].profile.followers,
  }));
  rows.push({
    label: 'Followers',
    values: followerValues,
    winnerPlatform: followerValues.reduce((a, b) => (b.raw > a.raw ? b : a)).platform,
  });

  const engValues = platforms.map((p) => ({
    platform: p,
    display: `${(scores[p].engagement.overallRate * 100).toFixed(1)}%`,
    raw: scores[p].engagement.overallRate,
  }));
  rows.push({
    label: 'Engagement Rate',
    values: engValues,
    winnerPlatform: engValues.reduce((a, b) => (b.raw > a.raw ? b : a)).platform,
  });

  const postValues = platforms.map((p) => ({
    platform: p,
    display: String(scores[p].postsAnalysed),
    raw: scores[p].postsAnalysed,
  }));
  rows.push({
    label: 'Posts',
    values: postValues,
    winnerPlatform: postValues.reduce((a, b) => (b.raw > a.raw ? b : a)).platform,
  });

  const likeValues = platforms.map((p) => ({
    platform: p,
    display: formatNumber(profiles[p].profile.likesTotal),
    raw: profiles[p].profile.likesTotal,
  }));
  rows.push({
    label: 'Likes Total',
    values: likeValues,
    winnerPlatform: likeValues.reduce((a, b) => (b.raw > a.raw ? b : a)).platform,
  });

  return rows;
}

function buildContentOverlap(
  comparison: CrossPlatformComparison,
): ContentOverlapEntry[] {
  const allCategories = new Set<string>();
  for (const summary of comparison.summaries) {
    for (const cat of Object.keys(summary.contentDistribution)) {
      allCategories.add(cat);
    }
  }

  const platforms = comparison.summaries.map((s) => s.platform);
  const entries: ContentOverlapEntry[] = [];
  for (const cat of allCategories) {
    const platData = platforms.map((p) => {
      const summary = comparison.summaries.find((s) => s.platform === p);
      return { platform: p, pct: summary?.contentDistribution[cat] ?? 0 };
    });
    entries.push({ category: cat, platforms: platData });
  }

  entries.sort((a, b) => {
    const aMax = Math.max(...a.platforms.map((p) => p.pct));
    const bMax = Math.max(...b.platforms.map((p) => p.pct));
    return bMax - aMax;
  });

  return entries;
}

// ---------------------------------------------------------------------------
// Main loader
// ---------------------------------------------------------------------------

export default function ImportCompareLoader() {
  const [profiles, setProfiles] = useState<Record<string, CreatorProfile> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem('dashpersona-import-profiles');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, CreatorProfile>;
        for (const p of Object.values(parsed)) {
          if (!p.profileUrl) p.profileUrl = `https://creator.douyin.com`;
        }
        setProfiles(parsed);
      } catch {
        // fall through to empty state
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
        <p className="text-sm text-[var(--text-secondary)]">
          Loading imported data...
        </p>
      </div>
    );
  }

  if (!profiles || Object.keys(profiles).length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-2">
          <Link href="/dashboard?source=import" className="nav-pill" aria-label="Back to dashboard">
            &larr; Dashboard
          </Link>
          <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
            Cross-Platform Comparison
          </h1>
        </header>
        <SinglePlatformNotice />
      </div>
    );
  }

  const platformKeys = Object.keys(profiles);
  const comparison = comparePlatforms(Object.values(profiles));

  // Single platform — show notice
  if (platformKeys.length < 2) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-2">
          <Link href="/dashboard?source=import" className="nav-pill" aria-label="Back to dashboard">
            &larr; Dashboard
          </Link>
          <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
            Cross-Platform Comparison
          </h1>
        </header>
        <SinglePlatformNotice />
      </div>
    );
  }

  const personaScores: Record<string, PersonaScore> = {};
  for (const [platform, profile] of Object.entries(profiles)) {
    personaScores[platform] = computePersonaScore(profile);
  }

  const metricRows = buildMetricRows(profiles, personaScores, comparison);
  const scoreEntries: PlatformScoreEntry[] = platformKeys.map((p) => ({
    platform: p,
    label: PLATFORM_LABELS[p] ?? p,
    overall: overallScore(personaScores[p]),
  }));
  const contentOverlap = buildContentOverlap(comparison);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/dashboard?source=import" className="nav-pill" aria-label="Back to dashboard">
          &larr; Dashboard
        </Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
          Cross-Platform Comparison
        </h1>
        <p className="text-sm text-[var(--text-subtle)]">
          {platformKeys.map((p) => PLATFORM_LABELS[p] ?? p).join(' vs ')}
        </p>
      </header>

      {/* Radar Chart */}
      <section>
        <CompareRadarChart summaries={comparison.summaries} />
      </section>

      {/* Key Metrics */}
      <section aria-labelledby="import-metrics-heading">
        <h2 id="import-metrics-heading" className="kicker mb-3">
          Key Metrics
        </h2>
        <CompareTable
          metricRows={metricRows}
          scoreEntries={scoreEntries}
          contentOverlap={contentOverlap}
          insights={comparison.insights.map((i) => i.text)}
        />
      </section>

      {/* Insights */}
      {comparison.insights.length > 0 && (
        <section aria-labelledby="import-insights-heading">
          <h2 id="import-insights-heading" className="kicker mb-3">
            Insights
          </h2>
          <div className="flex flex-col gap-3">
            {comparison.insights.map((insight, i) => (
              <div key={`${insight.type}-${insight.text.slice(0, 30)}`} className="card px-5 py-4">
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

      {/* Persona Score Comparison */}
      <section aria-labelledby="import-scores-heading">
        <h2 id="import-scores-heading" className="kicker mb-3">
          Persona Score Comparison
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
                {isBest && <span className="badge badge-green mt-2">Best</span>}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
