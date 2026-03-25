'use client';

import { useState, useEffect } from 'react';
import { createHistoryStore } from './store';
import { type AnalysisSnapshot, type AnalysisDelta, computeAnalysisDelta } from './analysis-types';

/**
 * Hook that loads the previous analysis from IndexedDB and computes delta.
 * Does NOT save the current snapshot (that's AnalysisDeltaBadge's job).
 */
export function useAnalysisDelta(
  storeKey: string | null,
  current: AnalysisSnapshot | null,
): AnalysisDelta | null {
  const [delta, setDelta] = useState<AnalysisDelta | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !storeKey || !current) return;

    let cancelled = false;

    async function run() {
      const store = createHistoryStore();
      const previous = await store.getLastAnalysis(storeKey!);
      const d = computeAnalysisDelta(current!, previous);
      if (!cancelled) setDelta(d);
    }

    run();
    return () => { cancelled = true; };
  }, [storeKey, current]);

  return delta;
}
