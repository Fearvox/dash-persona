'use client';

import { useState, useCallback } from 'react';
import type { Post } from '@/lib/schema/creator-data';
import type { CreatorProfile } from '@/lib/schema/creator-data';
import type { PersonaScore, SparklinePoint } from '@/lib/engine';
import type { ScoreExplanation } from '@/lib/engine/explain';
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
}: DashboardInteractiveProps) {
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

  return (
    <>
      {/* Growth sparklines section */}
      <GrowthSparklines
        profiles={profiles}
        onChartClick={handleChartClick}
      />

      {/* Persona overview section - rendered separately so dashboard can
          place section headers around them */}
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
