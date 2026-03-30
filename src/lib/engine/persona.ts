/**
 * PersonaScoreEngine -- the core differentiator of DashPersona.
 *
 * Analyses a {@link CreatorProfile} to produce a comprehensive persona
 * score covering content classification, engagement profiling, publishing
 * rhythm, persona consistency, growth health, and rule-based persona tags.
 *
 * All functions are pure and side-effect-free. The engine operates entirely
 * on the data present in the profile -- no network calls, no database
 * lookups.
 *
 * @module engine/persona
 */

import type { CreatorProfile, Post } from '../schema/creator-data';
import { memoize } from '../utils/memo-cache';
import { safeTrend } from './stats';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Content category taxonomy
// ---------------------------------------------------------------------------

/**
 * Multi-language keyword dictionary for content classification.
 * Each key is a canonical category slug; the values are keywords
 * (Chinese + English) that signal membership in that category.
 */
const CONTENT_CATEGORIES: Record<string, string[]> = {
  tutorial: ['教程', '教学', 'how to', 'tutorial', '步骤', '手把手', 'guide', 'learn', '学习', '干货'],
  daily: ['日常', 'vlog', '日记', 'daily', '随拍', '生活', 'routine'],
  review: ['种草', '推荐', '测评', 'review', 'unboxing', '好物', '安利', '分享'],
  entertainment: ['搞笑', '段子', 'funny', '整蛊', 'prank', '笑死', 'comedy'],
  story: ['剧情', '故事', 'story', '反转', '短剧', 'skit'],
  emotion: ['情感', '扎心', '感动', 'emotional', '泪目', '暖心'],
  food: ['美食', '做饭', 'cooking', 'recipe', '食谱', '吃播', 'mukbang'],
  fitness: ['健身', '减肥', 'workout', 'fitness', '运动', '瑜伽', 'yoga'],
  travel: ['旅行', '旅游', 'travel', '打卡', '景点', 'trip'],
  fashion: ['穿搭', '时尚', 'fashion', 'ootd', '搭配', 'style'],
  beauty: ['美妆', '护肤', 'makeup', 'skincare', '化妆'],
  tech: ['科技', '数码', 'tech', 'gadget', '手机', '评测'],
  knowledge: ['知识', '科普', 'education', '冷知识', 'facts', '涨知识'],
  music: ['音乐', '唱歌', 'music', 'cover', '翻唱', 'sing'],
  dance: ['舞蹈', '跳舞', 'dance', '编舞', 'choreography'],
  pet: ['宠物', '猫', '狗', 'pet', 'cat', 'dog', '萌宠'],
  photography: ['摄影', '拍照', 'photo', 'photography', '调色', '修图'],
  parenting: ['育儿', '宝宝', 'baby', 'parenting', '带娃', '亲子', '萌娃'],
  diy: ['diy', '手工', 'craft', '改造', 'handmade', '手作'],
  finance: ['理财', '投资', 'finance', '基金', '股票', '赚钱', 'money'],
  gaming: ['游戏', '电竞', 'gaming', 'game', '手游', '主播', 'esports'],
  car: ['汽车', '车', 'car', '驾驶', 'driving', '试驾', 'auto'],
  home: ['家居', '装修', 'home', 'interior', '收纳', '布置', 'decor'],
  book: ['读书', '书单', 'book', 'reading', '书评', '图书'],
  health: ['健康', '养生', 'health', '医学', '中医', 'wellness'],
  art: ['绘画', '画画', 'art', 'drawing', '插画', 'illustration', '艺术'],
  outdoor: ['户外', '露营', 'outdoor', 'camping', '徒步', 'hiking'],
  couple: ['情侣', '恋爱', 'couple', '约会', 'dating', '甜蜜'],
  workplace: ['职场', '工作', 'career', '面试', 'interview', '办公'],
  language: ['英语', '外语', 'english', 'language', '日语', '学英语'],
  comedy_skit: ['小品', '相声', '脱口秀', 'standup', 'talk show', '吐槽'],
};

// ---------------------------------------------------------------------------
// Public type definitions
// ---------------------------------------------------------------------------

/** Content category distribution (category slug to percentage 0-100). */
export type ContentDistribution = Map<string, number>;

