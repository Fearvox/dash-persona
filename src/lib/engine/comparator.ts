/**
 * Cross-platform comparator engine.
 *
 * Given multiple {@link CreatorProfile} instances (one per platform), this
 * module produces a structured comparison of engagement rates, growth
 * speed, content distribution, and per-category performance -- plus
 * natural-language insight strings ready for display.
 *
 * @module engine/comparator
 */

import type { CreatorProfile, Post } from '../schema/creator-data';
import { memoize } from '../utils/memo-cache';
import {
  classifyContent,
  computeEngagementProfile,
  type EngagementProfile,
  type ContentDistribution,
} from './persona';
import { adaptiveThreshold, empiricalPercentile } from './stats';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Per-platform summary used inside the comparison result. */
export interface PlatformSummary {
  platform: string;
  followers: number;
  totalViews: number;
  totalEngagement: number;
  overallEngagementRate: number;
  medianEngagementRate: number;
  postCount: number;
  contentDistribution: Record<string, number>;
  engagement: EngagementProfile;
}

/** A single comparative insight. */
export interface ComparisonInsight {
  /** Machine-readable insight type for filtering / grouping. */
  type:
    | 'engagement_gap'
    | 'content_distribution'
    | 'growth_gap'
    | 'best_content'
    | 'audience_size';
  /** Human-readable insight text (English). */
  text: string;
  /** Platforms referenced by this insight. */
  platforms: string[];
  /** Magnitude of the gap (higher = more actionable). */
  magnitude: number;
}

/** Full cross-platform comparison result. */
export interface CrossPlatformComparison {
  /** Per-platform summaries. */
  summaries: PlatformSummary[];
  /** Generated insights, sorted by magnitude descending. */
  insights: ComparisonInsight[];
  /** Platform with the highest overall engagement rate. */
  bestEngagementPlatform: string | null;
  /** Platform with the most followers. */
  largestAudiencePlatform: string | null;
}

// ---------------------------------------------------------------------------
// Multi-creator comparison types
// ---------------------------------------------------------------------------

/** Per-creator summary for multi-creator comparison. */
export interface CreatorSummary {
  id: string;
  platform: string;
  profileUrl: string;
  nickname: string;
  followers: number;
  totalViews: number;
  totalEngagement: number;
  overallEngagementRate: number;
  postCount: number;
}

/** A single metric comparison across all creators. */
export interface MetricComparison {
  metric: string;
  values: Record<string, number>;
  normalized: Record<string, number>;
  ranks: Record<string, number>;
  bestCreatorId: string | null;
}

