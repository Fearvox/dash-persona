'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CreatorProfile, FanPortrait } from '@/lib/schema/creator-data';
import { ExtensionAdapter, ExtensionAdapterError } from '@/lib/adapters/extension-adapter';
import { t } from '@/lib/i18n';

const STORAGE_KEY = 'dashpersona-extension-profile';

interface ExtensionDataLoaderProps {
  /** Fallback profiles to use while waiting for extension data */
  fallbackProfiles: Record<string, CreatorProfile>;
  /** Render prop — receives the loaded profiles (extension or fallback) */
  children: (props: {
    profiles: Record<string, CreatorProfile>;
    isExtensionData: boolean;
    isLoading: boolean;
    error: string | null;
  }) => React.ReactNode;
}

/**
 * Client component that listens for extension data via:
 * 1. postMessage from the Data Passport extension
 * 2. localStorage fallback (extension stores data before opening tab)
 *
 * Once data arrives, passes it to children via render prop.
 * Surfaces structured errors instead of silently falling back.
 */
export default function ExtensionDataLoader({
  fallbackProfiles,
  children,
}: ExtensionDataLoaderProps) {
  const [profiles, setProfiles] = useState<Record<string, CreatorProfile>>(fallbackProfiles);
  const [isExtensionData, setIsExtensionData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const adapter = new ExtensionAdapter();

  const loadProfile = useCallback(async (data: unknown) => {
    try {
      const json = typeof data === 'string' ? data : JSON.stringify(data);
      const profile = await adapter.collect(json);
      if (profile) {
        setProfiles({ [profile.platform]: profile });
        setIsExtensionData(true);
        setError(null);
        try {
          localStorage.setItem(STORAGE_KEY, json);
        } catch { /* storage full — ignore */ }
      }
    } catch (err) {
      if (err instanceof ExtensionAdapterError) {
        setError(`Extension data error: ${err.message} (${err.code})`);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to process extension data');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Strategy 1: Listen for postMessage from extension
    const handleMessage = (event: MessageEvent) => {
      // Origin validation — accept from same origin or chrome extensions
      if (
        event.origin !== window.location.origin &&
        !event.origin.startsWith('chrome-extension://')
      ) {
        return;
      }
      if (event.data?.type === 'DASHPERSONA_PROFILE_DATA' && event.data?.profile) {
        loadProfile(event.data.profile);
      }
    };
    window.addEventListener('message', handleMessage);

    // Strategy 2: Check localStorage for pending profile (from extension storage fallback)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        loadProfile(stored);
      }
    } catch { /* no storage access */ }

    setIsLoading(false);

    return () => window.removeEventListener('message', handleMessage);
  }, [loadProfile]);

  return <>{children({ profiles, isExtensionData, isLoading, error })}</>;
}

// ---------------------------------------------------------------------------
// FanPortraitCard — renders audience demographics
// ---------------------------------------------------------------------------

interface FanPortraitCardProps {
  fanPortrait: FanPortrait;
}

function DistributionBar({ items, colorVar }: { items: { label: string; value: number }[]; colorVar: string }) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  return (
    <div className="flex flex-col gap-1.5">
      {sorted.slice(0, 5).map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="w-16 shrink-0 truncate text-[11px] text-[var(--text-secondary)]">
            {item.label}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(item.value, 100)}%`, background: `var(${colorVar})` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-[var(--text-subtle)]">
            {item.value.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export function FanPortraitCard({ fanPortrait }: FanPortraitCardProps) {
  const hasGender = fanPortrait.gender && (fanPortrait.gender.male > 0 || fanPortrait.gender.female > 0);
  const hasInterests = fanPortrait.interests && fanPortrait.interests.length > 0;
  const hasProvinces = fanPortrait.provinces && fanPortrait.provinces.length > 0;
  const hasAgeGroups = fanPortrait.ageGroups && fanPortrait.ageGroups.length > 0;

  if (!hasGender && !hasInterests && !hasProvinces && !hasAgeGroups) return null;

  return (
    <div className="card flex flex-col gap-4 p-4">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">
        {t('ui.components.fanPortrait')}
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Gender distribution */}
        {hasGender && fanPortrait.gender && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[var(--text-subtle)]">{t('ui.components.gender')}</p>
            <div className="flex items-center gap-3">
              <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-l-full bg-[var(--accent-blue)]"
                  style={{ width: `${fanPortrait.gender.male}%` }}
                />
                <div
                  className="h-full rounded-r-full bg-[var(--accent-red)]"
                  style={{ width: `${fanPortrait.gender.female}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[var(--accent-blue)]">
                {t('ui.components.male')} {fanPortrait.gender.male.toFixed(1)}%
              </span>
              <span className="text-[var(--accent-red)]">
                {t('ui.components.female')} {fanPortrait.gender.female.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Age groups */}
        {hasAgeGroups && fanPortrait.ageGroups && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[var(--text-subtle)]">{t('ui.components.ageGroups')}</p>
            <DistributionBar
              items={fanPortrait.ageGroups.map((g) => ({ label: g.range, value: g.percentage }))}
              colorVar="--accent-yellow"
            />
          </div>
        )}

        {/* Interests */}
        {hasInterests && fanPortrait.interests && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[var(--text-subtle)]">{t('ui.components.interests')}</p>
            <DistributionBar
              items={fanPortrait.interests.map((i) => ({ label: i.name, value: i.percentage }))}
              colorVar="--accent-green"
            />
          </div>
        )}

        {/* Provinces */}
        {hasProvinces && fanPortrait.provinces && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[var(--text-subtle)]">{t('ui.components.topRegions')}</p>
            <DistributionBar
              items={fanPortrait.provinces.map((p) => ({ label: p.name, value: p.percentage }))}
              colorVar="--accent-blue"
            />
          </div>
        )}
      </div>
    </div>
  );
}