/** Engagement metrics for a single content category. */
export interface CategoryEngagement {
  /** Category slug. */
  category: string;
  /** Number of posts in this category. */
  postCount: number;
  /** Mean engagement rate for posts in this category. */
  meanEngagementRate: number;
  /** Total engagement (likes + comments + shares + saves) in this category. */
  totalEngagement: number;
}

/** Overall engagement profile for a creator. */
export interface EngagementProfile {
  /** Mean engagement rate across all posts (0-1 scale). */
  overallRate: number;
  /** Median engagement rate (more robust to outliers). */
  medianRate: number;
  /** Per-category engagement breakdown, sorted by meanEngagementRate desc. */
  byCategory: CategoryEngagement[];
  /** Category with the highest mean engagement rate. */
  bestCategory: string | null;
  /** Category with the lowest mean engagement rate (among those with >= 2 posts). */
  worstCategory: string | null;
  /**
   * Engagement trend: positive = improving, negative = declining.
   * Computed via OLS linear regression on chronologically-ordered engagement rates.
   */
  trend: number;
  /** Whether the trend is statistically significant (p < 0.05). */
  trendReliable: boolean;
}

/** Publishing rhythm analysis. */
export interface RhythmAnalysis {
  /** Average number of posts per week. */
  postsPerWeek: number;
  /** Mean interval between consecutive posts in days. */
  meanIntervalDays: number;
  /**
   * Consistency score (0-100). Higher = more regular cadence.
   * Computed as 100 * (1 / (1 + coefficientOfVariation)).
   */
  consistencyScore: number;
  /**
   * Posting frequency distribution by hour-of-day (0-23).
   * Index = hour, value = number of posts.
   */
  hourDistribution: number[];
  /** The hour slot (0-23) with the most posts. */
  bestHour: number | null;
  /** The day-of-week (0=Sun, 6=Sat) with the most posts. */
  bestDayOfWeek: number | null;
}

/** Persona consistency score (content identity stability). */
export interface ConsistencyScore {
  /**
   * Score 0-100. Mean cosine similarity between sliding windows of
   * consecutive post-group category vectors.
   */
  score: number;
  /** Whether the creator has a stable topical identity. */
  isConsistent: boolean;
  /** The dominant category across all posts. */
  dominantCategory: string | null;
  /** Percentage of posts falling into the dominant category. */
  dominantCategoryPct: number;
}

/** Growth momentum classification. */
export type Momentum = 'accelerating' | 'steady' | 'decelerating' | 'insufficient_data';

/** Growth health assessment based on historical snapshots. */
export interface GrowthHealth {
  /** Follower growth rate (percentage change over available window). */
  followerGrowthRate: number;
  /** View growth rate (percentage change -- 0 when data unavailable). */
  viewGrowthRate: number;
  /** Whether the creator is accelerating, steady, or slowing down. */
  momentum: Momentum;
  /** Number of history snapshots used for the calculation. */
  dataPointsUsed: number;
}

/** A persona tag with confidence and supporting evidence. */
export interface PersonaTag {
  /** Human-readable tag label. */
  label: string;
  /** Machine-readable slug (lowercase, hyphens). */
  slug: string;
  /** Confidence level: 0-1. */
  confidence: number;
  /** Short evidence statement justifying the tag. */
  evidence: string;
}

/** Status of the persona scoring result. */
export type PersonaStatus = 'ok' | 'insufficient_data';

/** Complete persona score output. */
export interface PersonaScore {
  /** Whether the analysis was successful or data was insufficient. */
  status: PersonaStatus;
  /** Content category distribution. */
  contentDistribution: Record<string, number>;
  /** Engagement profile. */
  engagement: EngagementProfile;
  /** Publishing rhythm. */
  rhythm: RhythmAnalysis;
  /** Persona consistency. */
  consistency: ConsistencyScore;
  /** Growth health. */
  growthHealth: GrowthHealth;
  /** Generated persona tags. */
  tags: PersonaTag[];
  /** Number of posts analysed. */
  postsAnalysed: number;
}

// ---------------------------------------------------------------------------
// classifyContent
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Inverted index for O(P×T) classification (Twitter topic-social-proof pattern)
// ---------------------------------------------------------------------------

