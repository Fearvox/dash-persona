/**
 * Deterministic content scheduling engine for DashPersona.
 *
 * Analyses historical post data across platforms to generate a
 * content calendar. All logic is rule-based and deterministic --
 * same input always produces the same output.
 *
 * @module engine/content-planner
 */

import type { CreatorProfile, Post } from '../schema/creator-data';
import { classifyContent, computeEngagementProfile } from './persona';
import { memoize } from '../utils/memo-cache';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single suggested content slot in the calendar. */
export interface ContentSlot {
  /** Deterministic ID based on date + platform + type. */
  id: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  /** Time-of-day bucket. */
  timeSlot: 'morning' | 'afternoon' | 'evening';
  /** Suggested posting hour (0-23). */
  suggestedHour: number;
  /** Recommended platform. */
  platform: string;
  /** Recommended content category. */
  contentType: string;
  /** Template string explaining the recommendation. */
  reasoning: string;
  /** Priority level. */
  priority: 'high' | 'medium' | 'low';
  /** Slot lifecycle status. */
  status: 'suggested' | 'accepted' | 'dismissed';
}

/** A generated content plan. */
export interface ContentPlan {
  /** Scheduled slots. */
  slots: ContentSlot[];
  /** ISO timestamp when the plan was generated. */
  generatedAt: string;
  /** Number of posts the plan is based on. */
  dataPoints: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Map an hour (0-23) to a time slot. */
function hourToTimeSlot(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour >= 6 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'afternoon';
  return 'evening';
}

/** Get engagement rate for a post (0-1). */
function postEngagementRate(post: Post): number {
  if (post.views === 0) return 0;
  return (post.likes + post.comments + post.shares + post.saves) / post.views;
}

/** Capitalise the first letter of a string. */
function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Format a number to one decimal place with % suffix. */
function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** Day-of-week label. */
const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// ---------------------------------------------------------------------------
// Core analysis helpers
// ---------------------------------------------------------------------------

interface ContentTypeAnalysis {
  contentType: string;
  engagementRate: number;
  postCount: number;
  frequency: number; // posts per 30 days
  engagementGap: number; // how much above average
  frequencyGap: number; // how much below average frequency
  score: number; // combined opportunity score
}

interface TimeAnalysis {
  hour: number;
  meanEngagement: number;
  postCount: number;
}

interface PlatformTypePerformance {
  platform: string;
  contentType: string;
  engagementRate: number;
}

/**
 * Analyse content types across all platforms to find under-published
 * high-performers.
 */
function analyseContentTypes(
  allPosts: Post[],
): ContentTypeAnalysis[] {
  // Group posts by content type
  const byType = new Map<
    string,
    { posts: Post[]; totalEng: number; totalViews: number }
  >();

  for (const post of allPosts) {
    const ct = post.contentType ?? 'uncategorised';
    const entry = byType.get(ct) ?? { posts: [], totalEng: 0, totalViews: 0 };
    entry.posts.push(post);
    entry.totalEng += post.likes + post.comments + post.shares + post.saves;
    entry.totalViews += post.views;
    byType.set(ct, entry);
  }

  if (byType.size === 0) return [];

  // Compute average engagement rate and average frequency
  let totalEngRate = 0;
  let totalFreq = 0;
  let typeCount = 0;

  // Calculate time span in days for frequency calculation
  const timestamps = allPosts
    .filter((p) => p.publishedAt)
    .map((p) => new Date(p.publishedAt!).getTime())
    .filter(Number.isFinite);

  const timeSpanDays =
    timestamps.length >= 2
      ? (Math.max(...timestamps) - Math.min(...timestamps)) / 86_400_000
      : 30;
  const effectiveSpan = Math.max(timeSpanDays, 1);

  const analyses: ContentTypeAnalysis[] = [];

  for (const [contentType, data] of byType) {
    if (contentType === 'uncategorised') continue;
    const engRate = data.totalViews > 0 ? data.totalEng / data.totalViews : 0;
    const frequency = (data.posts.length / effectiveSpan) * 30; // per 30 days
    totalEngRate += engRate;
    totalFreq += frequency;
    typeCount++;

    analyses.push({
      contentType,
      engagementRate: engRate,
      postCount: data.posts.length,
      frequency,
      engagementGap: 0, // filled below
      frequencyGap: 0,
      score: 0,
    });
  }

  if (typeCount === 0) return [];

  const avgEngRate = totalEngRate / typeCount;
  const avgFreq = totalFreq / typeCount;

  // Calculate gaps and score
  for (const a of analyses) {
    a.engagementGap = a.engagementRate - avgEngRate;
    a.frequencyGap = avgFreq - a.frequency; // positive means under-published

    // Score: prioritise types with high engagement AND low frequency
    // Only consider types where engagement is above average
    if (a.engagementGap > 0 && a.frequencyGap > 0) {
      a.score = a.engagementGap * 100 + a.frequencyGap * 0.5;
    } else if (a.engagementGap > 0) {
      a.score = a.engagementGap * 50;
    } else {
      a.score = 0;
    }
  }

  // Sort by score descending
  analyses.sort((a, b) => b.score - a.score);
  return analyses;
}

/**
 * Analyse posting times to find hours with highest engagement.
 */
function analysePostingTimes(allPosts: Post[]): TimeAnalysis[] {
  const hourBuckets = new Map<
    number,
    { totalRate: number; count: number }
  >();

  for (const post of allPosts) {
    if (!post.publishedAt) continue;
    const d = new Date(post.publishedAt);
    if (!Number.isFinite(d.getTime())) continue;
    const hour = d.getUTCHours();
    const rate = postEngagementRate(post);

    const bucket = hourBuckets.get(hour) ?? { totalRate: 0, count: 0 };
    bucket.totalRate += rate;
    bucket.count++;
    hourBuckets.set(hour, bucket);
  }

  const analyses: TimeAnalysis[] = [];
  for (const [hour, data] of hourBuckets) {
    analyses.push({
      hour,
      meanEngagement: data.count > 0 ? data.totalRate / data.count : 0,
      postCount: data.count,
    });
  }

  // Sort by mean engagement descending
  analyses.sort((a, b) => b.meanEngagement - a.meanEngagement);
  return analyses;
}

/**
 * For each content type, find the platform with highest engagement.
 */
function analysePlatformPerformance(
  profiles: Record<string, CreatorProfile>,
): PlatformTypePerformance[] {
  const perf = new Map<
    string, // "contentType:platform"
    { totalEng: number; totalViews: number }
  >();

  for (const [platform, profile] of Object.entries(profiles)) {
    for (const post of profile.posts) {
      const ct = post.contentType ?? 'uncategorised';
      const key = `${ct}:${platform}`;
      const entry = perf.get(key) ?? { totalEng: 0, totalViews: 0 };
      entry.totalEng += post.likes + post.comments + post.shares + post.saves;
      entry.totalViews += post.views;
      perf.set(key, entry);
    }
  }

  const results: PlatformTypePerformance[] = [];
  for (const [key, data] of perf) {
    const [contentType, platform] = key.split(':');
    results.push({
      platform,
      contentType,
      engagementRate: data.totalViews > 0 ? data.totalEng / data.totalViews : 0,
    });
  }

  return results;
}

/**
 * Find the best platform for a given content type.
 */
function bestPlatformForType(
  contentType: string,
  platformPerf: PlatformTypePerformance[],
  fallbackPlatform: string,
): string {
  const candidates = platformPerf
    .filter((p) => p.contentType === contentType)
    .sort((a, b) => b.engagementRate - a.engagementRate);

  return candidates.length > 0 ? candidates[0].platform : fallbackPlatform;
}

// ---------------------------------------------------------------------------
// generateContentPlan
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic content plan based on historical post data.
 *
 * Scheduling rules:
 * 1. Cold start guard: < 10 total posts returns empty plan.
 * 2. What to post: content types with above-average engagement but
 *    below-average frequency (under-published high-performers).
 * 3. When to post: hours with highest historical engagement.
 * 4. Where to post: platform with highest engagement for that type.
 * 5. 1-2 slots per day, alternating types for diversity.
 * 6. No same content type on consecutive days.
 *
 * @param profiles  Map of platform name to CreatorProfile.
 * @param daysAhead Number of days to plan ahead (default 7).
 * @returns A deterministic ContentPlan.
 */
export function generateContentPlan(
  profiles: Record<string, CreatorProfile>,
  daysAhead = 7,
): ContentPlan {
  // Collect all posts across all platforms
  const allPosts: Post[] = [];
  for (const profile of Object.values(profiles)) {
    // Classify content to ensure contentType is set
    classifyContent(profile.posts);
    allPosts.push(...profile.posts);
  }

  const dataPoints = allPosts.length;

  // Cold start guard
  if (dataPoints < 10) {
    return {
      slots: [],
      generatedAt: new Date().toISOString(),
      dataPoints,
    };
  }

  // Analyse what to post
  const contentAnalysis = analyseContentTypes(allPosts);

  // Analyse when to post
  const timeAnalysis = analysePostingTimes(allPosts);

  // Analyse where to post
  const platformPerf = analysePlatformPerformance(profiles);

  // Compute overall average engagement for reasoning text
  const engProfile = computeEngagementProfile(allPosts);
  const avgEngRate = engProfile.overallRate;

  // Get top content types to recommend (at least 3, up to 6)
  const recommendedTypes = contentAnalysis
    .filter((a) => a.score > 0 || a.engagementRate > avgEngRate)
    .slice(0, 6);

  // If no high-scoring types, fall back to top engagement types
  if (recommendedTypes.length === 0) {
    const fallback = [...contentAnalysis]
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 3);
    recommendedTypes.push(...fallback);
  }

