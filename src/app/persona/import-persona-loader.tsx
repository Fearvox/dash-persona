'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import {
  computePersonaScore,
  generateStrategySuggestions,
  type PersonaScore,
  type StrategySuggestion,
} from '@/lib/engine';
import { resolveProfiles, type ResolvedProfiles } from '@/lib/store/profile-store';
import { CollectedAt } from '@/components/ui/collected-at';
import { DataSourceBanner } from '@/components/ui/data-source-banner';
import { DataErrorCard } from '@/components/ui/data-error-card';
import PersonaDetailContent from './persona-detail-content';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ImportPersonaLoaderProps {
  platform: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportPersonaLoader({ platform }: ImportPersonaLoaderProps) {
  const router = useRouter();
  const [resolved, setResolved] = useState<ResolvedProfiles | null>(null);
  const [data, setData] = useState<{
    score: PersonaScore;
    suggestions: StrategySuggestion[];
    platform: string;
    platforms: string[];
    personaType: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let result: ResolvedProfiles;
      try {
        result = await resolveProfiles();
      } catch {
        result = { profiles: {}, source: 'error', reason: 'Unexpected error loading profiles', code: 'FETCH_ERROR' };
      }

      if (cancelled) return;

      if (result.source === 'empty') {
        router.replace('/onboarding');
        return;
      }

      setResolved(result);

      if (result.source === 'error' || Object.keys(result.profiles).length === 0) {
        setLoading(false);
        return;
      }

      const profiles = result.profiles;

      // Ensure profileUrl exists (consistent with sibling loaders)
      for (const p of Object.values(profiles)) {
        if (!p.profileUrl) p.profileUrl = 'https://creator.douyin.com';
      }

      // Validate platform against available platforms
      const availablePlatforms = Object.keys(profiles);
      const resolvedPlatform = availablePlatforms.includes(platform)
        ? platform
        : availablePlatforms[0];

      const profile = profiles[resolvedPlatform];
      const score = computePersonaScore(profile);
      const suggestions = generateStrategySuggestions(score).slice(0, 2);

      // Derive a persona type label from the profile
      const personaType = profile.profile.nickname || 'imported';

      if (!cancelled) {
        setData({
          score,
          suggestions,
          platform: resolvedPlatform,
          platforms: availablePlatforms,
          personaType,
        });
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [platform, router]);

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
        <p className="text-sm text-[var(--text-secondary)]">
          {t('ui.common.loadingImported')}
        </p>
      </div>
    );
  }

  if (resolved?.source === 'error') {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
        <DataErrorCard code={resolved.code} reason={resolved.reason} />
      </div>
    );
  }

  if (!data || !resolved) return null;

  return (
    <div className="flex flex-col gap-4">
      {resolved.source === 'real' && resolved.collectedAt && (
        <div className="mx-auto w-full max-w-6xl px-6 pt-4">
          <CollectedAt timestamp={resolved.collectedAt} />
        </div>
      )}
      <DataSourceBanner source={resolved.source} reason={resolved.reason} />
      <PersonaDetailContent
        score={data.score}
        suggestions={data.suggestions}
        platform={data.platform}
        platforms={data.platforms}
        source="import"
        personaType={data.personaType}
      />
    </div>
  );
}
