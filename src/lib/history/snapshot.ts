/**
 * Helpers for extracting HistorySnapshot values from a CreatorProfile and
 * merging snapshot arrays from multiple sources.
 *
 * @module history/snapshot
 */

import type { CreatorProfile, HistorySnapshot } from '../schema/creator-data';
import { profileKey, MAX_SNAPSHOTS } from './store';

/**
 * Extract a lightweight HistorySnapshot from the current state of a profile.
 */
export function extractSnapshot(profile: CreatorProfile): HistorySnapshot {
  // Compute followerGrowthRate by comparing to the most recent prior snapshot
  const history = profile.history;
  const priorFollowers =
    history && history.length > 0 ? history[history.length - 1].profile.followers : null;
  const followerGrowthRate =
    priorFollowers !== null && priorFollowers > 0
      ? ((profile.profile.followers - priorFollowers) / priorFollowers) * 100
      : 0;

  return {
    fetchedAt: profile.fetchedAt,
    profile: {
      followers: profile.profile.followers,
      likesTotal: profile.profile.likesTotal,
      videosCount: profile.profile.videosCount,
    },
    followerGrowthRate: Math.round(followerGrowthRate * 10) / 10,
  };
}

/**
 * Merge two snapshot arrays, deduplicating by `fetchedAt`, sorting
 * oldest-first, and trimming to MAX_SNAPSHOTS.
 */
export function mergeHistory(
  existing: HistorySnapshot[],
  incoming: HistorySnapshot[],
): HistorySnapshot[] {
  const seen = new Set<string>();
  const merged: HistorySnapshot[] = [];

  for (const s of [...existing, ...incoming]) {
    if (!seen.has(s.fetchedAt)) {
      seen.add(s.fetchedAt);
      merged.push(s);
    }
  }

  merged.sort(
    (a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime(),
  );

  return merged.length > MAX_SNAPSHOTS
    ? merged.slice(merged.length - MAX_SNAPSHOTS)
    : merged;
}

/**
 * Derive the storage key for a profile using its platform and uniqueId.
 */
export function profileKeyFromProfile(profile: CreatorProfile): string {
  return profileKey(profile.platform, profile.profile.uniqueId);
}
