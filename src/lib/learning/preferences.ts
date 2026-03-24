/**
 * Derive user preferences from the learning event history.
 *
 * Uses exponential decay with a 7-day half-life so recent interactions
 * weigh more heavily than stale ones.
 *
 * @module learning/preferences
 */

import { createLearningStore, type TrackingEvent } from './store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserPreferences {
  /** Most-viewed sections, ranked by weighted interaction count. */
  topSections: string[];

  /** Most-selected time range in hours (default: 168 = 7 days). */
  preferredTimeRange: number;

  /** Platform with the most click interactions, or null. */
  focusPlatform: string | null;

  /** Content types the user frequently dismisses. */
  dismissedContentTypes: string[];

  /** Total raw event count. */
  interactionCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HALF_LIFE_DAYS = 7;
const LN2 = Math.LN2;
const MS_PER_DAY = 86_400_000;
const DEFAULT_TIME_RANGE_HOURS = 168; // 7 days

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Exponential decay weight: `exp(-ln(2) * ageDays / halfLifeDays)`
 */
function decayWeight(eventTimestamp: number, now: number): number {
  const ageDays = (now - eventTimestamp) / MS_PER_DAY;
  return Math.exp((-LN2 * ageDays) / HALF_LIFE_DAYS);
}

/**
 * Accumulate weighted counts into a map, keyed by the extractor function.
 */
function weightedCounts(
  events: TrackingEvent[],
  now: number,
  keyFn: (e: TrackingEvent) => string | null,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    const key = keyFn(event);
    if (key === null) continue;
    const w = decayWeight(event.timestamp, now);
    counts.set(key, (counts.get(key) ?? 0) + w);
  }
  return counts;
}

/**
 * Return map entries sorted by value descending, returning just the keys.
 */
function rankedKeys(counts: Map<string, number>): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);
}

// ---------------------------------------------------------------------------
// Known platform identifiers used in target strings
// ---------------------------------------------------------------------------

const PLATFORM_KEYWORDS = ['douyin', 'tiktok', 'xhs', 'rednote'];

function extractPlatform(target: string): string | null {
  const lower = target.toLowerCase();
  for (const kw of PLATFORM_KEYWORDS) {
    if (lower.includes(kw)) return kw === 'rednote' ? 'xhs' : kw;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main derivation
// ---------------------------------------------------------------------------

export async function derivePreferences(): Promise<UserPreferences> {
  const store = createLearningStore();
  const events = await store.getEvents();
  const now = Date.now();

  if (events.length === 0) {
    return {
      topSections: [],
      preferredTimeRange: DEFAULT_TIME_RANGE_HOURS,
      focusPlatform: null,
      dismissedContentTypes: [],
      interactionCount: 0,
    };
  }

  // -- Top sections (by views, clicks, and expands) --
  const sectionCounts = weightedCounts(events, now, (e) => e.section);
  const topSections = rankedKeys(sectionCounts);

  // -- Focus platform (by clicks on platform-related targets) --
  const clickEvents = events.filter((e) => e.type === 'click');
  const platformCounts = weightedCounts(clickEvents, now, (e) =>
    extractPlatform(e.target),
  );
  const rankedPlatforms = rankedKeys(platformCounts);
  const focusPlatform = rankedPlatforms[0] ?? null;

  // -- Dismissed content types --
  const dismissEvents = events.filter((e) => e.type === 'dismiss');
  const dismissCounts = weightedCounts(dismissEvents, now, (e) => e.target);
  const dismissedContentTypes = rankedKeys(dismissCounts);

  // -- Preferred time range --
  // If we have metadata with 'timeRange', use the most-selected one
  const timeRangeEvents = events.filter(
    (e) => e.metadata?.timeRange !== undefined,
  );
  let preferredTimeRange = DEFAULT_TIME_RANGE_HOURS;
  if (timeRangeEvents.length > 0) {
    const trCounts = weightedCounts(timeRangeEvents, now, (e) =>
      e.metadata?.timeRange ?? null,
    );
    const topTR = rankedKeys(trCounts)[0];
    if (topTR) {
      const parsed = parseInt(topTR, 10);
      if (!isNaN(parsed) && parsed > 0) {
        preferredTimeRange = parsed;
      }
    }
  }

  return {
    topSections,
    preferredTimeRange,
    focusPlatform,
    dismissedContentTypes,
    interactionCount: events.length,
  };
}