/**
 * Pre-built keyword → category[] inverted index.
 * Built once at module load. Lookup is O(1) per keyword instead of O(C×K) per post.
 * Source: Twitter/X topic-social-proof subsystem.
 */
const KEYWORD_INDEX: Map<string, string[]> = (() => {
  const index = new Map<string, string[]>();
  for (const [category, keywords] of Object.entries(CONTENT_CATEGORIES)) {
    for (const kw of keywords) {
      const existing = index.get(kw);
      if (existing) {
        existing.push(category);
      } else {
        index.set(kw, [category]);
      }
    }
  }
  return index;
})();

/**
 * Multi-label content classification using inverted index lookup.
 *
 * Twitter pattern: topic-social-proof — instead of iterating every post
 * against every category's keyword list (O(P×C×K)), we scan each post's
 * text against a pre-built keyword→category inverted index (O(P×T) where
 * T = text length). For 30 categories × 8 keywords = 240 comparisons/post
 * down to ~20 substring checks/post.
 *
 * Side effect: sets `post.contentType` to the best-matching category.
 *
 * @returns Category slug to percentage distribution.
 */
export function classifyContent(posts: Post[]): Map<string, number> {
  const categoryCounts = new Map<string, number>();
  let totalHits = 0;

  for (const post of posts) {
    const text = (
      post.desc +
      ' ' +
      (post.tags?.join(' ') ?? '')
    ).toLowerCase();

    // Track per-category hits for this post to find best match
    const postCatHits = new Map<string, number>();

    // Scan text against inverted index — O(K_total) where K_total = unique keywords
    for (const [keyword, categories] of KEYWORD_INDEX) {
      if (text.includes(keyword)) {
        for (const cat of categories) {
          const hits = (postCatHits.get(cat) ?? 0) + 1;
          postCatHits.set(cat, hits);
          categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
          totalHits++;
        }
      }
    }

    // Tag the post with its dominant category
    let bestCategory: string | null = null;
    let bestHits = 0;
    for (const [cat, hits] of postCatHits) {
      if (hits > bestHits) {
        bestHits = hits;
        bestCategory = cat;
      }
    }
    if (bestCategory) {
      post.contentType = bestCategory;
    }
  }

  // Convert to percentage distribution
  const distribution = new Map<string, number>();
  if (totalHits > 0) {
    for (const [cat, count] of categoryCounts) {
      distribution.set(cat, (count / totalHits) * 100);
    }
  }

  return distribution;
}

// ---------------------------------------------------------------------------
// Post quality scoring
// ---------------------------------------------------------------------------

/**
 * Compute a 0-1 quality score for a post based on observable signals.
 * Low-quality posts are down-weighted (not removed) in engagement analysis.
 */
function postQualityScore(post: Post): number {
  let score = 1.0;

  // Text length penalty: very short descriptions suggest low effort
  const descLen = post.desc?.length ?? 0;
  if (descLen < 5) score *= 0.3;
  else if (descLen < 20) score *= 0.7;

  // Zero-engagement penalty: if views > 0 but no engagement at all
  if (post.views > 100 && post.likes === 0 && post.comments === 0) {
    score *= 0.5;
  }

  // Engagement ratio sanity check: impossibly high ratios suggest bot activity
  if (post.views > 0) {
    const engRate = (post.likes + post.comments + post.shares) / post.views;
    if (engRate > 0.5) score *= 0.6; // > 50% engagement rate is suspicious
  }

  return score;
}

// Expose for testing
export { postQualityScore as _postQualityScore };

// ---------------------------------------------------------------------------
// computeEngagementProfile
// ---------------------------------------------------------------------------

/**
 * Compute per-post engagement rates and derive the overall engagement
 * profile, including per-category breakdown and trend.
 *
 * Engagement rate = (likes + comments + shares + saves) / views.
 * Posts with 0 views are assigned an engagement rate of 0.
 * Each rate is multiplied by the post's quality score to down-weight
 * low-quality content without removing it entirely.
 */
