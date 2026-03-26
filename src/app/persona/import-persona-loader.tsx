'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import {
  computePersonaScore,
  generateStrategySuggestions,
  type PersonaScore,
  type StrategySuggestion,
} from '@/lib/engine';
import { loadProfiles } from '@/lib/store/profile-store';
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
      // Try sessionStorage first (fast, sync)
      let profiles: Record<string, CreatorProfile> | null = null;

      const raw = sessionStorage.getItem('dashpersona-import-profiles');
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Record<string, CreatorProfile>;
          if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
            profiles = parsed;
          }
        } catch {
          // fall through to IndexedDB
        }
      }

      // Fallback to IndexedDB
      if (!profiles) {
        try {
          const loaded = await loadProfiles();
          if (loaded && Object.keys(loaded).length > 0) {
            profiles = loaded;
          }
        } catch {
          // IndexedDB unavailable
        }
      }

      if (cancelled) return;

      // No data — redirect to onboarding
      if (!profiles || Object.keys(profiles).length === 0) {
        router.replace('/onboarding');
        return;
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
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading imported data...
        </p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <PersonaDetailContent
      score={data.score}
      suggestions={data.suggestions}
      platform={data.platform}
      platforms={data.platforms}
      source="import"
      personaType={data.personaType}
    />
  );
}
