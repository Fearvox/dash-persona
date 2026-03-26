'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import {
  computePersonaScore,
  comparePlatforms,
  generateStrategySuggestions,
  type PersonaScore,
} from '@/lib/engine';
import LiveCollector from './live-collector';
import GrowthSparklines from './growth-sparklines';
import PersonaOverview from './persona-overview';
import PlatformComparison from './platform-comparison';
import StrategySuggestions from './strategy-suggestions';

interface LiveDashboardWrapperProps {
  url: string;
  /** Pre-computed demo data to fall back to if live collection fails. */
  fallbackProfiles: Record<string, CreatorProfile>;
}

export default function LiveDashboardWrapper({
  url,
  fallbackProfiles,
}: LiveDashboardWrapperProps) {
  const [profiles, setProfiles] = useState<Record<string, CreatorProfile> | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const handleSuccess = useCallback((profile: CreatorProfile) => {
    setProfiles({ [profile.platform]: profile });
    setUsedFallback(false);
  }, []);

  const handleError = useCallback(() => {
    setProfiles(fallbackProfiles);
    setUsedFallback(true);
  }, [fallbackProfiles]);

  // Compute analysis from whichever profiles we have
  const activeProfiles = profiles ?? fallbackProfiles;
  const personaScores: Record<string, PersonaScore> = {};
  for (const [platform, profile] of Object.entries(activeProfiles)) {
    personaScores[platform] = computePersonaScore(profile);
  }

  const comparison = comparePlatforms(Object.values(activeProfiles));
  const bestPlatform =
    comparison.bestEngagementPlatform ?? Object.keys(personaScores)[0];
  const bestPersonaScore =
    personaScores[bestPlatform] ?? Object.values(personaScores)[0];
  const suggestions = generateStrategySuggestions(bestPersonaScore, comparison);

  const showDashboard = profiles !== null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      {/* Header */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/"
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--accent-green)' }}
            aria-label="Back to home"
          >
            &larr; DashPersona
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            {t('ui.dashboard.title')}
          </h1>
          <span className="badge badge-green mt-1">
            {usedFallback ? t('ui.components.demoModeFallback') : t('ui.components.liveData')}
          </span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
          {usedFallback ? t('ui.components.showingDemo') : url}
        </p>
        {!usedFallback && profiles !== null && (
          <p
            className="mt-1 rounded-md px-3 py-1.5 text-xs leading-5"
            style={{
              background: 'rgba(126, 184, 210, 0.08)',
              color: 'var(--accent-blue)',
              border: '1px solid rgba(126, 184, 210, 0.15)',
            }}
          >
            {t('ui.components.snapshotNote')}
          </p>
        )}
      </header>

      {/* Live collector status */}
      <LiveCollector url={url} onSuccess={handleSuccess} onError={handleError} />

      {/* Dashboard content */}
      {showDashboard && (
        <>
          <section aria-labelledby="growth-heading">
            <h2 id="growth-heading" className="kicker mb-3">
              {t('ui.dashboard.growthOverview')}
            </h2>
            <GrowthSparklines profiles={activeProfiles} />
          </section>

          <section aria-labelledby="persona-heading">
            <h2 id="persona-heading" className="kicker mb-3">
              {t('ui.dashboard.personaScore')}
            </h2>
            <PersonaOverview scores={personaScores} />
          </section>

          <section aria-labelledby="platforms-heading">
            <h2 id="platforms-heading" className="kicker mb-3">
              {t('ui.dashboard.crossPlatformComparison')}
            </h2>
            <PlatformComparison comparison={comparison} />
          </section>

          <section aria-labelledby="strategy-heading">
            <h2 id="strategy-heading" className="kicker mb-3">
              {t('ui.dashboard.strategySuggestions')}
            </h2>
            <StrategySuggestions suggestions={suggestions} />
          </section>
        </>
      )}
    </div>
  );
}