export function computeEngagementProfile(posts: Post[]): EngagementProfile {
  if (posts.length === 0) {
    return {
      overallRate: 0,
      medianRate: 0,
      byCategory: [],
      bestCategory: null,
      worstCategory: null,
      trend: 0,
      trendReliable: false,
    };
  }

  // Per-post engagement rates — Twitter/Douyin weighted formula
  // Weights reflect signal strength: completion rate > comments > shares > saves > likes
  // Source: Twitter unified-user-actions signal taxonomy + Douyin 完播率 priority
  // Each rate is multiplied by the post's quality score to down-weight low-quality content.
  const rates = posts.map((p) => {
    if (p.views === 0) return 0;
    const baseEngagement =
      p.likes * 1.0 +
      p.comments * 5.0 +
      p.shares * 3.0 +
      p.saves * 2.0;
    // Douyin-specific signals (when available from extension/xlsx import)
    const completionBonus = (p.completionRate ?? 0) * 8.0 * p.views;
    const retentionBonus = (1 - (p.bounceRate ?? 1)) * 4.0 * p.views;
    const rawRate = (baseEngagement + completionBonus + retentionBonus) / p.views;
    return rawRate * postQualityScore(p);
  });

  const overallRate = rates.reduce((s, r) => s + r, 0) / rates.length;
  const sortedRates = [...rates].sort((a, b) => a - b);
  const medianRate =
    sortedRates.length % 2 === 0
      ? (sortedRates[sortedRates.length / 2 - 1] + sortedRates[sortedRates.length / 2]) / 2
      : sortedRates[Math.floor(sortedRates.length / 2)];

  // Per-category breakdown
  const categoryMap = new Map<
    string,
    { totalEng: number; totalViews: number; count: number }
  >();
  for (const post of posts) {
    const cat = post.contentType ?? 'uncategorised';
    const entry = categoryMap.get(cat) ?? { totalEng: 0, totalViews: 0, count: 0 };
    entry.totalEng += post.likes + post.comments + post.shares + post.saves;
    entry.totalViews += post.views;
    entry.count++;
    categoryMap.set(cat, entry);
  }

  const byCategory: CategoryEngagement[] = [];
  for (const [category, data] of categoryMap) {
    byCategory.push({
      category,
      postCount: data.count,
      meanEngagementRate: data.totalViews > 0 ? data.totalEng / data.totalViews : 0,
      totalEngagement: data.totalEng,
    });
  }
  byCategory.sort((a, b) => b.meanEngagementRate - a.meanEngagementRate);

  const bestCategory = byCategory.length > 0 ? byCategory[0].category : null;
  const qualifiedWorst = byCategory.filter((c) => c.postCount >= 2);
  const worstCategory =
    qualifiedWorst.length > 0
      ? qualifiedWorst[qualifiedWorst.length - 1].category
      : null;

  // OLS regression with significance testing
  // Reverse rates so index 0 = oldest (regression expects chronological order)
  const chronologicalRates = [...rates].reverse();
  const trendResult = safeTrend(chronologicalRates);
  const trend = trendResult?.slope ?? 0;
  const trendReliable = trendResult?.significant ?? false;

  return {
    overallRate,
    medianRate,
    byCategory,
    bestCategory,
    worstCategory,
    trend,
    trendReliable,
  };
}

// ---------------------------------------------------------------------------
// computeRhythm
// ---------------------------------------------------------------------------

/**
 * Analyse the publishing cadence of a creator.
 *
 * Uses `post.publishedAt` timestamps to calculate:
 *  - Mean posting frequency (posts per week)
 *  - Mean and standard deviation of inter-post intervals
 *  - Consistency score (inverse of coefficient of variation)
 *  - Hour-of-day and day-of-week distribution
 */
