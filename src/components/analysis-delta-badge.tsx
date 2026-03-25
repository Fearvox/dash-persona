'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { createHistoryStore } from '@/lib/history/store';
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
  /** Optional render prop for exposing full delta to children. */
  children?: (delta: AnalysisDelta | null) => ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Client component that:
 * 1. On mount, loads the last analysis snapshot from IndexedDB
 * 2. Computes the delta with the current analysis
 * 3. Saves the current analysis to IndexedDB
 * 4. Displays score change badge + optional children via render prop
 */
export default function AnalysisDeltaBadge({
  current,
  storeKey,
  children,
}: AnalysisDeltaBadgeProps) {
  const [delta, setDelta] = useState<AnalysisDelta | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;

    async function run() {
      const store = createHistoryStore();
      const previous = await store.getLastAnalysis(storeKey);
      const d = computeAnalysisDelta(current, previous);

      if (!cancelled) {
        setDelta(d);
      }

      await store.saveAnalysisSnapshot(storeKey, current);
    }

    run();
    return () => { cancelled = true; };
  }, [current, storeKey]);

  return (
    <>
      {/* Inline score badge (only if has previous) */}
      {delta?.hasPrevious && (
        <span
          className="ml-2 font-mono text-sm font-medium"
          style={{
            color: delta.scoreChange > 0
              ? 'var(--accent-green)'
              : delta.scoreChange < 0
                ? 'var(--accent-red)'
                : 'var(--text-subtle)',
          }}
          title={`vs ${delta.previousTimestamp ? new Date(delta.previousTimestamp).toLocaleDateString() : 'previous'}`}
        >
          {delta.scoreChange >= 0 ? '+' : ''}{delta.scoreChange}
        </span>
      )}
      {/* Render prop for children that need the delta */}
      {children?.(delta)}
    </>
  );
}

// Re-export delta type for consumers
export type { AnalysisDelta };
