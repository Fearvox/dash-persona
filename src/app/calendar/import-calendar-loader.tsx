'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { generateContentPlan, type ContentPlan } from '@/lib/engine';
import { resolveProfiles, type ResolvedProfiles } from '@/lib/store/profile-store';
import { CollectedAt } from '@/components/ui/collected-at';
import { DataSourceBanner } from '@/components/ui/data-source-banner';
import { DataErrorCard } from '@/components/ui/data-error-card';
import CalendarClient from './calendar-client';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportCalendarLoader() {
  const router = useRouter();
  const [resolved, setResolved] = useState<ResolvedProfiles | null>(null);
  const [plan, setPlan] = useState<ContentPlan | null>(null);
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

      const contentPlan = generateContentPlan(profiles, 35);

      if (!cancelled) {
        setPlan(contentPlan);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [router]);

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
        <header className="flex flex-col gap-2">
          <Link href="/dashboard?source=import" className="nav-pill" aria-label="Back to dashboard">
            &larr; Dashboard
          </Link>
          <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            {t('ui.calendar.title')}
          </h1>
        </header>
        <DataErrorCard code={resolved.code} reason={resolved.reason} />
      </div>
    );
  }

  if (!plan) return null;

  // Cold start: insufficient data
  if (plan.dataPoints < 10) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
        <Link
          href="/dashboard?source=import"
          className="nav-pill"
          aria-label="Back to dashboard"
        >
          &larr; Dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {t('ui.calendar.needMoreData')}
        </h1>
        <p
          className="max-w-md text-center text-sm leading-6 text-[var(--text-secondary)]"
        >
          {t('ui.calendar.needMoreDataPre')}{' '}
          <strong>{plan.dataPoints}</strong>
          {' '}{t('ui.calendar.needMoreDataPost', { plural: plan.dataPoints === 1 ? '' : t('ui.calendar.posts') })}
        </p>
        <p
          className="max-w-sm text-center text-xs text-[var(--text-subtle)]"
        >
          {t('ui.calendar.importMoreDesc')}
        </p>
        <Link href="/onboarding" className="nav-pill">
          {t('ui.common.import')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <Link
          href="/dashboard?source=import"
          className="nav-pill"
          aria-label="Back to dashboard"
        >
          &larr; Dashboard
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            {t('ui.calendar.title')}
          </h1>
          {resolved?.source === 'real' && resolved.collectedAt && (
            <CollectedAt timestamp={resolved.collectedAt} />
          )}
        </div>
        <p className="text-sm text-[var(--text-subtle)]">
          {t('ui.calendar.subtitle', { dataPoints: plan.dataPoints, slots: plan.slots.length })}
        </p>
      </header>

      <DataSourceBanner source={resolved?.source ?? 'demo'} reason={resolved?.reason} />

      {/* Interactive calendar */}
      <CalendarClient plan={plan} />
    </div>
  );
}
