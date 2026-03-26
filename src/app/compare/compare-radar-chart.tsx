'use client';

import { useState, useEffect } from 'react';
import { t } from '@/lib/i18n';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PlatformSummary } from '@/lib/engine';
import { PLATFORM_LABELS } from '@/lib/utils/constants';

// ---------------------------------------------------------------------------
// Color map per platform — resolved from CSS variables at mount
// ---------------------------------------------------------------------------

const PLATFORM_CSS_VARS: Record<string, string> = {
  douyin: '--accent-green',
  tiktok: '--accent-blue',
  xhs: '--accent-yellow',
};

const FALLBACK_COLOR = '#8a9590';

function usePlatformColors(): Record<string, string> {
  const [colors, setColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const resolved: Record<string, string> = {};
    for (const [platform, cssVar] of Object.entries(PLATFORM_CSS_VARS)) {
      resolved[platform] = style.getPropertyValue(cssVar).trim() || FALLBACK_COLOR;
    }
    setColors(resolved);
  }, []);

  return colors;
}

// ---------------------------------------------------------------------------
// Normalize values to 0-100 scale
// ---------------------------------------------------------------------------

interface RadarDimension {
  dimension: string;
  fullMark: number;
  [platform: string]: string | number;
}

function normalizeToRadar(summaries: PlatformSummary[]): RadarDimension[] {
  const dimensions = [
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
  ];

  return dimensions.map((dim) => {
    const values = summaries.map((s) => dim.extract(s));
    const maxVal = Math.max(...values, 1);

    const entry: RadarDimension = {
      dimension: dim.label,
      fullMark: 100,
    };

    for (const s of summaries) {
      entry[s.platform] = Math.round((dim.extract(s) / maxVal) * 100);
    }

    return entry;
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CompareRadarChartProps {
  summaries: PlatformSummary[];
}

export default function CompareRadarChart({ summaries }: CompareRadarChartProps) {
  const platformColors = usePlatformColors();

  if (summaries.length < 2) return null;

  const data = normalizeToRadar(summaries);

  return (
    <div className="card p-6">
      <h3
        className="mb-4 text-sm font-semibold text-[var(--text-primary)]"
      >
        {t('ui.compare.multiDimensional')}
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: 'var(--text-subtle)', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          {summaries.map((s) => (
            <Radar
              key={s.platform}
              name={PLATFORM_LABELS[s.platform] ?? s.platform}
              dataKey={s.platform}
              stroke={platformColors[s.platform] ?? FALLBACK_COLOR}
              fill={platformColors[s.platform] ?? FALLBACK_COLOR}
              fillOpacity={0.12}
              strokeWidth={2}
            />
          ))}
          <Legend
            wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
