'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import type { Post } from '@/lib/schema/creator-data';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import type { PersonaScore, SparklinePoint, BenchmarkResult } from '@/lib/engine';
import type { ScoreExplanation } from '@/lib/engine/explain';
import type { AnalysisSnapshot } from '@/lib/history/analysis-types';
import BenchmarkCard from './benchmark-card';
import { useProfileHistory } from '@/lib/history';
import { useAnalysisDelta } from '@/lib/history/use-analysis-delta';
import PersonaOverview from './persona-overview';
import GrowthSparklines from './growth-sparklines';
import PostDrawer from './post-drawer';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DashboardInteractiveProps {
  profiles: Record<string, CreatorProfile>;
  personaScores: Record<string, PersonaScore>;
  explanations: Record<string, Record<string, ScoreExplanation>>;
  allPosts: Post[];
  source: string;
  personaType: string;
  benchmarkResult?: BenchmarkResult & { niche: string; nicheLabel: string };
  /** Analysis snapshot for delta computation. */
  analysisSnapshot?: AnalysisSnapshot;
  /** Store key for analysis delta lookup. */
  analysisStoreKey?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Client-side wrapper that manages PostDrawer state shared across
 * PersonaOverview and GrowthSparklines. Used by the server-rendered
 * dashboard page to add interactivity.
 */
export default function DashboardInteractive({
  profiles,
  personaScores,
  explanations,
  allPosts,
  source,
  personaType,
  benchmarkResult,
  analysisSnapshot,
  analysisStoreKey,
}: DashboardInteractiveProps) {
  const { enrichedProfiles, isLoading: historyLoading, collectNow } = useProfileHistory(profiles);
  const analysisDelta = useAnalysisDelta(analysisStoreKey ?? null, analysisSnapshot ?? null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('Posts');
  const [drawerFilterIds, setDrawerFilterIds] = useState<string[] | undefined>(
    undefined,
  );

  const openDrawerWithIds = useCallback((postIds: string[]) => {
    setDrawerFilterIds(postIds);
    setDrawerTitle(`Related Posts (${postIds.length})`);
    setDrawerOpen(true);
  }, []);

  const handleChartClick = useCallback(
    (_platformKey: string, _point: SparklinePoint) => {
      // Open drawer with all posts (no filter) when clicking a chart point
      setDrawerFilterIds(undefined);
      setDrawerTitle('Posts');
      setDrawerOpen(true);
    },
    [],
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const openAllPosts = useCallback(() => {
    setDrawerFilterIds(undefined);
    setDrawerTitle(`Posts (${allPosts.length})`);
    setDrawerOpen(true);
  }, [allPosts.length]);

  return (
    <>
      {/* Browse Posts button + Collect Now */}
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={openAllPosts}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors"
          style={{
            background: 'rgba(126, 210, 154, 0.1)',
            color: 'var(--accent-green)',
            border: '1px solid rgba(126, 210, 154, 0.2)',
          }}
        >
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16v16H4z" /><path d="M4 10h16" /><path d="M10 4v16" />
          </svg>
          Browse All Posts ({allPosts.length})
        </button>
        <button
          type="button"
          className="nav-pill"
          onClick={collectNow}
          disabled={historyLoading}
          style={{ color: 'var(--accent-blue)', opacity: historyLoading ? 0.5 : 1 }}
        >
          {historyLoading ? 'Collecting...' : 'Collect Now'}
        </button>
      </div>

      {/* Growth sparklines section */}
      <GrowthSparklines
        profiles={enrichedProfiles}
        onChartClick={handleChartClick}
      />

      {/* Benchmark comparison */}
      {benchmarkResult && (
        <BenchmarkCard benchmarkResult={benchmarkResult} />
      )}

      {/* Persona Score heading */}
      <div className="mb-3 mt-10 flex items-center justify-between">
        <h2 id="persona-heading" className="kicker">
          Persona Score
        </h2>
        <Link
          href={`/persona?source=${source}&persona=${personaType}`}
          className="nav-pill"
        >
          View details &rarr;
        </Link>
      </div>

      {/* Persona overview section */}
      <PersonaOverview
        scores={personaScores}
        explanations={explanations}
        onViewPosts={openDrawerWithIds}
      />

      {/* Shared post drawer */}
      <PostDrawer
        posts={allPosts}
        isOpen={drawerOpen}
        onClose={closeDrawer}
        title={drawerTitle}
        filterPostIds={drawerFilterIds}
      />
    </>
  );
}