/** Cross-creator comparison result for benchmarking multiple creators. */
export interface MultiCreatorComparison {
  summaries: CreatorSummary[];
  metrics: MetricComparison[];
  bestPerMetric: Record<string, string>;
  metricNames: string[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a PlatformSummary from a CreatorProfile.
 * Runs content classification and engagement profiling as side effects.
 */
function buildSummary(profile: CreatorProfile): PlatformSummary {
  // Operate directly on posts — classifyContent mutation is the intended side effect
  const distribution = classifyContent(profile.posts);
  const engagement = computeEngagementProfile(profile.posts);

  const totalViews = profile.posts.reduce((s, p) => s + p.views, 0);
  const totalEngagement = profile.posts.reduce(
    (s, p) => s + p.likes + p.comments + p.shares + p.saves,
    0,
  );

  const contentDist: Record<string, number> = {};
  for (const [cat, pct] of distribution) {
    contentDist[cat] = Math.round(pct * 10) / 10;
  }

  return {
    platform: profile.platform,
    followers: profile.profile.followers,
    totalViews,
    totalEngagement,
    overallEngagementRate: engagement.overallRate,
    medianEngagementRate: engagement.medianRate,
    postCount: profile.posts.length,
    contentDistribution: contentDist,
    engagement,
  };
}

/**
 * Find the intersection of content categories present on two or more
 * platforms.
 */
function sharedCategories(summaries: PlatformSummary[]): string[] {
  if (summaries.length < 2) return [];
  const sets = summaries.map(
    (s) => new Set(Object.keys(s.contentDistribution)),
  );
  const shared: string[] = [];
  for (const cat of sets[0]) {
    if (sets.every((s) => s.has(cat))) {
      shared.push(cat);
    }
  }
  return shared;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compare a creator's presence across multiple platforms.
 *
 * @param profiles  Array of {@link CreatorProfile} (one per platform).
 *                  Must contain at least 2 profiles for meaningful insights.
 * @returns Structured comparison with per-platform summaries and insights.
 */
export function comparePlatforms(
  profiles: CreatorProfile[],
): CrossPlatformComparison {
  const summaries = profiles.map(buildSummary);
  const insights: ComparisonInsight[] = [];

  if (summaries.length < 2) {
    return {
      summaries,
      insights: [],
      bestEngagementPlatform: summaries[0]?.platform ?? null,
      largestAudiencePlatform: summaries[0]?.platform ?? null,
    };
  }

  // Sort copies for comparisons
  const byEngagement = [...summaries].sort(
    (a, b) => b.overallEngagementRate - a.overallEngagementRate,
  );
  const byAudience = [...summaries].sort((a, b) => b.followers - a.followers);

  // --- Insight: Engagement gap ---
  const topEng = byEngagement[0];
  const bottomEng = byEngagement[byEngagement.length - 1];
  const engGapThreshold = adaptiveThreshold(
    1.5,
    Math.min(topEng.postCount, bottomEng.postCount),
  );
  if (
    bottomEng.overallEngagementRate > 0 &&
    topEng.overallEngagementRate / bottomEng.overallEngagementRate >=
      engGapThreshold
  ) {
    const ratio = (
      topEng.overallEngagementRate / bottomEng.overallEngagementRate
    ).toFixed(1);
    insights.push({
      type: 'engagement_gap',
      text: t('engine.compare.engagementGap', {
        ratio,
        topPlatform: t('platform.' + topEng.platform),
        bottomPlatform: t('platform.' + bottomEng.platform),
      }),
      platforms: [topEng.platform, bottomEng.platform],
      magnitude:
        topEng.overallEngagementRate / bottomEng.overallEngagementRate,
    });
  }

  // --- Insight: Audience size gap ---
  const topAud = byAudience[0];
  const bottomAud = byAudience[byAudience.length - 1];
  const audGapThreshold = adaptiveThreshold(
    2.0,
    Math.min(topAud.postCount, bottomAud.postCount),
  );
  if (
    bottomAud.followers > 0 &&
    topAud.followers / bottomAud.followers >= audGapThreshold
  ) {
    const ratio = (topAud.followers / bottomAud.followers).toFixed(1);
    insights.push({
      type: 'audience_size',
      text: t('engine.compare.audienceSize', {
        ratio,
        topPlatform: t('platform.' + topAud.platform),
        bottomPlatform: t('platform.' + bottomAud.platform),
      }),
      platforms: [topAud.platform, bottomAud.platform],
      magnitude: topAud.followers / bottomAud.followers,
    });
  }

  // --- Insight: Per-category cross-platform engagement ---
  const shared = sharedCategories(summaries);
  for (const cat of shared) {
    // Find the platform where this category performs best
    const catPerformance = summaries
      .map((s) => {
        const catEntry = s.engagement.byCategory.find(
          (c) => c.category === cat,
        );
        return {
          platform: s.platform,
          rate: catEntry?.meanEngagementRate ?? 0,
          count: catEntry?.postCount ?? 0,
        };
      })
      .filter((c) => c.count >= 2)
      .sort((a, b) => b.rate - a.rate);

    if (catPerformance.length >= 2) {
      const best = catPerformance[0];
      const worst = catPerformance[catPerformance.length - 1];
      const catGapThreshold = adaptiveThreshold(
        2.0,
        Math.min(best.count, worst.count),
      );
      if (worst.rate > 0 && best.rate / worst.rate >= catGapThreshold) {
        const ratio = Math.round(best.rate / worst.rate);
        insights.push({
          type: 'best_content',
          text: t('engine.compare.bestContent', {
            category: t('engine.category.' + cat),
            ratio: String(ratio),
            bestPlatform: t('platform.' + best.platform),
            worstPlatform: t('platform.' + worst.platform),
          }),
          platforms: [best.platform, worst.platform],
          magnitude: best.rate / worst.rate,
        });
      }
    }
  }

  // --- Insight: Content distribution mismatch ---
  for (let i = 0; i < summaries.length; i++) {
    for (let j = i + 1; j < summaries.length; j++) {
      const a = summaries[i];
      const b = summaries[j];
      const allCats = new Set([
        ...Object.keys(a.contentDistribution),
        ...Object.keys(b.contentDistribution),
      ]);

      // Find categories that are strong on one platform but missing on another
      for (const cat of allCats) {
        const aPct = a.contentDistribution[cat] ?? 0;
        const bPct = b.contentDistribution[cat] ?? 0;
        if (aPct >= 25 && bPct < 5) {
          insights.push({
            type: 'content_distribution',
            text: t('engine.compare.contentDistribution', {
              category: t('engine.category.' + cat),
              pct: String(Math.round(aPct)),
              platformA: t('platform.' + a.platform),
              platformB: t('platform.' + b.platform),
            }),
            platforms: [a.platform, b.platform],
            magnitude: aPct - bPct,
          });
        } else if (bPct >= 25 && aPct < 5) {
          insights.push({
            type: 'content_distribution',
            text: t('engine.compare.contentDistribution', {
              category: t('engine.category.' + cat),
              pct: String(Math.round(bPct)),
              platformA: t('platform.' + b.platform),
              platformB: t('platform.' + a.platform),
            }),
            platforms: [b.platform, a.platform],
            magnitude: bPct - aPct,
          });
        }
      }
    }
  }

  // Sort insights by magnitude
  insights.sort((a, b) => b.magnitude - a.magnitude);

  return {
    summaries,
    insights,
    bestEngagementPlatform: byEngagement[0].platform,
    largestAudiencePlatform: byAudience[0].platform,
  };
}

/**
 * Memoized version of comparePlatforms — same input profiles
 * (by content hash) returns cached result without recomputing.
 */
export const comparePlatformsCached = memoize(comparePlatforms);

// ---------------------------------------------------------------------------
// Multi-creator comparison
// ---------------------------------------------------------------------------

const MULTI_CREATOR_METRICS = [
  'followers',
  'overallEngagementRate',
  'postCount',
  'totalViews',
  'totalEngagement',
] as const;

type MultiCreatorMetric = (typeof MULTI_CREATOR_METRICS)[number];

/**
 * Build a CreatorSummary from a CreatorProfile.
 * Does NOT call computeEngagementProfile — uses a lightweight derivation.
 */
function buildCreatorSummary(profile: CreatorProfile): CreatorSummary {
  const totalViews = profile.posts.reduce((s, p) => s + p.views, 0);
  const totalEngagement = profile.posts.reduce(
    (s, p) => s + p.likes + p.comments + p.shares + p.saves,
    0,
  );
  const overallEngagementRate =
    totalViews > 0 ? totalEngagement / totalViews : 0;

  return {
    id: profile.profileUrl,
    platform: profile.platform,
    profileUrl: profile.profileUrl,
    nickname: profile.profile.nickname,
    followers: profile.profile.followers,
    totalViews,
    totalEngagement,
    overallEngagementRate,
    postCount: profile.posts.length,
  };
}

/**
 * Extract a numeric metric value from a CreatorSummary by metric name.
 */
function extractMetric(summary: CreatorSummary, metric: MultiCreatorMetric): number {
  switch (metric) {
    case 'followers':
      return summary.followers;
    case 'overallEngagementRate':
      return summary.overallEngagementRate;
    case 'postCount':
      return summary.postCount;
    case 'totalViews':
      return summary.totalViews;
    case 'totalEngagement':
      return summary.totalEngagement;
    default:
      return 0;
  }
}

/**
 * Compare multiple creators across a fixed set of engagement and reach metrics.
 *
 * Each metric is normalised using the Hazen plotting-position percentile so that
 * creators are ranked on a 0-100 scale relative to the cohort.  The creator
 * with the highest normalised value for a metric is recorded as the winner.
 *
 * @param profiles  Array of CreatorProfile (one per creator/platform).
 * @returns MultiCreatorComparison with per-creator summaries, per-metric
 *          comparisons, and a best-per-metric lookup.
 */
export function compareMultiCreator(
  profiles: CreatorProfile[],
): MultiCreatorComparison {
  const summaries = profiles.map(buildCreatorSummary);

  const metrics: MetricComparison[] = [];
  const bestPerMetric: Record<string, string> = {};

  for (const metric of MULTI_CREATOR_METRICS) {
    // Collect all values for this metric across the cohort
    const allValues = summaries.map((s) => extractMetric(s, metric));
    const sorted = [...allValues].sort((a, b) => a - b);

    const values: Record<string, number> = {};
    const normalized: Record<string, number> = {};
    const ranks: Record<string, number> = {};

    summaries.forEach((s, idx) => {
      values[s.id] = allValues[idx];
      normalized[s.id] = empiricalPercentile(allValues[idx], sorted);
    });

    // Rank by normalised value descending (rank 1 = best)
    const sortedByNorm = [...summaries].sort(
      (a, b) => normalized[b.id] - normalized[a.id],
    );
    sortedByNorm.forEach((s, idx) => {
      ranks[s.id] = idx + 1;
    });

    const bestCreator = sortedByNorm[0];
    bestPerMetric[metric] = bestCreator?.id ?? null;

    metrics.push({
      metric,
      values,
      normalized,
      ranks,
      bestCreatorId: bestCreator?.id ?? null,
    });
  }

  return {
    summaries,
    metrics,
    bestPerMetric,
    metricNames: [...MULTI_CREATOR_METRICS],
  };
}

/**
 * Memoized version of compareMultiCreator.
 */
export const compareMultiCreatorCached = memoize(compareMultiCreator);
