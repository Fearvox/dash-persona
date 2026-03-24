import Link from 'next/link';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import type { DemoPersonaType } from '@/lib/adapters/demo-adapter';
import { generateDemoTree, getTreeLanes } from '@/lib/engine';
import TimelineClient from './timeline-client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_PERSONAS = new Set<DemoPersonaType>([
  'tutorial',
  'entertainment',
  'lifestyle',
]);

const PLATFORM_LABELS: Record<string, string> = {
  douyin: 'Douyin',
  tiktok: 'TikTok',
  xhs: 'Red Note',
};

const PLATFORMS = ['douyin', 'tiktok', 'xhs'] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface TimelinePageProps {
  searchParams: Promise<{
    source?: string;
    persona?: string;
    platform?: string;
  }>;
}

export default async function TimelinePage({
  searchParams,
}: TimelinePageProps) {
  const params = await searchParams;
  const personaParam = params.persona ?? 'tutorial';
  const personaType: DemoPersonaType = VALID_PERSONAS.has(
    personaParam as DemoPersonaType,
  )
    ? (personaParam as DemoPersonaType)
    : 'tutorial';

  const platformParam = params.platform ?? 'douyin';
  const platform = PLATFORMS.includes(
    platformParam as (typeof PLATFORMS)[number],
  )
    ? platformParam
    : 'douyin';

  // Load demo profile and generate tree
  const profiles = getDemoProfile(personaType);
  const profile = profiles[platform];
  const tree = generateDemoTree(profile);
  const lanes = getTreeLanes(tree);

  // Build search params for platform tabs
  function platformHref(p: string) {
    const sp = new URLSearchParams();
    if (params.source) sp.set('source', params.source);
    sp.set('persona', personaType);
    sp.set('platform', p);
    return `/timeline?${sp.toString()}`;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
      {/* Header */}
      <header className="flex flex-col gap-4">
        <Link
          href={`/dashboard?source=${params.source ?? 'demo'}&persona=${personaType}`}
          className="text-sm font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--accent-green)' }}
          aria-label="Back to dashboard"
        >
          &larr; Dashboard
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl">
              Persona Timeline
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: 'var(--text-subtle)' }}
            >
              Content strategy experiments as a decision tree
            </p>
          </div>

          {/* Platform selector tabs */}
          <div
            className="flex rounded-lg p-1"
            style={{ background: 'var(--bg-secondary)' }}
            role="tablist"
          >
            {PLATFORMS.map((p) => {
              const isActive = p === platform;
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
                  {PLATFORM_LABELS[p]}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Summary stats */}
      <section className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="card p-4">
          <p className="kicker">Total Nodes</p>
          <p
            className="metric-value mt-1 text-xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            {tree.nodes.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="kicker">Mainline</p>
          <p
            className="metric-value mt-1 text-xl font-bold"
            style={{ color: 'var(--accent-green)' }}
          >
            {lanes.mainline.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="kicker">Branches</p>
          <p
            className="metric-value mt-1 text-xl font-bold"
            style={{ color: 'var(--accent-yellow)' }}
          >
            {lanes.branches.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="kicker">Boundaries</p>
          <p
            className="metric-value mt-1 text-xl font-bold"
            style={{ color: 'var(--accent-red)' }}
          >
            {lanes.boundaries.length}
          </p>
        </div>
      </section>

      {/* Tree visualization (interactive client component) */}
      <TimelineClient nodes={tree.nodes} lanes={lanes} />
    </div>
  );
}
