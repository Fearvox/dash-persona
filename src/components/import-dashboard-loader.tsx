'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

  useEffect(() => {
    if (!profiles) return;
    runAllEngines(profiles).then(setEngineResults);
  }, [profiles]);

  if (!profiles) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
        <p className="text-sm text-[var(--text-secondary)]">Loading imported data...</p>
      </div>
    );
  }

  if (!engineResults) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-6 py-20">
        <p className="text-sm text-[var(--text-secondary)]">Running analysis engines...</p>
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
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--accent-green)' }}
            aria-label="Back to home"
          >
            &larr;
          </Link>
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">Dashboard</h1>
          <span className="badge badge-green">Import</span>
        </div>
        <Link href="/onboarding" className="nav-pill">
          Import more
        </Link>
      </header>

      {/* Data enrichment prompt */}
      <div className="animate-stagger animate-stagger-0 rounded-lg border border-[rgba(210,200,126,0.15)] bg-[rgba(210,200,126,0.04)] px-4 py-2.5 flex items-start gap-3">
        <span className="mt-0.5 text-[var(--accent-yellow)] text-xs shrink-0">Tip</span>
        <p className="text-xs text-[var(--text-subtle)] leading-relaxed">
          Want more accurate analysis? Export data from your Creator Center (account metrics, post lists)
          and click <strong className="text-[var(--text-secondary)]">Import more</strong> to add them.
          The more data you provide, the better the persona insights.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="animate-stagger animate-stagger-1">
            <ForYouCard profiles={profiles} />
          </section>

          <section className="animate-stagger animate-stagger-2" aria-labelledby="growth-heading">
            <h2 id="growth-heading" className="kicker mb-3">Growth Overview</h2>
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
            <h2 id="platforms-heading" className="kicker mb-3">Cross-Platform Comparison</h2>
            <PlatformComparison comparison={comparison} />
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="animate-stagger animate-stagger-1">
            <NicheDetectCard result={nicheResult} />
          </section>

          <section className="animate-stagger animate-stagger-2" aria-labelledby="strategy-heading">
            <h2 id="strategy-heading" className="kicker mb-3">Strategy Suggestions</h2>
            <StrategySuggestions suggestions={suggestions} />
          </section>
        </aside>
      </div>
    </div>
  );
}
