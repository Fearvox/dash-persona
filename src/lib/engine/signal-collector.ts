/**
 * Signal Collector — unified signal extraction from CreatorProfile + PersonaScore.
 *
 * Extracts ~15 standardised signals covering engagement, rhythm, growth,
 * content, and audience dimensions. Each signal carries a raw value,
 * a normalised 0-100 score, a 0-1 confidence, and provenance metadata.
 *
 * All functions are pure and deterministic — no network calls, no side effects.
 *
 * @module engine/signal-collector
 */

import type { CreatorProfile, Post } from '../schema/creator-data';
import type { PersonaScore } from './persona';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CreatorSignal {
  id: string;
  category: 'engagement' | 'rhythm' | 'growth' | 'content' | 'audience';
  rawValue: number;
  normalizedValue: number; // 0-100
  confidence: number; // 0-1
  source: string;
}

export interface SignalVector {
  profileId: string;
  platform: string;
  signals: CreatorSignal[]; // sorted by category (alpha), then id (alpha)
  collectedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a value to [lo, hi]. */
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Shannon entropy of a discrete probability distribution. */
function shannonEntropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let entropy = 0;
  for (const c of counts) {
    if (c > 0) {
      const p = c / total;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

/**
 * Simple min-max normalisation within a group of raw values to the 0-100 range.
 * If only one value exists, it maps to 50.
 */
function minMaxNormalize(values: number[]): number[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [50];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map((v) => ((v - min) / (max - min)) * 100);
}

// ---------------------------------------------------------------------------
// Signal extractors
// ---------------------------------------------------------------------------

type RawSignal = Omit<CreatorSignal, 'normalizedValue'>;

function extractEngagementSignals(
  profile: CreatorProfile,
  score: PersonaScore,
): RawSignal[] {
  const posts = profile.posts;
  const n = posts.length;
  const signals: RawSignal[] = [];

  // engagementRate
  signals.push({
    id: 'engagementRate',
    category: 'engagement',
    rawValue: score.engagement.overallRate,
    confidence: clamp(n / 30, 0, 1),
    source: 'PersonaScore.engagement.overallRate',
  });

  // engagementTrend
  signals.push({
    id: 'engagementTrend',
    category: 'engagement',
    rawValue: score.engagement.trend,
    confidence: score.engagement.trendReliable ? clamp(n / 30, 0, 1) : 0.2,
    source: 'PersonaScore.engagement.trend',
  });

  // saveRate — avg of (saves / likes) for posts where both > 0
  const postsWithSaves = posts.filter((p) => p.saves > 0 && p.likes > 0);
  if (postsWithSaves.length > 0) {
    const saveRate =
      postsWithSaves.reduce((sum, p) => sum + p.saves / p.likes, 0) /
      postsWithSaves.length;
    signals.push({
      id: 'saveRate',
      category: 'engagement',
      rawValue: saveRate,
      confidence: clamp(postsWithSaves.length / 15, 0, 1),
      source: 'computed: avg(post.saves / post.likes)',
    });
  }

  // completionRate — avg of post.completionRate for posts that have it
  const postsWithCompletion = posts.filter(
    (p): p is Post & { completionRate: number } => p.completionRate != null,
  );
  if (postsWithCompletion.length > 0) {
    const avgCompletion =
      postsWithCompletion.reduce((sum, p) => sum + p.completionRate, 0) /
      postsWithCompletion.length;
    signals.push({
      id: 'completionRate',
      category: 'engagement',
      rawValue: avgCompletion,
      confidence: clamp(postsWithCompletion.length / 15, 0, 1),
      source: 'computed: avg(post.completionRate)',
    });
  }

  return signals;
}

function extractRhythmSignals(
  profile: CreatorProfile,
  score: PersonaScore,
): RawSignal[] {
  const posts = profile.posts;
  const n = posts.length;
  const signals: RawSignal[] = [];

  // postingFrequency
  signals.push({
    id: 'postingFrequency',
    category: 'rhythm',
    rawValue: score.rhythm.postsPerWeek,
    confidence: clamp(n / 14, 0, 1),
    source: 'PersonaScore.rhythm.postsPerWeek',
  });

  // consistencyScore
  signals.push({
    id: 'consistencyScore',
    category: 'rhythm',
    rawValue: score.consistency.score,
    confidence: clamp(n / 20, 0, 1),
    source: 'PersonaScore.consistency.score',
  });

  // bestPostingHour — entropy-based confidence
  const postsWithTime = posts.filter((p) => p.publishedAt != null);
  if (postsWithTime.length > 0) {
    const hourCounts = new Array(24).fill(0) as number[];
    for (const p of postsWithTime) {
      const hour = new Date(p.publishedAt!).getHours();
      hourCounts[hour]++;
    }

    const bestHour = hourCounts.indexOf(Math.max(...hourCounts));
    const entropy = shannonEntropy(hourCounts);
    const maxEntropy = Math.log2(24);
    const confidence = clamp(1 - entropy / maxEntropy, 0, 1);

    signals.push({
      id: 'bestPostingHour',
      category: 'rhythm',
      rawValue: bestHour,
      confidence,
      source: 'computed: mode(post.publishedAt.hour)',
    });
  }

  return signals;
}

function extractGrowthSignals(
  profile: CreatorProfile,
  score: PersonaScore,
): RawSignal[] {
  const posts = profile.posts;
  const n = posts.length;
  const signals: RawSignal[] = [];

  // followerGrowthRate
  const history = profile.history;
  let followerGrowthRate = 0;
  if (history && history.length >= 2) {
    const first = history[0].profile.followers;
    const last = history[history.length - 1].profile.followers;
    followerGrowthRate = first > 0 ? (last - first) / first : 0;
  }
  signals.push({
    id: 'followerGrowthRate',
    category: 'growth',
    rawValue: followerGrowthRate,
    confidence: clamp((history?.length ?? 0) / 7, 0, 1),
    source: 'computed: profile.history follower delta',
  });

  // growthMomentum
  const momentumMap: Record<string, number> = {
    accelerating: 0.8,
    steady: 0.6,
    decelerating: 0.3,
    stagnant: 0,
    insufficient_data: 0,
  };
  signals.push({
    id: 'growthMomentum',
    category: 'growth',
    rawValue: momentumMap[score.growthHealth.momentum] ?? 0,
    confidence: clamp(n / 14, 0, 1),
    source: 'PersonaScore.growthHealth.momentum',
  });

  return signals;
}

function extractContentSignals(
  profile: CreatorProfile,
  score: PersonaScore,
): RawSignal[] {
  const posts = profile.posts;
  const n = posts.length;
  const signals: RawSignal[] = [];

  const distEntries = Object.entries(score.contentDistribution);

  // contentDiversity
  const diversity = clamp(distEntries.length / 10, 0, 1);
  signals.push({
    id: 'contentDiversity',
    category: 'content',
    rawValue: diversity,
    confidence: clamp(n / 20, 0, 1),
    source: 'computed: categories_count / 10',
  });

  // topCategoryShare
  const topShare =
    distEntries.length > 0
      ? Math.max(...distEntries.map(([, pct]) => pct))
      : 0;
  signals.push({
    id: 'topCategoryShare',
    category: 'content',
    rawValue: topShare,
    confidence: clamp(n / 20, 0, 1),
    source: 'computed: max(contentDistribution)',
  });

  // hookUsageRate — posts whose description starts with ?, number, or emoji
  if (n > 0) {
    const hookPattern = /^(?:[?？]|\d|[\u{1F300}-\u{1FAFF}])/u;
    const hookPosts = posts.filter((p) => hookPattern.test(p.desc.trim()));
    signals.push({
      id: 'hookUsageRate',
      category: 'content',
      rawValue: hookPosts.length / n,
      confidence: clamp(n / 20, 0, 1),
      source: 'computed: hook_pattern_matches / total_posts',
    });
  }

  // hashtagCoverage — posts with >= 1 hashtag (#)
  if (n > 0) {
    const postsWithHashtag = posts.filter(
      (p) => p.desc.includes('#') || (p.tags && p.tags.length > 0),
    );
    signals.push({
      id: 'hashtagCoverage',
      category: 'content',
      rawValue: postsWithHashtag.length / n,
      confidence: clamp(n / 20, 0, 1),
      source: 'computed: posts_with_hashtag / total_posts',
    });
  }

  // viralPostRatio — posts with views >= 5x mean views
  if (n > 0) {
    const meanViews = posts.reduce((s, p) => s + p.views, 0) / n;
    if (meanViews > 0) {
      const viralPosts = posts.filter((p) => p.views >= 5 * meanViews);
      signals.push({
        id: 'viralPostRatio',
        category: 'content',
        rawValue: viralPosts.length / n,
        confidence: clamp(n / 20, 0, 1),
        source: 'computed: posts_5x_mean_views / total_posts',
      });
    }
  }

  return signals;
}

function extractAudienceSignals(profile: CreatorProfile): RawSignal[] {
  const signals: RawSignal[] = [];

  if (profile.fanPortrait?.gender) {
    const { male, female } = profile.fanPortrait.gender;
    const total = male + female;
    if (total > 0) {
      const pMale = male / total;
      const pFemale = female / total;
      let entropy = 0;
      if (pMale > 0) entropy -= pMale * Math.log2(pMale);
      if (pFemale > 0) entropy -= pFemale * Math.log2(pFemale);
      // max entropy for 2 buckets = log2(2) = 1
      const normalised = entropy; // already 0-1

      signals.push({
        id: 'audienceQuality',
        category: 'audience',
        rawValue: normalised,
        confidence: 0.8,
        source: 'computed: gender_entropy(fanPortrait)',
      });
    }
  }

  return signals;
}

// ---------------------------------------------------------------------------
// Normalisation pass
// ---------------------------------------------------------------------------

function normalizeSignals(raw: RawSignal[]): CreatorSignal[] {
  // Group by category
  const grouped = new Map<string, RawSignal[]>();
  for (const s of raw) {
    const arr = grouped.get(s.category) ?? [];
    arr.push(s);
    grouped.set(s.category, arr);
  }

  const result: CreatorSignal[] = [];
  for (const [, group] of grouped) {
    const rawValues = group.map((s) => s.rawValue);
    const normalized = minMaxNormalize(rawValues);
    for (let i = 0; i < group.length; i++) {
      result.push({
        ...group[i],
        normalizedValue: Math.round(normalized[i] * 100) / 100,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract standardised signals from a CreatorProfile and its PersonaScore.
 *
 * Returns a deterministic {@link SignalVector} with signals sorted
 * alphabetically by category, then by id.
 */
export function collectSignals(
  profile: CreatorProfile,
  score: PersonaScore,
): SignalVector {
  const raw: RawSignal[] = [
    ...extractEngagementSignals(profile, score),
    ...extractRhythmSignals(profile, score),
    ...extractGrowthSignals(profile, score),
    ...extractContentSignals(profile, score),
    ...extractAudienceSignals(profile),
  ];

  const signals = normalizeSignals(raw);

  // Sort alphabetically by category, then by id
  signals.sort((a, b) => {
    if (a.category !== b.category) return a.category < b.category ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  return {
    profileId: profile.profile.uniqueId,
    platform: profile.platform as string,
    signals,
    collectedAt: profile.fetchedAt,
  };
}
