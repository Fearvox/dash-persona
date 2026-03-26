'use client';

import { useEffect, useState } from 'react';
import { derivePreferences, type UserPreferences } from '@/lib/learning';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import { t } from '@/lib/i18n';

interface Insight {
  label: string;
  detail: string;
  accent: string;
}

function generateInsights(
  prefs: UserPreferences,
  profiles: Record<string, CreatorProfile>,
): Insight[] {
  const insights: Insight[] = [];

  // 1. Focus platform insight
  if (prefs.focusPlatform && profiles[prefs.focusPlatform]) {
    const p = profiles[prefs.focusPlatform];
    const label = t(`platform.${prefs.focusPlatform}` as never) || prefs.focusPlatform;
    const topPost = [...p.posts].sort((a, b) => b.views - a.views)[0];
    if (topPost) {
      insights.push({
        label: t('ui.components.topPost', { platform: label }),
        detail: t('ui.components.topPostDetail', { platform: label, views: topPost.views.toLocaleString() }),
        accent: 'var(--accent-green)',
      });
    }
  }

  // 2. Persona / expand pattern insight
  if (prefs.topSections.some((s) => s.toLowerCase().includes('persona'))) {
    insights.push({
      label: t('ui.components.personaDeepDive'),
      detail: t('ui.components.personaDeepDiveDetail'),
      accent: 'var(--accent-yellow)',
    });
  }

  // 3. Preferred time range insight
  if (prefs.preferredTimeRange !== 168) {
    const days = Math.round(prefs.preferredTimeRange / 24);
    insights.push({
      label: t('ui.components.dayGrowthTrend', { days }),
      detail: t('ui.components.dayGrowthTrendDetail', { days }),
      accent: 'var(--accent-blue)',
    });
  }

  // 4. Dismissed content types
  if (prefs.dismissedContentTypes.length > 0) {
    insights.push({
      label: t('ui.components.contentFilterApplied'),
      detail: t('ui.components.contentFilterDetail', { count: prefs.dismissedContentTypes.length }),
      accent: 'var(--accent-yellow)',
    });
  }

  // 5. Exploration insights (multi-section users)
  if (prefs.topSections.length >= 3) {
    insights.push({
      label: t('ui.components.powerUser'),
      detail: t('ui.components.powerUserDetail'),
      accent: 'var(--accent-green)',
    });
  }

  // Fallback prompts when we have no meaningful preference data
  if (insights.length === 0) {
    insights.push(
      {
        label: t('ui.components.exploreData'),
        detail: t('ui.components.exploreDataDetail'),
        accent: 'var(--accent-blue)',
      },
      {
        label: t('ui.components.crossPlatformView'),
        detail: t('ui.components.crossPlatformViewDetail'),
        accent: 'var(--accent-green)',
      },
      {
        label: t('ui.components.contentCalendarInsight'),
        detail: t('ui.components.contentCalendarInsightDetail'),
        accent: 'var(--accent-yellow)',
      },
    );
  }

  return insights.slice(0, 3);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ForYouCardProps {
  profiles: Record<string, CreatorProfile>;
}

export default function ForYouCard({ profiles }: ForYouCardProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    derivePreferences().then((prefs) => {
      setInsights(generateInsights(prefs, profiles));
      setLoaded(true);
    });
  }, [profiles]);

  if (!loaded) {
    return (
      <div className="card p-5">
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
            style={{
              borderColor: 'var(--accent-green)',
              borderTopColor: 'transparent',
            }}
          />
          <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>
            {t('ui.components.loadingInsights')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3
        className="mb-4 text-xs font-semibold uppercase tracking-wider"
        style={{ color: 'var(--accent-green)' }}
      >
        {t('ui.dashboard.forYou')}
      </h3>
      <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr]">
        {insights.map((insight) => (
          <div
            key={insight.label}
            className="rounded-lg p-3 transition-colors"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <p
              className="mb-1 text-xs font-semibold"
              style={{ color: insight.accent }}
            >
              {insight.label}
            </p>
            <p
              className="text-xs leading-relaxed"
              style={{ color: 'var(--text-subtle)' }}
            >
              {insight.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
