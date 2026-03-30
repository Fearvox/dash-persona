'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import { loadProfiles } from '@/lib/store/profile-store';
import { runAllEngines, type AllEngineResults } from '@/lib/engine';
import DashboardInteractive from '@/components/dashboard-interactive';
import PlatformComparison from '@/components/platform-comparison';
import StrategySuggestions from '@/components/strategy-suggestions';
import ForYouCard from '@/components/for-you-card';
import NicheDetectCard from '@/components/niche-detect-card';
import Link from 'next/link';

export default function ImportDashboardLoader() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Record<string, CreatorProfile> | null>(null);

  useEffect(() => {
    // Try sessionStorage first (fast, sync)
    const raw = sessionStorage.getItem('dashpersona-import-profiles');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, CreatorProfile>;
        for (const p of Object.values(parsed)) {
          if (!p.profileUrl) p.profileUrl = 'https://creator.douyin.com';
        }
        setProfiles(parsed);
        return;
      } catch { /* fall through to IndexedDB */ }
    }

    // Fallback: load from IndexedDB (persists across sessions)
    loadProfiles().then((stored) => {
      if (Object.keys(stored).length > 0) {
        for (const p of Object.values(stored)) {
          if (!p.profileUrl) p.profileUrl = 'https://creator.douyin.com';
        }
        sessionStorage.setItem('dashpersona-import-profiles', JSON.stringify(stored));
        setProfiles(stored);
      } else {
        router.replace('/onboarding');
      }
    }).catch(() => {
      router.replace('/onboarding');
    });
  }, [router]);

  // All hooks must be called unconditionally (Rules of Hooks)
  const [engineResults, setEngineResults] = useState<AllEngineResults | null>(null);
  const [shimmerDone, setShimmerDone] = useState(false);

  useEffect(() => {
    if (!profiles) return;
    // Run engines + enforce 2s minimum shimmer in parallel
    Promise.all([
      runAllEngines(profiles),
      new Promise<void>((resolve) => setTimeout(resolve, 2000)),
    ]).then(([results]) => {
      setEngineResults(results);
      setShimmerDone(true);
    });
  }, [profiles]);

  if (!profiles || !engineResults || !shimmerDone) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-primary)]"
        aria-busy="true"
        aria-label="Analyzing data"
      >
        <p className="analyzing-enter-0 mb-6 font-mono text-sm tracking-widest text-[var(--text-primary)]">
          Analyzing...
        </p>
        <div className="analyzing-enter-1 analyzing-shimmer-bar h-[3px] w-48 bg-[rgba(126,210,154,0.1)]" />
        <p className="analyzing-enter-2 mt-4 font-mono text-xs text-[var(--text-subtle)]">
          Processing signals
        </p>
      </div>
    );
  }

  const { personaScores, explanations, comparison, suggestions, benchmarkResult, nicheResult, allPosts } = engineResults;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="animate-stagger animate-stagger-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-medium transition-colors hover:opacity-80 text-[var(--accent-green)]"
            aria-label="Back to home"
          >
            &larr;
          </Link>
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">{t('ui.dashboard.title')}</h1>
          <span className="badge badge-green">{t('ui.common.import')}</span>
        </div>
        <Link href="/onboarding" className="nav-pill">
          {t('ui.common.importMore')}
        </Link>
      </header>

      {/* Data enrichment prompt */}
      <div className="animate-stagger animate-stagger-0 rounded-lg border border-[rgba(210,200,126,0.15)] bg-[rgba(210,200,126,0.04)] px-4 py-2.5 flex items-start gap-3">
        <span className="mt-0.5 text-[var(--accent-yellow)] text-xs shrink-0">{t('ui.common.tip')}</span>
        <p className="text-xs text-[var(--text-subtle)] leading-relaxed">
          {t('ui.dashboard.enrichmentTipPre')}<strong className="text-[var(--text-secondary)]">{t('ui.common.importMore')}</strong>{t('ui.dashboard.enrichmentTipPost')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="animate-stagger animate-stagger-1">
            <ForYouCard profiles={profiles} />
          </section>

          <section className="animate-stagger animate-stagger-2" aria-labelledby="growth-heading">
            <h2 id="growth-heading" className="kicker mb-3">{t('ui.dashboard.growthOverview')}</h2>
            <DashboardInteractive
              profiles={profiles}
              personaScores={personaScores}
              explanations={explanations}
              allPosts={allPosts}
              source="import"
              personaType="tutorial"
              benchmarkResult={benchmarkResult}
            />
          </section>

          <section className="animate-stagger animate-stagger-3" aria-labelledby="platforms-heading">
            <h2 id="platforms-heading" className="kicker mb-3">{t('ui.dashboard.crossPlatformComparison')}</h2>
            <PlatformComparison comparison={comparison} />
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="animate-stagger animate-stagger-1">
            <NicheDetectCard result={nicheResult} />
          </section>

          <section className="animate-stagger animate-stagger-2" aria-labelledby="strategy-heading">
            <h2 id="strategy-heading" className="kicker mb-3">{t('ui.dashboard.strategySuggestions')}</h2>
            <StrategySuggestions suggestions={suggestions} />
          </section>
        </aside>
      </div>
    </div>
  );
}