export function computeRhythm(posts: Post[]): RhythmAnalysis {
  const empty: RhythmAnalysis = {
    postsPerWeek: 0,
    meanIntervalDays: 0,
    consistencyScore: 0,
    hourDistribution: new Array(24).fill(0),
    bestHour: null,
    bestDayOfWeek: null,
  };

  // Only consider posts with timestamps
  const dated = posts
    .filter((p) => p.publishedAt)
    .map((p) => ({ ...p, _ts: new Date(p.publishedAt!).getTime() }))
    .filter((p) => Number.isFinite(p._ts))
    .sort((a, b) => a._ts - b._ts);

  if (dated.length < 2) return empty;

  // Intervals between consecutive posts (in days)
  const intervals: number[] = [];
  for (let i = 1; i < dated.length; i++) {
    intervals.push((dated[i]._ts - dated[i - 1]._ts) / 86_400_000);
  }

  const meanInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length;
  const postsPerWeek = meanInterval > 0 ? 7 / meanInterval : 0;

  // Standard deviation of intervals
  const variance =
    intervals.reduce((s, v) => s + (v - meanInterval) ** 2, 0) / intervals.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation; capped to avoid division by near-zero
  const cv = meanInterval > 0.01 ? stdDev / meanInterval : 0;
  const consistencyScore = Math.round(100 * (1 / (1 + cv)));

  // Hour distribution
  const hourDistribution = new Array(24).fill(0) as number[];
  const dayDistribution = new Array(7).fill(0) as number[];
  for (const p of dated) {
    const d = new Date(p._ts);
    hourDistribution[d.getUTCHours()]++;
    dayDistribution[d.getUTCDay()]++;
  }

  const bestHour = hourDistribution.indexOf(Math.max(...hourDistribution));
  const bestDayOfWeek = dayDistribution.indexOf(Math.max(...dayDistribution));

  return {
    postsPerWeek: Math.round(postsPerWeek * 10) / 10,
    meanIntervalDays: Math.round(meanInterval * 10) / 10,
    consistencyScore,
    hourDistribution,
    bestHour,
    bestDayOfWeek,
  };
}

// ---------------------------------------------------------------------------
// computePersonaConsistency
// ---------------------------------------------------------------------------

/**
 * Measure how stable a creator's content identity is over time by computing
 * the mean cosine similarity of sliding windows over the content-category
 * vectors.
 *
 * Window size: 5 posts (configurable).
 * Each window is reduced to a vector of category counts. The score is
 * mean(cosine_similarity(window_i, window_i+1)) * 100.
 *
 * A score of 100 means every window has identical category mix;
 * a score near 0 means the creator frequently switches topics.
 */
export function computePersonaConsistency(
  posts: Post[],
  windowSize?: number,
): ConsistencyScore {
  // Auto-tune: scale window with dataset size (5 for 30 posts, 10 for 100, 20 for 200)
  const effectiveWindow = windowSize ?? Math.max(5, Math.ceil(posts.length / 10));
  const noData: ConsistencyScore = {
    score: 0,
    isConsistent: false,
    dominantCategory: null,
    dominantCategoryPct: 0,
  };

  if (posts.length < effectiveWindow) return noData;

  // Sparse sliding window: O(P) total instead of O(P × W × C)
  const vectors: Map<string, number>[] = [];
  const win = new Map<string, number>();

  // Build first window
  for (let j = 0; j < effectiveWindow; j++) {
    const cat = posts[j].contentType;
    if (cat) win.set(cat, (win.get(cat) ?? 0) + 1);
  }
  vectors.push(new Map(win));

  // Slide: remove outgoing, add incoming — O(1) per step
  for (let i = 1; i <= posts.length - effectiveWindow; i++) {
    const outCat = posts[i - 1].contentType;
    if (outCat) {
      const c = (win.get(outCat) ?? 1) - 1;
      if (c === 0) win.delete(outCat);
      else win.set(outCat, c);
    }
    const inCat = posts[i + effectiveWindow - 1].contentType;
    if (inCat) win.set(inCat, (win.get(inCat) ?? 0) + 1);
    vectors.push(new Map(win));
  }

  // Cosine similarity between consecutive window vectors
  const similarities: number[] = [];
  for (let i = 0; i < vectors.length - 1; i++) {
    similarities.push(cosineSimilarity(vectors[i], vectors[i + 1]));
  }

  const score =
    similarities.length > 0
      ? Math.round(
          (similarities.reduce((s, v) => s + v, 0) / similarities.length) * 100,
        )
      : 0;

  // Dominant category
  const catCounts = new Map<string, number>();
  for (const post of posts) {
    const cat = post.contentType ?? 'uncategorised';
    catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
  }
  let dominantCategory: string | null = null;
  let maxCount = 0;
  for (const [cat, count] of catCounts) {
    if (count > maxCount) {
      maxCount = count;
      dominantCategory = cat;
    }
  }
  const dominantCategoryPct =
    posts.length > 0 ? Math.round((maxCount / posts.length) * 100) : 0;

  return {
    score,
    isConsistent: score >= 60,
    dominantCategory,
    dominantCategoryPct,
  };
}

