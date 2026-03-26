/**
 * Growth delta calculator for the DashPersona engine.
 *
 * Adapted from wyz-report-web's `growth-utils.ts` with key improvements:
 *  - Accepts the universal {@link CreatorProfile} type (not PlatformMetricsFile).
 *  - Timezone is configurable via `utcOffset` (hours) instead of hardcoded CST.
 *  - Works with `CreatorProfile.history` ({@link HistorySnapshot}[]) directly.
 *
 * All functions are pure and side-effect-free.
 *
 * @module engine/growth
 */

import type { CreatorProfile, HistorySnapshot } from '../schema/creator-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Delta between two numeric metric values. */
export interface MetricDelta {
  /** Most-recent value. */
  current: number;
  /** Baseline value used for comparison. */
  baseline: number;
  /** Absolute change (current - baseline). */
  delta: number;
  /** Percentage change relative to baseline. 0 when baseline is 0. */
  pct: number;
}

/** Full growth delta between two time-points for a single creator profile. */
export interface GrowthDelta {
  followers: MetricDelta;
  likesTotal: MetricDelta;
  videosCount: MetricDelta;
  totalViews: MetricDelta;
  /** ISO-8601 timestamp of the baseline snapshot. */
  baselineAt: string;
  /** ISO-8601 timestamp of the latest data. */
  latestAt: string;
}

/** Cross-platform aggregation of growth deltas. */
export interface AggregatedGrowth {
  platforms: Record<string, GrowthDelta | null>;
  totalFollowersDelta: number;
  totalViewsDelta: number;
  totalLikesDelta: number;
}

