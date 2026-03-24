'use client';

import { useState } from 'react';
import type { CrossPlatformComparison, PlatformSummary } from '@/lib/engine';
import { formatNumber } from '@/lib/engine';

const PLATFORM_LABELS: Record<string, string> = {
  douyin: 'Douyin',
  tiktok: 'TikTok',
  xhs: 'Xiaohongshu',
};

interface PlatformComparisonProps {
  comparison: CrossPlatformComparison;
}

function topContentType(summary: PlatformSummary): string {
  const entries = Object.entries(summary.contentDistribution);
  if (entries.length === 0) return 'N/A';
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

function PlatformCard({ summary }: { summary: PlatformSummary }) {
  const label = PLATFORM_LABELS[summary.platform] ?? summary.platform;
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold">{label}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p
            className="text-xs"
            style={{ color: 'var(--text-subtle)' }}
          >
            Followers
          </p>
          <p
            className="metric-value text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {formatNumber(summary.followers)}
          </p>
        </div>
        <div>
          <p
            className="text-xs"
            style={{ color: 'var(--text-subtle)' }}
          >
            Engagement Rate
          </p>
          <p
            className="metric-value text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {(summary.overallEngagementRate * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p
            className="text-xs"
            style={{ color: 'var(--text-subtle)' }}
          >
            Top Content
          </p>
          <p
            className="text-sm font-medium capitalize"
            style={{ color: 'var(--text-secondary)' }}
          >
            {topContentType(summary)}
          </p>
        </div>
        <div>
          <p
            className="text-xs"
            style={{ color: 'var(--text-subtle)' }}
          >
            Posts
          </p>
          <p
            className="metric-value text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {summary.postCount}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PlatformComparison({
  comparison,
}: PlatformComparisonProps) {
  const [activeTab, setActiveTab] = useState(0);
  const { summaries, insights } = comparison;

  return (
    <div className="card p-6">
      {/* Desktop: side-by-side columns */}
      <div className="hidden gap-6 sm:grid sm:grid-cols-3">
        {summaries.map((s) => (
          <div
            key={s.platform}
            className="rounded-lg p-4"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <PlatformCard summary={s} />
          </div>
        ))}
      </div>

      {/* Mobile: tab navigation */}
      <div className="sm:hidden">
        <div
          className="mb-4 flex rounded-lg p-1"
          style={{ background: 'var(--bg-secondary)' }}
          role="tablist"
        >
          {summaries.map((s, i) => {
            const label = PLATFORM_LABELS[s.platform] ?? s.platform;
            const isActive = i === activeTab;
            return (
              <button
                key={s.platform}
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
                {label}
              </button>
            );
          })}
        </div>

        {summaries[activeTab] && (
          <div
            className="rounded-lg p-4"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
            role="tabpanel"
          >
            <PlatformCard summary={summaries[activeTab]} />
          </div>
        )}
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="mt-5 flex flex-col gap-2">
          {insights.slice(0, 4).map((insight, i) => (
            <div
              key={i}
              className="rounded-lg px-4 py-3 text-sm"
              style={{
                background: 'rgba(228, 242, 34, 0.06)',
                border: '1px solid rgba(228, 242, 34, 0.12)',
                color: 'var(--accent-highlight)',
              }}
            >
              {insight.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