/**
 * Cosine similarity between two sparse category vectors.
 * Only iterates non-zero dimensions — O(k) where k = unique categories in use.
 */
function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const [k, v] of a) {
    magA += v * v;
    const bv = b.get(k);
    if (bv !== undefined) dot += v * bv;
  }
  for (const [, v] of b) {
    magB += v * v;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

// ---------------------------------------------------------------------------
// computeGrowthHealth
// ---------------------------------------------------------------------------

/**
 * Assess the growth trajectory of a creator using historical snapshots.
 *
 * Momentum is determined by comparing the growth rate of the first half
 * of the history window to the second half:
 *  - accelerating: second half rate >= 1.2x first half rate
 *  - decelerating: second half rate <= 0.8x first half rate
 *  - steady: everything else
 *  - insufficient_data: fewer than 3 snapshots
 */
export function computeGrowthHealth(profile: CreatorProfile): GrowthHealth {
  const noData: GrowthHealth = {
    followerGrowthRate: 0,
    viewGrowthRate: 0,
    momentum: 'insufficient_data',
    dataPointsUsed: 0,
  };

  const history = profile.history;
  if (!history || history.length < 2) return noData;

  const sorted = [...history].sort(
    (a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime(),
  );

  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];

  const followerGrowthRate =
    oldest.profile.followers > 0
      ? ((newest.profile.followers - oldest.profile.followers) /
          oldest.profile.followers) *
        100
      : 0;

  // Momentum: split history in half and compare follower growth rates
  let momentum: Momentum = 'insufficient_data';
  if (sorted.length >= 3) {
    const mid = Math.floor(sorted.length / 2);
    const firstHalfStart = sorted[0];
    const firstHalfEnd = sorted[mid];
    const secondHalfStart = sorted[mid];
    const secondHalfEnd = sorted[sorted.length - 1];

    const firstHalfGrowth =
      firstHalfStart.profile.followers > 0
        ? (firstHalfEnd.profile.followers - firstHalfStart.profile.followers) /
          firstHalfStart.profile.followers
        : 0;
    const secondHalfGrowth =
      secondHalfStart.profile.followers > 0
        ? (secondHalfEnd.profile.followers - secondHalfStart.profile.followers) /
          secondHalfStart.profile.followers
        : 0;

    if (firstHalfGrowth === 0 && secondHalfGrowth === 0) {
      momentum = 'steady';
    } else if (firstHalfGrowth === 0) {
      momentum = secondHalfGrowth > 0 ? 'accelerating' : 'decelerating';
    } else {
      const ratio = secondHalfGrowth / firstHalfGrowth;
      if (ratio >= 1.2) momentum = 'accelerating';
      else if (ratio <= 0.8) momentum = 'decelerating';
      else momentum = 'steady';
    }
  }

  return {
    followerGrowthRate: Math.round(followerGrowthRate * 10) / 10,
    viewGrowthRate: 0, // per-post views unavailable in history snapshots
    momentum,
    dataPointsUsed: sorted.length,
  };
}

// ---------------------------------------------------------------------------
// generatePersonaTags
// ---------------------------------------------------------------------------

/**
 * Generate human-readable persona tags from a completed {@link PersonaScore}.
 *
 * Tags are rule-based with explicit confidence levels and evidence text.
 * The function returns at most 8 tags, sorted by confidence descending.
 */
export function generatePersonaTags(score: PersonaScore): PersonaTag[] {
  const tags: PersonaTag[] = [];

  // --- Content niche specialist ---
  if (
    score.consistency.dominantCategory &&
    score.consistency.dominantCategoryPct >= 40
  ) {
    tags.push({
      label: t('engine.tags.specialist', { category: t(`engine.category.${score.consistency.dominantCategory}`) }),
      slug: `${score.consistency.dominantCategory}-specialist`,
      confidence: Math.min(score.consistency.dominantCategoryPct / 100, 0.95),
      evidence: `${score.consistency.dominantCategoryPct}% of posts are ${score.consistency.dominantCategory} content`,
    });
  }

  // --- High engagement ---
  if (score.engagement.overallRate >= 0.08) {
    tags.push({
      label: t('engine.tags.highEngagement'),
      slug: 'high-engagement',
      confidence: Math.min(0.5 + score.engagement.overallRate * 3, 0.95),
      evidence: `Overall engagement rate of ${(score.engagement.overallRate * 100).toFixed(1)}% is well above average`,
    });
  }

  // --- Engagement rising ---
  if (score.engagement.trend > 0.005) {
    tags.push({
      label: t('engine.tags.engagementRising'),
      slug: 'engagement-rising',
      confidence: Math.min(0.5 + score.engagement.trend * 20, 0.9),
      evidence: `Engagement trend is +${(score.engagement.trend * 100).toFixed(2)}pp (newer vs older posts)`,
    });
  }

  // --- Engagement declining ---
  if (score.engagement.trend < -0.005) {
    tags.push({
      label: t('engine.tags.engagementDeclining'),
      slug: 'engagement-declining',
      confidence: Math.min(0.5 + Math.abs(score.engagement.trend) * 20, 0.9),
      evidence: `Engagement trend is ${(score.engagement.trend * 100).toFixed(2)}pp (newer vs older posts)`,
    });
  }

  // --- Consistent identity ---
  if (score.consistency.isConsistent && score.consistency.score >= 70) {
    tags.push({
      label: t('engine.tags.consistentIdentity'),
      slug: 'consistent-identity',
      confidence: score.consistency.score / 100,
      evidence: `Persona consistency score of ${score.consistency.score}/100 indicates stable topical focus`,
    });
  }

  // --- Content explorer (low consistency) ---
  if (!score.consistency.isConsistent && score.consistency.score < 40 && score.postsAnalysed >= 10) {
    tags.push({
      label: t('engine.tags.contentExplorer'),
      slug: 'content-explorer',
      confidence: Math.min(0.9 - score.consistency.score / 100, 0.85),
      evidence: `Consistency score of ${score.consistency.score}/100 shows diverse topic coverage`,
    });
  }

  // --- Prolific publisher ---
  if (score.rhythm.postsPerWeek >= 5) {
    tags.push({
      label: t('engine.tags.prolificPublisher'),
      slug: 'prolific-publisher',
      confidence: Math.min(score.rhythm.postsPerWeek / 10, 0.9),
      evidence: `Publishing ${score.rhythm.postsPerWeek} posts per week`,
    });
  }

  // --- Clockwork rhythm ---
  if (score.rhythm.consistencyScore >= 75) {
    tags.push({
      label: t('engine.tags.clockworkRhythm'),
      slug: 'clockwork-rhythm',
      confidence: score.rhythm.consistencyScore / 100,
      evidence: `Publishing consistency score of ${score.rhythm.consistencyScore}/100`,
    });
  }

  // --- Growth rocket ---
  if (score.growthHealth.momentum === 'accelerating') {
    tags.push({
      label: t('engine.tags.growthRocket'),
      slug: 'growth-rocket',
      confidence: 0.75,
      evidence: `Follower growth is accelerating (${score.growthHealth.followerGrowthRate}% over the tracked window)`,
    });
  }

  // --- Plateau alert ---
  if (score.growthHealth.momentum === 'decelerating' && score.growthHealth.followerGrowthRate < 5) {
    tags.push({
      label: t('engine.tags.plateauAlert'),
      slug: 'plateau-alert',
      confidence: 0.7,
      evidence: `Growth is decelerating with only ${score.growthHealth.followerGrowthRate}% follower change`,
    });
  }

  // --- Viral potential (high variance in views) ---
  if (score.postsAnalysed >= 5 && score.engagement.byCategory.length > 0) {
    const bestCat = score.engagement.byCategory[0];
    if (bestCat.meanEngagementRate >= 0.15 && bestCat.postCount >= 2) {
      tags.push({
        label: t('engine.tags.viralPotential'),
        slug: 'viral-potential',
        confidence: Math.min(bestCat.meanEngagementRate * 3, 0.85),
        evidence: `${capitalise(bestCat.category)} content achieves ${(bestCat.meanEngagementRate * 100).toFixed(1)}% engagement`,
      });
    }
  }

  // Sort by confidence descending, cap at 8 tags
  tags.sort((a, b) => b.confidence - a.confidence);
  return tags.slice(0, 8);
}

/** Capitalise the first letter of a string. */
function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Compute a composite "overall" persona score (0-100).
 *
 * Weighted blend of engagement, rhythm, consistency, and growth momentum.
 * Returns 0 when all inputs are zero (avoids NaN).
 */
export function overallScore(score: PersonaScore): number {
  const engagementPart = Math.min(score.engagement.overallRate * 100 * 5, 100);
  const rhythmPart = score.rhythm.consistencyScore;
  const consistencyPart = score.consistency.score;
  const growthPart =
    score.growthHealth.momentum === 'accelerating'
      ? 80
      : score.growthHealth.momentum === 'steady'
        ? 60
        : score.growthHealth.momentum === 'decelerating'
          ? 30
          : 0;

  const raw =
    engagementPart * 0.3 +
    rhythmPart * 0.2 +
    consistencyPart * 0.25 +
    growthPart * 0.25;

  // Guard: if every component is 0 the weighted sum is 0, but protect
  // against any future NaN path.
  if (!Number.isFinite(raw)) return 0;

  return Math.round(raw);
}

// ---------------------------------------------------------------------------
// computePersonaScore
// ---------------------------------------------------------------------------

/**
 * Main entry point -- orchestrates all sub-analyses to produce a complete
 * {@link PersonaScore}.
 *
 * **Degenerate input guard**: if the profile has 0 posts or all posts have
 * 0 views, the function returns a result with `status: 'insufficient_data'`
 * and zeroed-out metrics.
 *
 * @param profile  A validated {@link CreatorProfile}.
 * @returns Complete persona score with all sub-analyses populated.
 */
export function computePersonaScore(profile: CreatorProfile): PersonaScore {
  const posts = profile.posts;

  // Degenerate input guard
  const allZeroViews = posts.length === 0 || posts.every((p) => p.views === 0);
  if (allZeroViews) {
    const emptyScore: PersonaScore = {
      status: 'insufficient_data',
      contentDistribution: {},
      engagement: {
        overallRate: 0,
        medianRate: 0,
        byCategory: [],
        bestCategory: null,
        worstCategory: null,
        trend: 0,
        trendReliable: false,
      },
      rhythm: {
        postsPerWeek: 0,
        meanIntervalDays: 0,
        consistencyScore: 0,
        hourDistribution: new Array(24).fill(0),
        bestHour: null,
        bestDayOfWeek: null,
      },
      consistency: {
        score: 0,
        isConsistent: false,
        dominantCategory: null,
        dominantCategoryPct: 0,
      },
      growthHealth: {
        followerGrowthRate: 0,
        viewGrowthRate: 0,
        momentum: 'insufficient_data',
        dataPointsUsed: 0,
      },
      tags: [],
      postsAnalysed: 0,
    };
    return emptyScore;
  }

  // Step 1: Classify content (mutates posts with contentType)
  const distribution = classifyContent(posts);

  // Step 2: Engagement profile
  const engagement = computeEngagementProfile(posts);

  // Step 3: Publishing rhythm
  const rhythm = computeRhythm(posts);

  // Step 4: Persona consistency
  const consistency = computePersonaConsistency(posts);

  // Step 5: Growth health
  const growthHealth = computeGrowthHealth(profile);

  // Convert Map to plain object for serialisation
  const contentDistribution: Record<string, number> = {};
  for (const [cat, pct] of distribution) {
    contentDistribution[cat] = Math.round(pct * 10) / 10;
  }

  // Build partial score (without tags -- tags depend on the score itself)
  const partialScore: PersonaScore = {
    status: 'ok',
    contentDistribution,
    engagement,
    rhythm,
    consistency,
    growthHealth,
    tags: [],
    postsAnalysed: posts.length,
  };

  // Step 6: Generate persona tags
  partialScore.tags = generatePersonaTags(partialScore);

  return partialScore;
}

/**
 * Memoized version of computePersonaScore — same input profile
 * (by content hash) returns cached result without recomputing.
 */
export const computePersonaScoreCached = memoize(computePersonaScore);
