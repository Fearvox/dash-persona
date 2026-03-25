'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CreatorProfile } from '../schema/creator-data';
import { createHistoryStore } from './store';
import { extractSnapshot, mergeHistory, profileKeyFromProfile } from './snapshot';

export function useProfileHistory(profiles: Record<string, CreatorProfile>): {
  enrichedProfiles: Record<string, CreatorProfile>;
  isLoading: boolean;
  collectNow: () => Promise<void>;
} {
  const [enrichedProfiles, setEnrichedProfiles] = useState(profiles);
  const [isLoading, setIsLoading] = useState(true);

  // Load + save + merge on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAndMerge() {
      const store = createHistoryStore();
      const result: Record<string, CreatorProfile> = {};

      for (const [platform, profile] of Object.entries(profiles)) {
        const key = profileKeyFromProfile(profile);

        // Save current snapshot
        const snapshot = extractSnapshot(profile);
        await store.saveSnapshot(key, snapshot);

        // Load all saved snapshots
        const savedSnapshots = await store.getSnapshots(key);

        // Merge into profile history
        const merged = mergeHistory(profile.history ?? [], savedSnapshots);
        result[platform] = { ...profile, history: merged };
      }

      if (!cancelled) {
        setEnrichedProfiles(result);
        setIsLoading(false);
      }
    }

    loadAndMerge();
    return () => {
      cancelled = true;
    };
  }, []); // profiles is server-rendered, stable on mount

  const collectNow = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setIsLoading(true);

    const store = createHistoryStore();
    const result: Record<string, CreatorProfile> = {};

    for (const [platform, profile] of Object.entries(profiles)) {
      const key = profileKeyFromProfile(profile);
      const snapshot = extractSnapshot(profile);
      await store.saveSnapshot(key, snapshot);
      const savedSnapshots = await store.getSnapshots(key);
      const merged = mergeHistory(profile.history ?? [], savedSnapshots);
      result[platform] = { ...profile, history: merged };
    }

    setEnrichedProfiles(result);
    setIsLoading(false);
  }, [profiles]);

  return { enrichedProfiles, isLoading, collectNow };
}
