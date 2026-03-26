'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import { generateContentPlan, type ContentPlan } from '@/lib/engine';
import { loadProfiles } from '@/lib/store/profile-store';
import CalendarClient from './calendar-client';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportCalendarLoader() {
  const router = useRouter();
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // loadProfiles() handles sessionStorage-first + IndexedDB fallback
      let profiles: Record<string, CreatorProfile> | null = null;
      try {
        const loaded = await loadProfiles();
        if (loaded && Object.keys(loaded).length > 0) {
          profiles = loaded;
        }
      } catch {
        // storage unavailable
      }

      if (cancelled) return;

      // No data — redirect to onboarding
      if (!profiles || Object.keys(profiles).length === 0) {
        router.replace('/onboarding');
        return;
      }

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
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('ui.common.loadingImported')}
        </p>
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
          className="max-w-md text-center text-sm leading-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('ui.calendar.needMoreDataPre')}{' '}
          <strong>{plan.dataPoints}</strong>
          {' '}{t('ui.calendar.needMoreDataPost', { plural: plan.dataPoints === 1 ? '' : t('ui.calendar.posts') })}
        </p>
        <p
          className="max-w-sm text-center text-xs"
          style={{ color: 'var(--text-subtle)' }}
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
        <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
          {t('ui.calendar.title')}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-subtle)' }}>
          {t('ui.calendar.subtitle', { dataPoints: plan.dataPoints, slots: plan.slots.length })}
        </p>
      </header>

      {/* Interactive calendar */}
      <CalendarClient plan={plan} />
    </div>
  );
}