  if (recommendedTypes.length === 0) {
    return {
      slots: [],
      generatedAt: new Date().toISOString(),
      dataPoints,
    };
  }

  // Get top posting hours (pick top 3 for variety)
  const topHours = timeAnalysis.slice(0, 3).map((t) => t.hour);
  if (topHours.length === 0) {
    // Default to common posting hours
    topHours.push(10, 15, 20);
  }

  // Default platform (most posts)
  const platformPostCounts = new Map<string, number>();
  for (const [platform, profile] of Object.entries(profiles)) {
    platformPostCounts.set(platform, profile.posts.length);
  }
  const defaultPlatform = [...platformPostCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0] ?? 'douyin';

  // Generate slots
  const slots: ContentSlot[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Pre-compute recent post counts per content type — O(P) once vs O(D×S×P) in loop
  const thirtyDaysAgo = Date.now() - 30 * 86_400_000;
  const recentCountByType = new Map<string, number>();
  for (const p of allPosts) {
    if (p.contentType && p.publishedAt && new Date(p.publishedAt).getTime() >= thirtyDaysAgo) {
      recentCountByType.set(p.contentType, (recentCountByType.get(p.contentType) ?? 0) + 1);
    }
  }

  let lastContentType = '';

  for (let day = 1; day <= daysAhead; day++) {
    const date = new Date(today.getTime() + day * 86_400_000);
    const dateStr = date.toISOString().slice(0, 10);
    const dayOfWeek = date.getUTCDay();
    const dayName = DAY_NAMES[dayOfWeek];

    // Generate 1-2 slots per day
    const slotsPerDay = day % 3 === 0 ? 1 : 2; // Every 3rd day gets 1 slot

    for (let slotIdx = 0; slotIdx < slotsPerDay; slotIdx++) {
      // Pick content type: round-robin through recommendations,
      // but skip if same as last to maintain diversity
      let typeIdx = (day * 2 + slotIdx) % recommendedTypes.length;
      let chosen = recommendedTypes[typeIdx];

      // Avoid same type on consecutive days
      if (chosen.contentType === lastContentType && recommendedTypes.length > 1) {
        typeIdx = (typeIdx + 1) % recommendedTypes.length;
        chosen = recommendedTypes[typeIdx];
      }

      // Pick posting hour
      const hourIdx = (day + slotIdx) % topHours.length;
      const suggestedHour = topHours[hourIdx];
      const timeSlot = hourToTimeSlot(suggestedHour);

      // Pick platform
      const platform = bestPlatformForType(
        chosen.contentType,
        platformPerf,
        defaultPlatform,
      );

      // Determine priority
      let priority: 'high' | 'medium' | 'low';
      if (chosen.score > 0 && chosen.engagementGap > 0.02) {
        priority = 'high';
      } else if (chosen.engagementGap > 0) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      // Build reasoning
      const typeLabel = capitalise(chosen.contentType);
      const platformLabel = capitalise(platform);

      const recentCount = recentCountByType.get(chosen.contentType) ?? 0;

      const parts: string[] = [];
      parts.push(
        `${typeLabel} content gets ${pct(chosen.engagementRate)} engagement on ${platformLabel} (vs ${pct(avgEngRate)} average).`,
      );
      parts.push(
        `${dayName} ${timeSlot} is your peak time.`,
      );
      if (chosen.frequencyGap > 0) {
        parts.push(
          `You've only posted ${recentCount} ${typeLabel.toLowerCase()} posts in the last 30 days \u2014 room to grow.`,
        );
      }

      const reasoning = parts.join(' ');

      // Deterministic ID
      const id = `slot-${dateStr}-${platform}-${chosen.contentType}`;

      slots.push({
        id,
        date: dateStr,
        timeSlot,
        suggestedHour,
        platform,
        contentType: chosen.contentType,
        reasoning,
        priority,
        status: 'suggested',
      });

      lastContentType = chosen.contentType;
    }
  }

  return {
    slots,
    generatedAt: new Date().toISOString(),
    dataPoints,
  };
}

// ---------------------------------------------------------------------------
// exportToICS
// ---------------------------------------------------------------------------

/**
 * Generate a valid .ics (iCalendar) file string from accepted content slots.
 *
 * Only slots with `status: 'accepted'` are included. Each slot becomes a
 * VEVENT with the content type and platform as the summary, and the
 * reasoning text as the description.
 *
 * @param slots  Array of ContentSlot to export.
 * @returns A valid .ics format string.
 */
export function exportToICS(slots: ContentSlot[]): string {
  const accepted = slots.filter((s) => s.status === 'accepted');

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DashPersona//Content Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const slot of accepted) {
    const dateClean = slot.date.replace(/-/g, '');
    const hourStr = slot.suggestedHour.toString().padStart(2, '0');
    const dtStart = `${dateClean}T${hourStr}0000Z`;
    // 1-hour event
    const endHour = ((slot.suggestedHour + 1) % 24).toString().padStart(2, '0');
    const dtEnd = `${dateClean}T${endHour}0000Z`;

    const summary = `[${capitalise(slot.contentType)}] on ${capitalise(slot.platform)}`;
    // Escape special characters in iCal text
    const description = slot.reasoning
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${slot.id}@dashpersona`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push(`STATUS:CONFIRMED`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Memoized version of generateContentPlan — same input profiles
 * and daysAhead (by content hash) returns cached result without recomputing.
 */
export const generateContentPlanCached = memoize(generateContentPlan);
