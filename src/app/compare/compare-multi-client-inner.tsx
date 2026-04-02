'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  getAllProfiles,
  resolveProfiles,
  type ResolvedProfiles,
} from '@/lib/store/profile-store';
import {
  computePersonaScore,
  overallScore,
  formatNumber,
  type PersonaScore,
} from '@/lib/engine';
import { PLATFORM_LABELS, scoreColor } from '@/lib/utils/constants';
import CompareRadarChart from './compare-radar-chart';
import type { CreatorProfile } from '@/lib/schema/creator-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MultiMetricRow {
  label: string;
  values: { creatorId: string; creatorName: string; platform: string; display: string; raw: number }[];
  winnerId: string;
}

interface MultiScoreEntry {
  creatorId: string;
  creatorName: string;
  platform: string;
  label: string;
  overall: number;
}

interface Creator {
  id: string;
  name: string;
  platform: string;
}

// ---------------------------------------------------------------------------
// CreatorPicker (inline)
// ---------------------------------------------------------------------------

interface CreatorPickerProps {
  creators: Creator[];
  selected: string[];
  onToggle: (id: string) => void;
}

function CreatorPicker({ creators, selected, onToggle }: CreatorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {creators.map((c) => {
        const isSelected = selected.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggle(c.id)}
            className="nav-pill"
            style={
              isSelected
                ? {
                    background: 'rgba(126, 210, 154, 0.12)',
                    borderColor: 'var(--accent-green)',
                    color: 'var(--accent-green)',
                  }
                : undefined
            }
            aria-pressed={isSelected}
          >
            {c.name}
            <span
              className="ml-1.5 text-[0.625rem] uppercase tracking-wider"
              style={{ color: 'var(--text-subtle)' }}
            >
              {c.platform}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComparisonBarChart (for 3+ creators)
// ---------------------------------------------------------------------------

interface BarChartMetric {
  label: string;
  winnerId: string;
  values: { id: string; name: string; display: string; raw: number }[];
}

interface ComparisonBarChartProps {
  metrics: BarChartMetric[];
}

function ComparisonBarChart({ metrics }: ComparisonBarChartProps) {
  return (
    <div className="flex flex-col gap-8">
      {metrics.map((metric) => (
        <div key={metric.label} className="card p-5">
          <h4 className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--text-subtle)]">
            {metric.label}
          </h4>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart
              data={metric.values.map((v) => ({
                name: v.name,
                raw: v.raw,
                display: v.display,
              }))}
              layout="vertical"
              margin={{ left: 60, right: 24 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: 'var(--text-subtle)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="card border border-[var(--border-subtle)] px-3 py-2 text-xs">
                      <span className="font-medium text-[var(--text-primary)]">{d.display}</span>
                    </div>
                  );
                }}
              />
              <Bar dataKey="raw" radius={[0, 4, 4, 0]}>
                {metric.values.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={entry.id === metric.winnerId ? 'var(--accent-green)' : i % 2 === 0 ? 'var(--accent-blue)' : 'var(--accent-yellow)'}
                    fillOpacity={entry.id === metric.winnerId ? 1 : 0.65}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricRankingTable
// ---------------------------------------------------------------------------

interface MetricRankingTableProps {
  rows: MultiMetricRow[];
  scoreEntries: MultiScoreEntry[];
}

function MetricRankingTable({ rows, scoreEntries }: MetricRankingTableProps) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-subtle)]">
                Metric
              </th>
              {scoreEntries.map((e) => (
                <th
                  key={e.creatorId}
                  className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-subtle)]"
                >
                  {e.creatorName}
                  <br />
                  <span className="text-[0.625rem] normal-case">{e.platform}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-[var(--border-subtle)]">
                <td className="px-5 py-3 text-[var(--text-secondary)]">{row.label}</td>
                {row.values.map((v) => {
                  const isWinner = v.creatorId === row.winnerId;
                  return (
                    <td
                      key={v.creatorId}
                      className="metric-value px-5 py-3 text-right"
                      style={{
                        color: isWinner ? 'var(--accent-green)' : 'var(--text-primary)',
                        fontWeight: isWinner ? 600 : 400,
                      }}
                    >
                      {v.display}
                      {isWinner && (
                        <span className="ml-1 text-[var(--accent-green)]" aria-label="Winner">
                          &#9733;
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty states
// ---------------------------------------------------------------------------

function NoProfilesEmpty() {
  return (
    <div className="card flex flex-col items-center gap-4 px-8 py-12 text-center">
      <p className="text-sm font-medium text-[var(--text-primary)]">No imported profiles found</p>
      <p className="max-w-sm text-xs leading-relaxed text-[var(--text-subtle)]">
        Import creator profiles from the dashboard to enable multi-creator comparison.
      </p>
      <Link href="/dashboard?source=import" className="nav-pill mt-2">
        Go to Dashboard
      </Link>
    </div>
  );
}

function NotEnoughCreators() {
  return (
    <div className="card flex flex-col items-center gap-4 px-8 py-12 text-center">
      <p className="text-sm font-medium text-[var(--text-primary)]">Select at least 2 creators</p>
      <p className="max-w-sm text-xs leading-relaxed text-[var(--text-subtle)]">
        Use the picker above to select 2 or more creators from your imported data.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

export default function CompareMultiClient() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllProfiles()
      .then((profiles) => {
        const list: Creator[] = profiles.map((p, i) => ({
          id: `${p.platform}-${i}`,
          name: p.profile.nickname || p.profile.uniqueId || p.platform,
          platform: PLATFORM_LABELS[p.platform] ?? p.platform,
        }));
        setCreators(list);
        setSelectedIds(list.slice(0, Math.min(3, list.length)).map((c) => c.id));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
        <p className="text-sm text-[var(--text-secondary)]">{t('ui.common.loadingImported')}</p>
      </div>
    );
  }

  if (creators.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-2">
          <Link href="/dashboard?source=import" className="nav-pill">&larr; Dashboard</Link>
          <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">Multi-Creator Comparison</h1>
        </header>
        <NoProfilesEmpty />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <Link href="/dashboard?source=import" className="nav-pill">&larr; Dashboard</Link>
        <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          Multi-Creator Comparison
        </h1>
        <p className="text-sm text-[var(--text-subtle)]">
          Select 2 or more creators to compare across platforms
        </p>
      </header>

      <section>
        <h2 className="kicker mb-3">Select Creators</h2>
        <CreatorPicker creators={creators} selected={selectedIds} onToggle={handleToggle} />
      </section>

      {selectedIds.length >= 2 ? (
        <MultiComparisonView selectedIds={selectedIds} />
      ) : selectedIds.length > 0 ? (
        <NotEnoughCreators />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multi-comparison view
// ---------------------------------------------------------------------------

interface MultiComparisonViewProps {
  selectedIds: string[];
}

function MultiComparisonView({ selectedIds }: MultiComparisonViewProps) {
  const [resolved, setResolved] = useState<ResolvedProfiles | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    resolveProfiles()
      .then((r) => { setResolved(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-[var(--text-secondary)]">Loading profiles…</p>
      </div>
    );
  }

  const profiles = resolved?.profiles ?? {};
  const profileEntries = Object.entries(profiles);

  // Map selected IDs to profiles (stable key: `${platform}-${index}`)
  const selectedProfiles: CreatorProfile[] = [];
  for (const id of selectedIds) {
    const found = profileEntries.find(([platform, _], i) => `${platform}-${i}` === id);
    if (found) selectedProfiles.push(found[1]);
  }

  // Fallback: if mapping fails, take first N entries
  if (selectedProfiles.length < 2 && profileEntries.length >= 2) {
    selectedProfiles.length = 0;
    for (let i = 0; i < Math.min(selectedIds.length, profileEntries.length); i++) {
      selectedProfiles.push(profileEntries[i][1]);
    }
  }

  if (selectedProfiles.length < 2) {
    return <NotEnoughCreators />;
  }

  // Build creator metadata (name, platform) for display
  const creatorMeta: Record<string, { name: string; platform: string }> = {};
  profileEntries.forEach(([platform, profile], i) => {
    const key = `${platform}-${i}`;
    creatorMeta[key] = {
      name: profile.profile.nickname || profile.profile.uniqueId || platform,
      platform: PLATFORM_LABELS[platform] ?? platform,
    };
  });

  // Compute scores
  const scores: Record<string, PersonaScore> = {};
  for (const p of selectedProfiles) {
    scores[p.platform] = computePersonaScore(p);
  }

  const metricRows = buildMultiMetricRows(selectedProfiles, scores, creatorMeta, selectedIds);
  const scoreEntries = buildMultiScoreEntries(selectedProfiles, scores, creatorMeta, selectedIds);
  const useBarChart = selectedProfiles.length >= 3;

  return (
    <>
      <section>
        <h2 className="kicker mb-3">{t('ui.compare.keyMetrics')}</h2>
        <MetricRankingTable rows={metricRows} scoreEntries={scoreEntries} />
      </section>

      <section>
        <h2 className="kicker mb-3">
          {useBarChart ? 'Metric Breakdown' : 'Multi-Dimensional Overview'}
        </h2>
        {useBarChart ? (
          <ComparisonBarChart
            metrics={metricRows.map((r) => ({
              label: r.label,
              winnerId: r.winnerId,
              values: r.values.map((v) => ({
                id: v.creatorId,
                name: v.creatorName,
                display: v.display,
                raw: v.raw,
              })),
            }))}
          />
        ) : (
          <MultiRadarView profiles={selectedProfiles} />
        )}
      </section>

      <section>
        <h2 className="kicker mb-3">{t('ui.compare.personaScoreComparison')}</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {scoreEntries.map((entry) => {
            const bestScore = Math.max(...scoreEntries.map((e) => e.overall));
            const isBest = entry.overall === bestScore;
            return (
              <div
                key={entry.creatorId}
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
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-subtle)]">
                  {entry.creatorName}
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
    </>
  );
}

// ---------------------------------------------------------------------------
// Multi-radar for 2 creators (reuse CompareRadarChart)
// ---------------------------------------------------------------------------

function MultiRadarView({ profiles }: { profiles: CreatorProfile[] }) {
  // comparePlatforms is a pure sync function
  const { comparePlatforms } = require('@/lib/engine');
  const comparison = comparePlatforms(profiles);
  if (comparison.summaries.length < 2) return null;
  return <CompareRadarChart summaries={comparison.summaries} />;
}

// ---------------------------------------------------------------------------
// Data builders
// ---------------------------------------------------------------------------

function buildMultiMetricRows(
  profiles: CreatorProfile[],
  scores: Record<string, PersonaScore>,
  creatorMeta: Record<string, { name: string; platform: string }>,
  selectedIds: string[],
): MultiMetricRow[] {
  const rows: MultiMetricRow[] = [];

  // Followers
  const followerValues = profiles.map((p, i) => {
    const id = selectedIds[i] ?? `${p.platform}-${i}`;
    const meta = creatorMeta[id] ?? { name: p.profile.nickname || p.profile.uniqueId || p.platform, platform: p.platform };
    return { creatorId: id, creatorName: meta.name, platform: meta.platform, display: formatNumber(p.profile.followers), raw: p.profile.followers };
  });
  rows.push({ label: t('ui.compare.followers'), values: followerValues, winnerId: followerValues.reduce((a, b) => (b.raw > a.raw ? b : a)).creatorId });

  // Engagement Rate
  const engValues = profiles.map((p, i) => {
    const id = selectedIds[i] ?? `${p.platform}-${i}`;
    const meta = creatorMeta[id] ?? { name: p.profile.nickname || p.profile.uniqueId || p.platform, platform: p.platform };
    const rate = scores[p.platform]?.engagement.overallRate ?? 0;
    return { creatorId: id, creatorName: meta.name, platform: meta.platform, display: `${(rate * 100).toFixed(1)}%`, raw: rate };
  });
  rows.push({ label: t('ui.compare.engagementRate'), values: engValues, winnerId: engValues.reduce((a, b) => (b.raw > a.raw ? b : a)).creatorId });

  // Posts
  const postValues = profiles.map((p, i) => {
    const id = selectedIds[i] ?? `${p.platform}-${i}`;
    const meta = creatorMeta[id] ?? { name: p.profile.nickname || p.profile.uniqueId || p.platform, platform: p.platform };
    const count = scores[p.platform]?.postsAnalysed ?? 0;
    return { creatorId: id, creatorName: meta.name, platform: meta.platform, display: String(count), raw: count };
  });
  rows.push({ label: t('ui.common.posts'), values: postValues, winnerId: postValues.reduce((a, b) => (b.raw > a.raw ? b : a)).creatorId });

  // Likes Total
  const likeValues = profiles.map((p, i) => {
    const id = selectedIds[i] ?? `${p.platform}-${i}`;
    const meta = creatorMeta[id] ?? { name: p.profile.nickname || p.profile.uniqueId || p.platform, platform: p.platform };
    return { creatorId: id, creatorName: meta.name, platform: meta.platform, display: formatNumber(p.profile.likesTotal), raw: p.profile.likesTotal };
  });
  rows.push({ label: t('ui.compare.likesTotal'), values: likeValues, winnerId: likeValues.reduce((a, b) => (b.raw > a.raw ? b : a)).creatorId });

  return rows;
}

function buildMultiScoreEntries(
  profiles: CreatorProfile[],
  scores: Record<string, PersonaScore>,
  creatorMeta: Record<string, { name: string; platform: string }>,
  selectedIds: string[],
): MultiScoreEntry[] {
  return profiles.map((p, i) => {
    const id = selectedIds[i] ?? `${p.platform}-${i}`;
    const meta = creatorMeta[id] ?? { name: p.profile.nickname || p.profile.uniqueId || p.platform, platform: p.platform };
    return {
      creatorId: id,
      creatorName: meta.name,
      platform: meta.platform,
      label: PLATFORM_LABELS[meta.platform] ?? meta.platform,
      overall: overallScore(scores[p.platform]),
    };
  });
}
