'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { HistorySnapshot } from '@/lib/schema/creator-data';
import { createHistoryStore } from '@/lib/history/store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MetricKey = 'followers' | 'likesTotal' | 'videosCount';
type RangeKey = '7d' | '30d' | '90d' | 'all';

interface ChartDataPoint {
  date: string;
  label: string;
  followers: number;
  likesTotal: number;
  videosCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const METRICS: { key: MetricKey; label: string; color: string; bgTint: string }[] = [
  { key: 'followers', label: 'Followers', color: 'var(--accent-green)', bgTint: 'rgba(126, 210, 154, 0.15)' },
  { key: 'likesTotal', label: 'Total Likes', color: 'var(--accent-yellow)', bgTint: 'rgba(210, 200, 126, 0.15)' },
  { key: 'videosCount', label: 'Videos', color: 'var(--accent-blue)', bgTint: 'rgba(126, 184, 210, 0.15)' },
];

const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: 'all', label: 'All', days: Infinity },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function snapshotsToChartData(snapshots: HistorySnapshot[]): ChartDataPoint[] {
  return snapshots.map((s) => ({
    date: s.fetchedAt,
    label: formatDate(s.fetchedAt),
    followers: s.profile.followers,
    likesTotal: s.profile.likesTotal,
    videosCount: s.profile.videosCount,
  }));
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

function CustomTooltip({
  active,
  payload,
  activeMetrics,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
  activeMetrics: Set<MetricKey>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0];
  if (!point) return null;

  return (
    <div role="tooltip" aria-live="polite" className="rounded-lg px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
      {payload
        .filter((p) => activeMetrics.has(p.dataKey as MetricKey))
        .map((p) => {
          const metric = METRICS.find((m) => m.key === p.dataKey);
          return (
            <div key={p.dataKey} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: p.color }}
              />
              <span className="text-[var(--text-secondary)]">
                {metric?.label ?? p.dataKey}:
              </span>
              <span className="font-mono font-medium text-[var(--text-primary)]">
                {formatNumber(p.value)}
              </span>
            </div>
          );
        })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg py-16 bg-[var(--bg-card)] border border-dashed border-[var(--border-subtle)]">
      <p className="text-sm font-medium text-[var(--text-secondary)]">
        Start tracking to see trends
      </p>
      <p className="max-w-xs text-center text-xs text-[var(--text-subtle)]">
        Growth history snapshots will appear here once data is collected over multiple sessions.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface GrowthTrendChartProps {
  /** Storage key(s) to load snapshots for. */
  storeKeys: string[];
}

export default function GrowthTrendChart({ storeKeys }: GrowthTrendChartProps) {
  const [snapshots, setSnapshots] = useState<HistorySnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(
    new Set(['followers']),
  );
  const [range, setRange] = useState<RangeKey>('all');

  // Load snapshots from IndexedDB
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      const store = createHistoryStore();
      const allSnapshots: HistorySnapshot[] = [];

      for (const key of storeKeys) {
        const snaps = await store.getSnapshots(key);
        allSnapshots.push(...snaps);
      }

      // Deduplicate by fetchedAt and sort
      const seen = new Set<string>();
      const deduped: HistorySnapshot[] = [];
      for (const s of allSnapshots) {
        if (!seen.has(s.fetchedAt)) {
          seen.add(s.fetchedAt);
          deduped.push(s);
        }
      }
      deduped.sort(
        (a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime(),
      );

      if (!cancelled) {
        setSnapshots(deduped);
        setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [storeKeys]);

  // Filter by time range
  const filteredData = useMemo(() => {
    const rangeConfig = RANGES.find((r) => r.key === range);
    if (!rangeConfig || rangeConfig.days === Infinity) {
      return snapshotsToChartData(snapshots);
    }

    const cutoff = Date.now() - rangeConfig.days * 86_400_000;
    const filtered = snapshots.filter(
      (s) => new Date(s.fetchedAt).getTime() >= cutoff,
    );
    return snapshotsToChartData(filtered);
  }, [snapshots, range]);

  // Toggle metric
  function toggleMetric(key: MetricKey) {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="h-64 animate-pulse rounded-lg bg-[var(--bg-card)]" />
    );
  }

  if (snapshots.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls: metric toggles + range selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Metric toggles — dynamic color-mix + ternary, keep style={{}} */}
        <div className="flex flex-wrap gap-2">
          {METRICS.map((m) => {
            const isActive = activeMetrics.has(m.key);
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => toggleMetric(m.key)}
                aria-pressed={isActive}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  background: isActive ? m.bgTint : 'var(--bg-secondary)',
                  color: isActive ? m.color : 'var(--text-subtle)',
                  border: isActive ? `1px solid ${m.color}` : '1px solid var(--border-subtle)',
                }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: isActive ? m.color : 'var(--text-subtle)', opacity: isActive ? 1 : 0.4 }}
                />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Range selector — conditional ternary, keep style={{}} */}
        <div className="flex rounded-lg p-0.5 bg-[var(--bg-secondary)]">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className="rounded-md px-3 py-1 text-xs font-medium transition-colors"
              style={{
                background: range === r.key ? 'var(--bg-card)' : 'transparent',
                color: range === r.key ? 'var(--text-primary)' : 'var(--text-subtle)',
                border: range === r.key ? '1px solid var(--border-subtle)' : '1px solid transparent',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-lg p-4 bg-[var(--bg-card)] border border-[var(--border-subtle)]">
        {filteredData.length < 2 ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-xs text-[var(--text-subtle)]">
              Need at least 2 data points to render a trend line
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={filteredData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: '#8a9590', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              />
              <YAxis
                tickFormatter={formatNumber}
                tick={{ fill: '#8a9590', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                content={<CustomTooltip activeMetrics={activeMetrics} />}
                cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
              />
              {METRICS.filter((m) => activeMetrics.has(m.key)).map((m) => (
                <Line
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={filteredData.length <= 30}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary stats */}
      {filteredData.length >= 2 && (
        <div className="grid grid-cols-3 gap-3">
          {METRICS.filter((m) => activeMetrics.has(m.key)).map((m) => {
            const first = filteredData[0][m.key];
            const last = filteredData[filteredData.length - 1][m.key];
            const delta = last - first;
            const pctChange = first > 0 ? (delta / first) * 100 : 0;
            const isPositive = delta >= 0;

            return (
              <div key={m.key} className="card p-3">
                <p className="text-xs text-[var(--text-subtle)]">
                  {m.label}
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-[var(--text-primary)]">
                  {formatNumber(last)}
                </p>
                <p
                  className="mt-0.5 font-mono text-xs font-medium"
                  style={{ color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)' }}
                >
                  {isPositive ? '+' : ''}{formatNumber(delta)} ({pctChange.toFixed(1)}%)
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