/** Single sparkline data point. */
export interface SparklinePoint {
  /** Human-readable time label (HH:mm). */
  time: string;
  /** Follower count at this point. */
  followers: number;
  /** Cumulative views at this point. */
  views: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Sum the `views` field across an array of posts.
 * Tolerates missing/undefined items and values.
 */
export function sumViews(items?: Array<{ views?: number }> | null): number {
  if (!items) return 0;
  return items.reduce((sum, i) => sum + (i.views ?? 0), 0);
}

/**
 * Build a {@link MetricDelta} from current and baseline values.
 *
 * When baseline is 0, percentage is reported as 0 to avoid Infinity.
 */
export function makeDelta(current: number, baseline: number): MetricDelta {
  const delta = current - baseline;
  const pct = baseline > 0 ? (delta / baseline) * 100 : 0;
  return { current, baseline, delta, pct };
}

// ---------------------------------------------------------------------------
// findBaselineEntry
// ---------------------------------------------------------------------------

/**
 * Find the history snapshot nearest to `targetHour` on today's date in the
 * specified timezone.
 *
 * Resolution strategy:
 *  1. Collect all entries whose date-part matches "today" in the target tz.
 *  2. Among those, pick the entry closest to `targetHour`.
 *  3. If no entries exist for today, fall back to the oldest available entry.
 *
 * @param history   Chronological snapshot array (oldest first).
 * @param targetHour  Hour of day (0-23) to anchor the baseline to (default 9).
 * @param utcOffset   Timezone offset in hours from UTC (default +8 = CST).
 */
export function findBaselineEntry(
  history: HistorySnapshot[] | undefined,
  targetHour = 9,
  utcOffset = 8,
): HistorySnapshot | null {
  if (!history || history.length === 0) return null;

  const offsetMs = utcOffset * 3_600_000;

  const now = new Date();
  const todayLocal = new Date(now.getTime() + offsetMs);
  const todayDateStr = todayLocal.toISOString().slice(0, 10);

  // Entries from today in the target timezone
  const todayEntries = history.filter((e) => {
    const ts = new Date(e.fetchedAt).getTime();
    if (isNaN(ts)) return false; // skip entries with invalid dates
    const entryLocal = new Date(ts + offsetMs);
    return entryLocal.toISOString().slice(0, 10) === todayDateStr;
  });

  if (todayEntries.length === 0) {
    // No today entries — single-pass min to find oldest (O(n) vs O(n log n) sort)
    let oldest = history[0];
    let oldestTime = new Date(oldest.fetchedAt).getTime() || Infinity;
    for (let i = 1; i < history.length; i++) {
      const t = new Date(history[i].fetchedAt).getTime();
      if (isNaN(t)) continue; // skip invalid dates
      if (t < oldestTime) {
        oldest = history[i];
        oldestTime = t;
      }
    }
    return oldest;
  }

  // Among today's entries, find the one closest to targetHour
  let best = todayEntries[0];
  let bestDiff = Infinity;
  for (const entry of todayEntries) {
    const entryLocal = new Date(new Date(entry.fetchedAt).getTime() + offsetMs);
    const hourDiff = Math.abs(entryLocal.getUTCHours() - targetHour);
    if (hourDiff < bestDiff) {
      bestDiff = hourDiff;
      best = entry;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// computeGrowthDelta
// ---------------------------------------------------------------------------

/**
 * Compute the growth delta between a baseline snapshot and the latest
 * profile state.
 *
 * The baseline defaults to the snapshot nearest to 09:00 in the target
 * timezone. When the baseline and latest timestamps are identical it
 * attempts to find an older entry to compare against.
 *
 * @param profile          The creator profile to analyse.
 * @param baselineHour     Hour of day for baseline anchor (default 9).
 * @param utcOffset        Timezone offset in hours from UTC (default +8).
 * @returns `null` when there is insufficient data to compute a delta.
 */
export function computeGrowthDelta(
  profile: CreatorProfile,
  baselineHour = 9,
  utcOffset = 8,
): GrowthDelta | null {
  const latestProfile = profile.profile;
  if (!latestProfile) return null;

  const baseline = findBaselineEntry(profile.history, baselineHour, utcOffset);
  if (!baseline) return null;

  const latestViews = sumViews(profile.posts);

  // When the only history entry matches fetchedAt, try to find an older one
  if (baseline.fetchedAt === profile.fetchedAt) {
    const older = (profile.history ?? []).filter(
      (e) => e.fetchedAt !== profile.fetchedAt,
    );
    if (older.length === 0) return null;
    const oldestFirst = [...older].sort(
      (a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime(),
    );
    const fallback = oldestFirst[0];

    return {
      followers: makeDelta(latestProfile.followers, fallback.profile.followers),
      likesTotal: makeDelta(latestProfile.likesTotal, fallback.profile.likesTotal),
      videosCount: makeDelta(latestProfile.videosCount, fallback.profile.videosCount),
      totalViews: makeDelta(latestViews, 0), // historical views not available per-post
      baselineAt: fallback.fetchedAt,
      latestAt: profile.fetchedAt,
    };
  }

  return {
    followers: makeDelta(latestProfile.followers, baseline.profile.followers),
    likesTotal: makeDelta(latestProfile.likesTotal, baseline.profile.likesTotal),
    videosCount: makeDelta(latestProfile.videosCount, baseline.profile.videosCount),
    totalViews: makeDelta(latestViews, 0),
    baselineAt: baseline.fetchedAt,
    latestAt: profile.fetchedAt,
  };
}

// ---------------------------------------------------------------------------
// aggregateGrowth
// ---------------------------------------------------------------------------

/**
 * Aggregate growth deltas across multiple creator profiles (one per
 * platform).
 *
 * @param profiles  Map of platform name to {@link CreatorProfile}.
 */
export function aggregateGrowth(
  profiles: Record<string, CreatorProfile>,
): AggregatedGrowth {
  const platforms: Record<string, GrowthDelta | null> = {};
  let totalFollowersDelta = 0;
  let totalViewsDelta = 0;
  let totalLikesDelta = 0;

  for (const [name, profile] of Object.entries(profiles)) {
    const delta = computeGrowthDelta(profile);
    platforms[name] = delta;
    if (delta) {
      totalFollowersDelta += delta.followers.delta;
      totalViewsDelta += delta.totalViews.delta;
      totalLikesDelta += delta.likesTotal.delta;
    }
  }

  return { platforms, totalFollowersDelta, totalViewsDelta, totalLikesDelta };
}

// ---------------------------------------------------------------------------
// extractSparklineData
// ---------------------------------------------------------------------------

/**
 * Extract sparkline-ready data points from a creator profile's history.
 *
 * Returns deduplicated, chronologically sorted points covering the last
 * `hoursBack` hours. Each point contains a human-readable time label,
 * follower count, and a view count (derived from the current posts array
 * for the latest point, 0 for historical points where per-post views are
 * unavailable).
 *
 * @param profile    The creator profile.
 * @param hoursBack  Look-back window in hours (default 24).
 */
export function extractSparklineData(
  profile: CreatorProfile,
  hoursBack = 24,
): SparklinePoint[] {
  const cutoff = Date.now() - hoursBack * 3_600_000;

  // Merge history snapshots + current state into a unified list
  const entries: Array<{
    fetchedAt: string;
    followers: number;
    views: number;
  }> = [];

  for (const snap of profile.history ?? []) {
    entries.push({
      fetchedAt: snap.fetchedAt,
      followers: snap.profile.followers,
      views: 0, // per-post views not stored in snapshots
    });
  }

  // Add current state as the latest data point
  entries.push({
    fetchedAt: profile.fetchedAt,
    followers: profile.profile.followers,
    views: sumViews(profile.posts),
  });

  // Filter, sort, and deduplicate
  const seen = new Set<string>();
  return entries
    .filter((e) => new Date(e.fetchedAt).getTime() >= cutoff)
    .sort(
      (a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime(),
    )
    .filter((e) => {
      if (seen.has(e.fetchedAt)) return false;
      seen.add(e.fetchedAt);
      return true;
    })
    .map((e) => ({
      time: new Date(e.fetchedAt).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      followers: e.followers,
      views: e.views,
    }));
}

// ---------------------------------------------------------------------------
// Formatting utilities
// ---------------------------------------------------------------------------

/**
 * Format a numeric delta for display with sign and SI suffix.
 *
 * @example
 * ```ts
 * formatDelta(12345)  // "+12.3k"
 * formatDelta(-34)    // "-34"
 * formatDelta(0)      // "0"
 * ```
 */
export function formatDelta(value: number): string {
  if (value === 0) return '0';
  const sign = value > 0 ? '+' : '';
  if (Math.abs(value) >= 1_000) return `${sign}${(value / 1_000).toFixed(1)}k`;
  return `${sign}${value}`;
}

/**
 * Format a number for human-readable display with SI suffix.
 *
 * @example
 * ```ts
 * formatNumber(98765)  // "98.8k"
 * formatNumber(123)    // "123"
 * ```
 */
export function formatNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString();
}
