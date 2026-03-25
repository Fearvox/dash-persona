'use client';

import { useState, useEffect } from 'react';
import { createHistoryStore, profileKey } from '@/lib/history/store';
import {
  type AnalysisSnapshot,
  type AnalysisDelta,
  computeAnalysisDelta,
} from '@/lib/history/analysis-types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AnalysisDeltaBadgeProps {
  /** Current analysis snapshot to compare and save. */
  current: AnalysisSnapshot;
  /** Storage key (platform:uniqueId). */
  storeKey: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Client component that:
 * 1. On mount, loads the last analysis snapshot from IndexedDB
 * 2. Computes the delta with the current analysis
 * 3. Saves the current analysis to IndexedDB
 * 4. Displays score change badge
 */
export default function AnalysisDeltaBadge({
  current,
  storeKey,
}: AnalysisDeltaBadgeProps) {
  const [delta, setDelta] = useState<AnalysisDelta | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;

    async function run() {
      const store = createHistoryStore();

      // Load previous analysis
      const previous = await store.getLastAnalysis(storeKey);

      // Compute delta
      const d = computeAnalysisDelta(current, previous);

      if (!cancelled) {
        setDelta(d);
      }

      // Save current analysis (after reading previous)
      await store.saveAnalysisSnapshot(storeKey, current);
    }

    run();
    return () => { cancelled = true; };
  }, [current, storeKey]);

  if (!delta || !delta.hasPrevious) return null;

  const sign = delta.scoreChange >= 0 ? '+' : '';
  const color = delta.scoreChange > 0
    ? 'var(--accent-green)'
    : delta.scoreChange < 0
      ? 'var(--accent-red)'
      : 'var(--text-subtle)';

  return (
    <span
      className="ml-2 font-mono text-sm font-medium"
      style={{ color }}
      title={`vs ${delta.previousTimestamp ? new Date(delta.previousTimestamp).toLocaleDateString() : 'previous'}`}
    >
      {sign}{delta.scoreChange}
    </span>
  );
}
