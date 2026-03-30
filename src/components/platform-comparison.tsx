'use client';

import { useState } from 'react';
import type { CrossPlatformComparison, PlatformSummary } from '@/lib/engine';
import { formatNumber } from '@/lib/engine';
import { PLATFORM_LABELS } from '@/lib/utils/constants';
import { t } from '@/lib/i18n';

interface PlatformComparisonProps {
  comparison: CrossPlatformComparison;
}

function topContentType(summary: PlatformSummary): string {
  const entries = Object.entries(summary.contentDistribution);
  if (entries.length === 0) return t('ui.common.na');
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
            className="text-xs text-[var(--text-subtle)]"
          >
            {t('ui.compare.followers')}
          </p>
          <p
            className="metric-value text-lg font-semibold text-[var(--text-primary)]"
          >
            {formatNumber(summary.followers)}
          </p>
        </div>
        <div>
          <p
            className="text-xs text-[var(--text-subtle)]"
          >
            {t('ui.compare.engagementRate')}
          </p>
          <p
            className="metric-value text-lg font-semibold text-[var(--text-primary)]"
          >
            {(summary.overallEngagementRate * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p
            className="text-xs text-[var(--text-subtle)]"
          >
            {t('ui.components.topContent')}
          </p>
          <p
            className="text-sm font-medium capitalize text-[var(--text-secondary)]"
          >
            {topContentType(summary)}
          </p>
        </div>
        <div>
          <p
            className="text-xs text-[var(--text-subtle)]"
          >
            {t('ui.common.posts')}
          </p>
          <p
            className="metric-value text-lg font-semibold text-[var(--text-primary)]"
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
            className="rounded-lg p-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
          >
            <PlatformCard summary={s} />
          </div>
        ))}
      </div>

      {/* Mobile: tab navigation */}
      <div className="sm:hidden">
        <div
          className="mb-4 flex rounded-lg p-1 bg-[var(--bg-secondary)]"
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
            className="rounded-lg p-4 bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
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
              className="rounded-lg px-4 py-3 text-sm bg-[rgba(240,_245,_69,_0.06)] border border-[rgba(240,_245,_69,_0.12)] text-[var(--accent-highlight)]"
            >
              {insight.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
