'use client';

import { useState } from 'react';
import type {
  MetricRow,
  PlatformScoreEntry,
  ContentOverlapEntry,
} from './page';

const PLATFORM_LABELS: Record<string, string> = {
  douyin: 'Douyin',
  tiktok: 'TikTok',
  xhs: 'Red Note',
};

const PLATFORMS = ['douyin', 'tiktok', 'xhs'] as const;

interface CompareTableProps {
  metricRows: MetricRow[];
  scoreEntries: PlatformScoreEntry[];
  contentOverlap: ContentOverlapEntry[];
  insights: string[];
}

export default function CompareTable({
  metricRows,
  scoreEntries,
  contentOverlap,
  insights,
}: CompareTableProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <>
      {/* Desktop: full table */}
      <div className="card hidden overflow-hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <th
                  className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  Metric
                </th>
                {PLATFORMS.map((p) => (
                  <th
                    key={p}
                    className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    {PLATFORM_LABELS[p]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metricRows.map((row) => (
                <tr
                  key={row.label}
                  style={{ borderBottom: '1px solid var(--border-subtle)' }}
                >
                  <td
                    className="px-5 py-3"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {row.label}
                  </td>
                  {row.values.map((v) => {
                    const isWinner = v.platform === row.winnerPlatform;
                    return (
                      <td
                        key={v.platform}
                        className="metric-value px-5 py-3 text-right"
                        style={{
                          color: isWinner
                            ? 'var(--accent-green)'
                            : 'var(--text-primary)',
                          fontWeight: isWinner ? 600 : 400,
                        }}
                      >
                        {v.display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: tab navigation */}
      <div className="sm:hidden">
        <div
          className="mb-4 flex rounded-lg p-1"
          style={{ background: 'var(--bg-secondary)' }}
          role="tablist"
        >
          {PLATFORMS.map((p, i) => {
            const isActive = i === activeTab;
            return (
              <button
                key={p}
                role="tab"
                aria-selected={isActive}
                className="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: isActive ? 'var(--bg-card)' : 'transparent',
                  color: isActive
                    ? 'var(--text-primary)'
                    : 'var(--text-subtle)',
                  border: isActive
                    ? '1px solid var(--border-subtle)'
                    : '1px solid transparent',
                }}
                onClick={() => setActiveTab(i)}
              >
                {PLATFORM_LABELS[p]}
              </button>
            );
          })}
        </div>

        {/* Active platform metrics */}
        <div className="card p-5">
          <h3
            className="mb-4 text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {PLATFORM_LABELS[PLATFORMS[activeTab]]}
          </h3>
          <div className="flex flex-col gap-3">
            {metricRows.map((row) => {
              const v = row.values.find(
                (val) => val.platform === PLATFORMS[activeTab],
              );
              const isWinner =
                row.winnerPlatform === PLATFORMS[activeTab];
              return (
                <div
                  key={row.label}
                  className="flex items-center justify-between"
                >
                  <span
                    className="text-xs"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    {row.label}
                  </span>
                  <span
                    className="metric-value text-sm font-medium"
                    style={{
                      color: isWinner
                        ? 'var(--accent-green)'
                        : 'var(--text-primary)',
                    }}
                  >
                    {v?.display ?? '\u2014'}
                    {isWinner && (
                      <span
                        className="ml-1 text-[10px]"
                        style={{ color: 'var(--accent-green)' }}
                      >
                        #1
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
