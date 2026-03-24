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
import {
  classifyContent,
  computeEngagementProfile,
  type EngagementProfile,
  type ContentDistribution,
} from './persona';

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
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a PlatformSummary from a CreatorProfile.
 * Runs content classification and engagement profiling as side effects.
 */
function buildSummary(profile: CreatorProfile): PlatformSummary {
  // Clone posts to avoid mutating the original when classifying
  const postsCopy: Post[] = profile.posts.map((p) => ({ ...p }));
  const distribution = classifyContent(postsCopy);
  const engagement = computeEngagementProfile(postsCopy);

  const totalViews = postsCopy.reduce((s, p) => s + p.views, 0);
  const totalEngagement = postsCopy.reduce(
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
    postCount: postsCopy.length,
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
  if (
    bottomEng.overallEngagementRate > 0 &&
    topEng.overallEngagementRate / bottomEng.overallEngagementRate >= 1.5
  ) {
    const ratio = (
      topEng.overallEngagementRate / bottomEng.overallEngagementRate
    ).toFixed(1);
    insights.push({
      type: 'engagement_gap',
      text: `Your content gets ${ratio}x more engagement on ${topEng.platform} than ${bottomEng.platform}`,
      platforms: [topEng.platform, bottomEng.platform],
      magnitude:
        topEng.overallEngagementRate / bottomEng.overallEngagementRate,
    });
  }

  // --- Insight: Audience size gap ---
  const topAud = byAudience[0];
  const bottomAud = byAudience[byAudience.length - 1];
  if (bottomAud.followers > 0 && topAud.followers / bottomAud.followers >= 2) {
    const ratio = (topAud.followers / bottomAud.followers).toFixed(1);
    insights.push({
      type: 'audience_size',
      text: `Your audience on ${topAud.platform} is ${ratio}x larger than on ${bottomAud.platform}`,
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
      if (worst.rate > 0 && best.rate / worst.rate >= 2) {
        const ratio = Math.round(best.rate / worst.rate);
        insights.push({
          type: 'best_content',
          text: `Your ${cat} content gets ${ratio}x more engagement on ${best.platform} than ${worst.platform}`,
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
            text: `${cat} content is ${Math.round(aPct)}% of your ${a.platform} but nearly absent on ${b.platform}`,
            platforms: [a.platform, b.platform],
            magnitude: aPct - bPct,
          });
        } else if (bPct >= 25 && aPct < 5) {
          insights.push({
            type: 'content_distribution',
            text: `${cat} content is ${Math.round(bPct)}% of your ${b.platform} but nearly absent on ${a.platform}`,
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
