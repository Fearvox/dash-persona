'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import type { PersonaTree } from '@/lib/schema/persona-tree';
import type { PersonaTreeNode } from '@/lib/schema/persona-tree';
import { generateDemoTree, getTreeLanes, generateExperimentIdeas, type ExperimentIdea } from '@/lib/engine';
import { resolveProfiles, type ResolvedProfiles } from '@/lib/store/profile-store';
import { CollectedAt } from '@/components/ui/collected-at';
import { DataSourceBanner } from '@/components/ui/data-source-banner';
import { DataErrorCard } from '@/components/ui/data-error-card';
import { PLATFORM_LABELS } from '@/lib/utils/constants';
import { profileKey } from '@/lib/history/store';
import TimelineClient from './timeline-client';
import GrowthTrendChart from '@/components/growth-trend-chart';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TreeLanes {
  mainline: PersonaTreeNode[];
  branches: PersonaTreeNode[];
  boundaries: PersonaTreeNode[];
}

interface LoadedData {
  tree: PersonaTree;
  lanes: TreeLanes;
  ideas: ExperimentIdea[];
  storeKeys: string[];
  platform: string;
  platforms: string[];
}

interface ImportTimelineLoaderProps {
  platform?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportTimelineLoader({ platform }: ImportTimelineLoaderProps) {
  const router = useRouter();
  const [resolved, setResolved] = useState<ResolvedProfiles | null>(null);
  const [data, setData] = useState<LoadedData | null>(null);
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
      const resolvedPlatform =
        platform && availablePlatforms.includes(platform)
          ? platform
          : availablePlatforms[0];

      const profile = profiles[resolvedPlatform];
      const tree = generateDemoTree(profile);
      const lanes = getTreeLanes(tree);
      const ideas = generateExperimentIdeas(profiles, tree);
      const storeKeys = [profileKey(resolvedPlatform, profile.profile.uniqueId)];

      if (!cancelled) {
        setData({
          tree,
          lanes,
          ideas,
          storeKeys,
          platform: resolvedPlatform,
          platforms: availablePlatforms,
        });
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
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
        <header className="flex flex-col gap-2">
          <Link href="/dashboard?source=import" className="nav-pill" aria-label="Back to dashboard">
            &larr; Dashboard
          </Link>
          <h1 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
            {t('ui.timeline.title')}
          </h1>
        </header>
        <DataErrorCard code={resolved.code} reason={resolved.reason} />
      </div>
    );
  }

  if (!data) return null;

  const { tree, lanes, ideas, storeKeys, platforms } = data;
  const activePlatform = data.platform;

  function platformHref(p: string) {
    const sp = new URLSearchParams();
    sp.set('source', 'import');
    sp.set('platform', p);
    return `/timeline?${sp.toString()}`;
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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
                {t('ui.timeline.title')}
              </h1>
              {resolved?.source === 'real' && resolved.collectedAt && (
                <CollectedAt timestamp={resolved.collectedAt} />
              )}
            </div>
            <p
              className="mt-1 text-sm text-[var(--text-subtle)]"
            >
              {t('ui.timeline.subtitle')}
            </p>
          </div>

          {/* Platform selector tabs */}
          <div
            className="flex rounded-lg p-1 bg-[var(--bg-secondary)]"
            role="tablist"
          >
            {platforms.map((p) => {
              const isActive = p === activePlatform;
              return (
                <Link
                  key={p}
                  href={platformHref(p)}
                  role="tab"
                  aria-selected={isActive}
                  className="rounded-md px-4 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    background: isActive ? 'var(--bg-card)' : 'transparent',
                    color: isActive
                      ? 'var(--text-primary)'
                      : 'var(--text-subtle)',
                    border: isActive
                      ? '1px solid var(--border-subtle)'
                      : '1px solid transparent',
                  }}
                >
                  {PLATFORM_LABELS[p] ?? p}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <DataSourceBanner source={resolved?.source ?? 'demo'} reason={resolved?.reason} />

      {/* Summary stats */}
      <section className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="card p-4">
          <p className="kicker">{t('ui.timeline.totalNodes')}</p>
          <p
            className="metric-value mt-1 text-xl font-bold text-[var(--text-primary)]"
          >
            {tree.nodes.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="kicker">{t('ui.timeline.mainline')}</p>
          <p
            className="metric-value mt-1 text-xl font-bold text-[var(--accent-green)]"
          >
            {lanes.mainline.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="kicker">{t('ui.timeline.branches')}</p>
          <p
            className="metric-value mt-1 text-xl font-bold text-[var(--accent-yellow)]"
          >
            {lanes.branches.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="kicker">{t('ui.timeline.boundaries')}</p>
          <p
            className="metric-value mt-1 text-xl font-bold text-[var(--accent-red)]"
          >
            {lanes.boundaries.length}
          </p>
        </div>
      </section>

      {/* Growth History */}
      <section aria-labelledby="growth-history-heading">
        <h2 id="growth-history-heading" className="kicker mb-3">
          {t('ui.timeline.growthHistory')}
        </h2>
        <GrowthTrendChart storeKeys={storeKeys} />
      </section>

      {/* Tree visualization (interactive client component) */}
      <TimelineClient
        key={activePlatform}
        nodes={tree.nodes}
        lanes={lanes}
        ideas={ideas}
        platform={activePlatform}
      />
    </div>
  );
}
