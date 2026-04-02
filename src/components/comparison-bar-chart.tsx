'use client';

import { t } from '@/lib/i18n';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { PlatformSummary } from '@/lib/engine';

// ---------------------------------------------------------------------------
// Color palette — deterministic by creator index
// ---------------------------------------------------------------------------

const CREATOR_COLORS = [
  'var(--accent-green)',   // #7ed29a — index 0
  'var(--accent-blue)',    // #7eb8d2 — index 1
  'var(--accent-yellow)',  // #d2c87e — index 2
  'var(--accent-red)',     // #c87e7e — index 3
  'var(--accent-highlight)', // #f0f545 — index 4
] as const;

// ---------------------------------------------------------------------------
// Data normalization — all metrics scaled 0–100 per metric
// ---------------------------------------------------------------------------

interface BarDimension {
  metric: string;
  fullMark: number;
  [platform: string]: string | number;
}

const METRICS = [
  {
    key: 'followers',
    label: t('ui.compare.radarFollowers'),
    extract: (s: PlatformSummary) => s.followers,
  },
  {
    key: 'engagementRate',
    label: t('ui.compare.radarEngagement'),
    extract: (s: PlatformSummary) => s.overallEngagementRate * 100,
  },
  {
    key: 'postCount',
    label: t('ui.compare.radarPosts'),
    extract: (s: PlatformSummary) => s.postCount,
  },
  {
    key: 'totalViews',
    label: t('ui.compare.radarViews'),
    extract: (s: PlatformSummary) => s.totalViews,
  },
  {
    key: 'totalEngagement',
    label: t('ui.compare.radarTotalEng'),
    extract: (s: PlatformSummary) => s.totalEngagement,
  },
] as const;

function normalizeToBars(summaries: PlatformSummary[]): BarDimension[] {
  return METRICS.map((dim) => {
    const values = summaries.map((s) => dim.extract(s));
    const maxVal = Math.max(...values, 1);

    const entry: BarDimension = {
      metric: dim.label,
      fullMark: 100,
    };

    for (const s of summaries) {
      entry[s.platform] = Math.round((dim.extract(s) / maxVal) * 100);
    }

    return entry;
  });
}

// ---------------------------------------------------------------------------
// Rank table — winner per metric highlighted in green
// ---------------------------------------------------------------------------

function RankTable({
  summaries,
  data,
}: {
  summaries: PlatformSummary[];
  data: BarDimension[];
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="pr-3 text-left text-[var(--text-subtle)] font-normal">
              {t('ui.compare.metric')}
            </th>
            {summaries.map((s) => (
              <th
                key={s.platform}
                className="px-3 text-center text-[var(--text-subtle)] font-normal"
              >
                {s.platform}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            // Find winner (max value) for this metric
            const rawValues = summaries.map((s) => row[s.platform] as number);
            const maxVal = Math.max(...rawValues);

            return (
              <tr
                key={row.metric}
                className="border-t border-[rgba(255,255,255,0.05)]"
              >
                <td className="pr-3 py-1.5 text-[var(--text-secondary)]">
                  {row.metric}
                </td>
                {summaries.map((s) => {
                  const val = row[s.platform] as number;
                  const isWinner = val === maxVal && maxVal > 0;
                  return (
                    <td
                      key={s.platform}
                      className={`px-3 py-1.5 text-center font-mono tabular-nums ${
                        isWinner
                          ? 'text-[var(--accent-green)] font-semibold'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {isWinner ? `#1 ${val}` : val}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card p-2 text-xs">
      <p className="text-[var(--text-primary)] font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ComparisonBarChartProps {
  summaries: PlatformSummary[];
}

export default function ComparisonBarChart({
  summaries,
}: ComparisonBarChartProps) {
  // Radar is used for 2 creators; bar chart needs 3+ for meaningful ranking
  if (summaries.length < 3) return null;

  const data = normalizeToBars(summaries);

  return (
    <div className="card p-6">
      <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
        {t('ui.compare.rankedComparison')}
      </h3>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: 'var(--text-subtle)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="metric"
            tick={{ fill: 'var(--text-subtle)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          {summaries.map((s, idx) => (
            <Bar
              key={s.platform}
              dataKey={s.platform}
              name={s.platform}
              fill={CREATOR_COLORS[idx % CREATOR_COLORS.length]}
              radius={[0, 2, 2, 0]}
              maxBarSize={20}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <RankTable summaries={summaries} data={data} />
    </div>
  );
}
