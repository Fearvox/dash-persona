/**
 * NextContentEngine — deterministic next-post recommendation engine.
 *
 * Combines the user's {@link PersonaScore} with a {@link TrendingCollection}
 * and optional {@link ContentAnalysisResult} to generate up to 7 specific
 * content creation suggestions ranked by confidence.
 *
 * All logic is pure and rule-based — no LLM calls, no network access.
 * Same inputs always produce the same outputs (modulo wall-clock timestamp).
 *
 * @module engine/next-content
 */

import type { PersonaScore } from './persona';
import type { Post } from '../schema/creator-data';
import type {
  TrendingCollection,
  TrendingPost,
  TrendingTopic,
} from '../collectors/trending-collector';
import type { ContentAnalysisResult } from './content-analyzer';
import { rankNormalize, recalibrateSteps } from './stats';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A single content recommendation. */
export interface NextContentSuggestion {
  /** Deterministic unique identifier: `next-{rule}-{platform}-{timestamp}`. */
  id: string;

  /** Importance ranking for UI display. */
  priority: 'high' | 'medium' | 'low';

  /** Aggregate confidence score (0-100). Average of the 4 scoring dimensions. */
  confidence: number;

  // -- What to create --

  /** The broad subject of the recommended post. */
  topic: string;

  /**
   * The specific creative angle — differentiates this suggestion from
   * generic advice about the topic.
   */
  angle: string;

  /** Recommended content format. */
  format: 'video' | 'image' | 'carousel';

  /** Suggested video duration in seconds. Only present when `format === 'video'`. */
  suggestedDuration?: number;

  // -- How to write it --

  /** 2-3 alternative opening hooks, ready to paste. */
  hooks: string[];

  /** Suggested caption structure: hook + body + hashtags + CTA. */
  copyTemplate: string;

  /** Hashtags ranked by relevance, capped at 10. */
  hashtags: string[];

  // -- When to post --

  timing: {
    /** Best hour to publish (0-23 UTC). */
    bestHour: number;
    /** Best day name (e.g. "Tuesday"). */
    bestDay: string;
    /** Human-readable explanation of the timing choice. */
    reasoning: string;
  };

  // -- Why this works --

  reference: {
    /** URL of the trending post this suggestion is based on. */
    trendingPostUrl: string;
    /** Title of the trending post. */
    trendingPostTitle: string;
    /** Short explanation of what makes that post work. */
    whyItWorks: string;
    /** Engagement data from the reference post. */
    engagementData: { likes: number; views: number };
  };

  // -- Scoring breakdown --

  scoring: {
    /** How well this topic aligns with current trends (0-100). */
    trendAlignment: number;
    /** How relevant this is to the user's established niche (0-100). */
    nicheRelevance: number;
    /** How underrepresented this topic is in the user's existing content (0-100). */
    gapOpportunity: number;
    /** Projected engagement based on reference post performance (0-100). */
    engagementPotential: number;
  };

  /** Rule slug that generated this suggestion (for deduplication and analytics). */
  rule: string;
}

/** Output of a full {@link generateNextContent} run. */
export interface NextContentResult {
  /** Up to 7 suggestions sorted by confidence descending. */
  suggestions: NextContentSuggestion[];

  /** ISO-8601 timestamp of generation. */
  generatedAt: string;

  /** Lightweight summary of inputs used. */
  inputSummary: {
    /** Persona tags from the user's score. */
    personaTags: string[];
    /** Total trending posts analysed. */
    trendingPostsAnalyzed: number;
    /** Top content categories detected from the user's niche. */
    topCategories: string[];
  };
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** Peak posting hours keyed by platform when rhythm data is insufficient. */
const PLATFORM_PEAK_HOURS: Record<string, number[]> = {
  douyin: [12, 18, 21],
  tiktok: [10, 15, 20],
  xhs: [12, 19, 22],
};

function dayName(index: number): string {
  return t(`engine.nextContent.dayNames.${index}`);
}

/** Minimum keyword overlap for Rule 1 to fire. */
const MIN_KEYWORD_OVERLAP = 1;

/** Overlap threshold for high-priority classification. */
const HIGH_PRIORITY_OVERLAP = 3;

/** Minimum engagement-rate multiplier to trigger Rule 3 (viral). */
const VIRAL_MULTIPLIER = 5;

/** Number of suggestions to emit at most. */
const MAX_SUGGESTIONS = 7;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Capitalise the first letter of a string. */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Clamp a value to [0, 100]. */
function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/**
 * Compute per-post engagement rate using a simple uniform-weight formula.
 * Keeps the engine independent of the persona engine's weighted variant.
 */
function engagementRate(post: { likes: number; comments: number; shares: number; saves: number; views: number }): number {
  if (post.views === 0) return 0;
  return (post.likes + post.comments + post.shares + post.saves) / post.views;
}

/**
 * Derive the mean engagement rate across a collection of trending posts.
 * Returns 0 when the collection is empty.
 */
function meanEngagementRate(posts: TrendingPost[]): number {
  if (posts.length === 0) return 0;
  return posts.reduce((sum, p) => sum + engagementRate(p), 0) / posts.length;
}

/**
 * Extract lowercase keywords from a trending post's title and hashtags.
 * Used for niche-keyword overlap detection.
 */
function postKeywords(post: TrendingPost): string[] {
  const words = (post.title + ' ' + post.hashtags.join(' '))
    .toLowerCase()
    .split(/[\s#，。！？、]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
  return [...new Set(words)];
}

/**
 * Extract lowercase keywords from a trending topic's keyword and related hashtags.
 */
function topicKeywords(topic: TrendingTopic): string[] {
  const words = (topic.keyword + ' ' + topic.relatedHashtags.join(' '))
    .toLowerCase()
    .split(/[\s#，。！？、]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
  return [...new Set(words)];
}

/**
 * Resolve the user's top content categories from the persona score.
 * Returns at most 5 categories sorted by distribution percentage descending.
 */
function topUserCategories(personaScore: PersonaScore): string[] {
  return Object.entries(personaScore.contentDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat);
}

/**
 * Count keyword overlap between a list of post-side keywords and the user's
 * category names (as a proxy for niche keywords).
 */
function countOverlap(postKws: string[], userCategories: string[]): number {
  const categorySet = new Set(userCategories.map((c) => c.toLowerCase()));
  return postKws.filter((kw) => categorySet.has(kw) || userCategories.some((cat) => kw.includes(cat) || cat.includes(kw))).length;
}

/**
 * Derive timing suggestion from persona rhythm, with platform-specific defaults.
 */
function buildTiming(
  personaScore: PersonaScore,
  platform: string,
): NextContentSuggestion['timing'] {
  const { bestHour, bestDayOfWeek } = personaScore.rhythm;

  if (bestHour !== null && bestDayOfWeek !== null) {
    return {
      bestHour,
      bestDay: dayName(bestDayOfWeek),
      reasoning: t('engine.nextContent.timingPersonal', {
        day: dayName(bestDayOfWeek),
        hour: String(bestHour),
      }),
    };
  }

  // Fall back to platform defaults
  const peakHours = PLATFORM_PEAK_HOURS[platform.toLowerCase()] ?? PLATFORM_PEAK_HOURS.tiktok;
  const hour = peakHours[1]; // Pick the mid-peak
  return {
    bestHour: hour,
    bestDay: dayName(2), // Tuesday — common mid-week engagement peak
    reasoning: t('engine.nextContent.timingPlatform', {
      platform: t('platform.' + platform),
      hours: peakHours.join(':00, ') + ':00',
    }),
  };
}

/**
 * Generate 2-3 alternative opening hooks for a given topic.
 *
 * Pulls from analysis.copy.hookPatterns when available and adapts the
 * templates to the suggested topic. Falls back to generic templates.
 */
function buildHooks(topic: string, analysis: ContentAnalysisResult | null): string[] {
  const hooks: string[] = [];

  if (analysis && analysis.copy.hookPatterns.length > 0) {
    for (const hp of analysis.copy.hookPatterns.slice(0, 3)) {
      // Use the example as a hook, substituting the topic where possible
      const hook = hp.example
        ? hp.example.slice(0, 60)
        : `[${hp.pattern}] ${topic}`;
      hooks.push(hook);
    }
  }

  // Always ensure at least 3 hooks using fallback templates
  const fallbacks = [
    `你真的了解${topic}吗？看完这个你会改变想法`,
    `关于${topic}，90%的人都做错了`,
    `${topic}的正确打开方式——${new Date().getFullYear()}最新版`,
    `How to master ${topic} (most people skip this step)`,
    `${cap(topic)}: the one thing nobody tells you`,
  ];

  for (const fb of fallbacks) {
    if (hooks.length >= 3) break;
    if (!hooks.includes(fb)) hooks.push(fb);
  }

  return hooks.slice(0, 3);
}

/**
 * Build a copy template string from analysis patterns.
 */
function buildCopyTemplate(
  hooks: string[],
  hashtags: string[],
  analysis: ContentAnalysisResult | null,
): string {
  const hasCta = analysis ? analysis.copy.ctaPatterns.length > 0 : false;
  const ctaPart = hasCta ? '\n\n[关注 / 收藏 / 双击支持]' : '\n\n[Optional CTA]';
  const hashtagPart = hashtags.map((h) => `#${h}`).join(' ');

  return `[Hook] ${hooks[0]}\n\n[Main content: describe your ${hooks[0].split(' ')[0]} process, insight, or story in 3-5 lines]\n\n${hashtagPart}${ctaPart}`;
}

/**
 * Merge and deduplicate two hashtag arrays, keeping the first list's order
 * and appending unique items from the second. Caps output at `limit`.
 */
function mergeHashtags(primary: string[], secondary: string[], limit = 10): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const h of [...primary, ...secondary]) {
    const norm = h.toLowerCase().replace(/^#/, '');
    if (!seen.has(norm)) {
      seen.add(norm);
      result.push(norm);
    }
    if (result.length >= limit) break;
  }
  return result;
}

/**
 * Derive the user's approximate format usage from existing posts.
 * Returns { video, image, carousel } as fractions (0-1).
 */
function userFormatRatios(existingPosts: Post[]): { video: number; image: number; carousel: number } {
  if (existingPosts.length === 0) return { video: 0.33, image: 0.33, carousel: 0.34 };

  let video = 0;
  let carousel = 0;
  for (const p of existingPosts) {
    const ct = (p.contentType ?? '').toLowerCase();
    if (ct === 'video') video++;
    else if (ct === 'carousel') carousel++;
  }
  const image = existingPosts.length - video - carousel;
  const total = existingPosts.length;
  return {
    video: video / total,
    image: image / total,
    carousel: carousel / total,
  };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

/**
 * Compute the 4-dimensional scoring breakdown for a suggestion.
 *
 * - `trendAlignment`:      Based on the reference post/topic's heat and recency.
 * - `nicheRelevance`:      Keyword overlap with the user's content categories.
 * - `gapOpportunity`:      Inverse of how often the user already posts this content.
 * - `engagementPotential`: Reference post engagement relative to corpus average.
 */
function calculateScoring(
  ref: TrendingPost | TrendingTopic,
  personaScore: PersonaScore,
  analysis: ContentAnalysisResult | null,
  overlapCount: number,
  userCategoryPct: number,
): NextContentSuggestion['scoring'] {
  // --- trendAlignment ---
  // For TrendingPost: ER relative to a notional 2% baseline; cap at 100.
  // For TrendingTopic: use the heat score directly.
  let trendAlignment: number;
  if ('heat' in ref) {
    trendAlignment = ref.heat;
  } else {
    const postEr = engagementRate(ref);
    trendAlignment = clamp100(postEr * 1000); // 0.1 ER => 100
  }

  // --- nicheRelevance ---
  // Overlap count mapped to 0-100. 1 overlap = 25, 2 = 50, 3 = 75, 4+ = 95.
  const NICHE_STEPS = [0, 25, 50, 75, 95];
  let nicheRelevance = clamp100(Math.min(overlapCount * 25, 95));
  nicheRelevance = recalibrateSteps(nicheRelevance, NICHE_STEPS);

  // --- gapOpportunity ---
  // User already posts this category at `userCategoryPct` (0-100).
  // gapOpportunity = 100 - userCategoryPct (creator posts it 0% => max gap).
  const gapOpportunity = clamp100(100 - userCategoryPct);

  // --- engagementPotential ---
  // Compare reference post ER to user's own engagement baseline.
  const userBaseEr = personaScore.engagement.overallRate; // 0-1 scale
  let refEr: number;
  if ('heat' in ref) {
    // Topic: use heat as proxy (already 0-100, convert to 0-1 scale)
    refEr = ref.heat / 100;
  } else {
    refEr = engagementRate(ref);
  }

  let engagementPotential: number;
  if (userBaseEr > 0) {
    // How many times better than user's average?
    engagementPotential = clamp100((refEr / userBaseEr) * 20);
  } else {
    // No user baseline: use absolute ER metric
    engagementPotential = clamp100(refEr * 500);
  }

  // Analysis bonus: if analysis reveals high-frequency hook patterns, boost potential
  if (analysis && analysis.copy.hookPatterns.length > 0) {
    const topHookFrequency = analysis.copy.hookPatterns[0].frequency;
    if (topHookFrequency > 0.5) {
      engagementPotential = clamp100(engagementPotential + 10);
    }
  }

  return {
    trendAlignment,
    nicheRelevance,
    gapOpportunity,
    engagementPotential,
  };
}

/** Compute confidence (0-100) as the mean of the 4 scoring dimensions. */
function scoreToConfidence(scoring: NextContentSuggestion['scoring']): number {
  return Math.round(
    (scoring.trendAlignment + scoring.nicheRelevance + scoring.gapOpportunity + scoring.engagementPotential) / 4,
  );
}

/** Map confidence level to a priority label. */
function confidenceToPriority(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 65) return 'high';
  if (confidence >= 40) return 'medium';
  return 'low';
}

// ---------------------------------------------------------------------------
// Generation rules
// ---------------------------------------------------------------------------

/**
 * Rule 1: Trend + Niche Match.
 *
 * Find trending posts whose hashtags/keywords overlap with the user's
 * top content categories. Generate an adaptation suggestion.
 */
function ruleNicheMatch(
  personaScore: PersonaScore,
  trending: TrendingCollection,
  analysis: ContentAnalysisResult | null,
  existingPosts: Post[],
  ts: number,
): NextContentSuggestion | null {
  const userCategories = topUserCategories(personaScore);
  if (userCategories.length === 0) return null;

  let bestPost: TrendingPost | null = null;
  let bestOverlap = 0;

  for (const post of trending.posts) {
    const kws = postKeywords(post);
    const overlap = countOverlap(kws, userCategories);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestPost = post;
    }
  }

  if (!bestPost || bestOverlap < MIN_KEYWORD_OVERLAP) return null;

  const topic = bestPost.title.slice(0, 50) || userCategories[0];
  const angle = `Adapt the trending "${bestPost.title.slice(0, 30)}" angle to your ${userCategories[0]} niche`;
  const hashtags = mergeHashtags(bestPost.hashtags, userCategories, 10);
  const hooks = buildHooks(topic, analysis);

  const userCategoryPct = personaScore.contentDistribution[userCategories[0]] ?? 0;
  const scoring = calculateScoring(bestPost, personaScore, analysis, bestOverlap, userCategoryPct);
  const confidence = scoreToConfidence(scoring);

  // Override priority based on overlap count
  const priority = bestOverlap >= HIGH_PRIORITY_OVERLAP ? 'high' : confidenceToPriority(confidence);

  return {
    id: `next-1-${trending.platform}-${ts}`,
    priority,
    confidence,
    topic,
    angle,
    format: bestPost.contentType === 'video' ? 'video' : bestPost.contentType === 'image' ? 'image' : 'carousel',
    suggestedDuration: bestPost.contentType === 'video' ? 60 : undefined,
    hooks,
    copyTemplate: buildCopyTemplate(hooks, hashtags, analysis),
    hashtags,
    timing: buildTiming(personaScore, trending.platform),
    reference: {
      trendingPostUrl: bestPost.url,
      trendingPostTitle: bestPost.title,
      whyItWorks: `This post overlaps with your niche on ${bestOverlap} keyword(s), indicating direct audience relevance.`,
      engagementData: { likes: bestPost.likes, views: bestPost.views },
    },
    scoring,
    rule: 'niche-match',
  };
}

/**
 * Rule 2: Content Gap Fill.
 *
 * If trending posts show a format the user rarely uses but which performs
 * better, suggest switching to that format.
 */
function ruleContentGapFill(
  personaScore: PersonaScore,
  trending: TrendingCollection,
  analysis: ContentAnalysisResult | null,
  existingPosts: Post[],
  ts: number,
): NextContentSuggestion | null {
  const userRatios = userFormatRatios(existingPosts);

  // Count format distribution in trending posts
  const trendingVideoCount = trending.posts.filter((p) => p.contentType === 'video').length;
  const trendingTotal = trending.posts.length;
  if (trendingTotal === 0) return null;

  const trendVideoRatio = trendingVideoCount / trendingTotal;

  // Identify the gap: user's video ratio vs trending video ratio
  const userVideoRatio = userRatios.video;
  const videoDelta = trendVideoRatio - userVideoRatio;

  // Only fire if video is 20%+ more prevalent in trending than in user's content
  if (videoDelta < 0.2) return null;

  // Find the best-performing trending video
  const trendingVideos = trending.posts
    .filter((p) => p.contentType === 'video')
    .sort((a, b) => engagementRate(b) - engagementRate(a));

  if (trendingVideos.length === 0) return null;

  const refPost = trendingVideos[0];
  const userCategories = topUserCategories(personaScore);
  const topic = userCategories[0] ?? 'your niche';
  const angle = `Switch to video format for your ${topic} content — trending videos get ${(videoDelta * 100).toFixed(0)}% more share than images in this niche right now`;

  const hashtags = mergeHashtags(refPost.hashtags, userCategories, 10);
  const hooks = buildHooks(topic, analysis);

  const scoring = calculateScoring(
    refPost,
    personaScore,
    analysis,
    countOverlap(postKeywords(refPost), userCategories),
    personaScore.contentDistribution[topic] ?? 0,
  );
  // Boost gap opportunity: user rarely uses this format
  scoring.gapOpportunity = clamp100(scoring.gapOpportunity + (videoDelta * 100));
  const confidence = scoreToConfidence(scoring);

  return {
    id: `next-2-${trending.platform}-${ts}`,
    priority: 'medium',
    confidence,
    topic,
    angle,
    format: 'video',
    suggestedDuration: 60,
    hooks,
    copyTemplate: buildCopyTemplate(hooks, hashtags, analysis),
    hashtags,
    timing: buildTiming(personaScore, trending.platform),
    reference: {
      trendingPostUrl: refPost.url,
      trendingPostTitle: refPost.title,
      whyItWorks: `Trending videos in your niche make up ${(trendVideoRatio * 100).toFixed(0)}% of top posts vs only ${(userVideoRatio * 100).toFixed(0)}% of your content.`,
      engagementData: { likes: refPost.likes, views: refPost.views },
    },
    scoring,
    rule: 'content-gap-fill',
  };
}

/**
 * Rule 3: Viral Pattern Replication.
 *
 * Find the top-performing trending post by engagement rate and suggest
 * replicating its structure with the user's niche content.
 */
function ruleViralReplication(
  personaScore: PersonaScore,
  trending: TrendingCollection,
  analysis: ContentAnalysisResult | null,
  existingPosts: Post[],
  ts: number,
): NextContentSuggestion | null {
  if (trending.posts.length === 0) return null;

  const avgEr = meanEngagementRate(trending.posts);
  const sorted = [...trending.posts].sort((a, b) => engagementRate(b) - engagementRate(a));
  const topPost = sorted[0];
  const topEr = engagementRate(topPost);

  // Only fire when top post is >5x above corpus average
  if (avgEr === 0 || topEr / avgEr < VIRAL_MULTIPLIER) return null;

  const userCategories = topUserCategories(personaScore);
  const topic = userCategories[0] ?? topPost.title.slice(0, 40);
  const angle = `Replicate the hook-and-format pattern of this viral post (${(topEr / avgEr).toFixed(1)}x avg ER) for your ${topic} content`;

  const hashtags = mergeHashtags(topPost.hashtags, userCategories, 10);
  const hooks = buildHooks(topic, analysis);

  const overlapCount = countOverlap(postKeywords(topPost), userCategories);
  const scoring = calculateScoring(
    topPost,
    personaScore,
    analysis,
    overlapCount,
    personaScore.contentDistribution[topic] ?? 0,
  );
  const confidence = scoreToConfidence(scoring);

  return {
    id: `next-3-${trending.platform}-${ts}`,
    priority: topEr / avgEr >= 5 ? 'high' : 'medium',
    confidence,
    topic,
    angle,
    format: topPost.contentType === 'video' ? 'video' : topPost.contentType === 'image' ? 'image' : 'carousel',
    suggestedDuration: topPost.contentType === 'video' ? 90 : undefined,
    hooks,
    copyTemplate: buildCopyTemplate(hooks, hashtags, analysis),
    hashtags,
    timing: buildTiming(personaScore, trending.platform),
    reference: {
      trendingPostUrl: topPost.url,
      trendingPostTitle: topPost.title,
      whyItWorks: `This post achieves ${(topEr / avgEr).toFixed(1)}x the corpus average engagement rate — its hook structure and hashtag strategy are worth replicating.`,
      engagementData: { likes: topPost.likes, views: topPost.views },
    },
    scoring,
    rule: 'viral-replication',
  };
}

/**
 * Rule 4: Hashtag Riding.
 *
 * Find 'rising' trending topics relevant to the user's niche and suggest
 * creating content specifically for those hashtags.
 */
function ruleHashtagRiding(
  personaScore: PersonaScore,
  trending: TrendingCollection,
  analysis: ContentAnalysisResult | null,
  existingPosts: Post[],
  ts: number,
): NextContentSuggestion | null {
  const userCategories = topUserCategories(personaScore);

  // Filter for rising topics only; prefer those with niche overlap
  const rising = trending.topics.filter((t) => t.trend === 'rising');
  if (rising.length === 0) return null;

  // Score each rising topic by overlap + heat
  let bestTopic: TrendingTopic | null = null;
  let bestScore = -1;

  for (const topic of rising) {
    const kws = topicKeywords(topic);
    const overlap = countOverlap(kws, userCategories);
    const score = overlap * 30 + topic.heat;
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  if (!bestTopic) return null;

  const topicLabel = bestTopic.keyword;
  const userNiche = userCategories[0] ?? 'your niche';
  const angle = `Jump on the rising #${topicLabel} trend — post ${userNiche} content with this hashtag while it's accelerating`;

  const combinedHashtags = mergeHashtags(
    [topicLabel, ...bestTopic.relatedHashtags],
    userCategories,
    10,
  );
  const hooks = buildHooks(topicLabel, analysis);

  // Find a reference post to link to (closest match from trending.posts)
  const refPost = trending.posts.find((p) =>
    p.hashtags.some((h) => h.toLowerCase() === topicLabel.toLowerCase()),
  ) ?? trending.posts[0];

  const overlapCount = countOverlap(topicKeywords(bestTopic), userCategories);
  const scoring = calculateScoring(
    bestTopic,
    personaScore,
    analysis,
    overlapCount,
    personaScore.contentDistribution[userNiche] ?? 0,
  );
  const confidence = scoreToConfidence(scoring);

  return {
    id: `next-4-${trending.platform}-${ts}`,
    priority: bestTopic.heat >= 70 ? 'high' : 'medium',
    confidence,
    topic: topicLabel,
    angle,
    format: 'video',
    suggestedDuration: 30,
    hooks,
    copyTemplate: buildCopyTemplate(hooks, combinedHashtags, analysis),
    hashtags: combinedHashtags,
    timing: buildTiming(personaScore, trending.platform),
    reference: {
      trendingPostUrl: refPost?.url ?? `https://${trending.platform}.com/search?q=${encodeURIComponent(topicLabel)}`,
      trendingPostTitle: refPost?.title ?? `Trending: #${topicLabel}`,
      whyItWorks: `#${topicLabel} is marked 'rising' with heat ${bestTopic.heat}/100. Early posts on rising topics capture organic discovery traffic before the hashtag peaks.`,
      engagementData: {
        likes: refPost?.likes ?? 0,
        views: refPost?.views ?? 0,
      },
    },
    scoring,
    rule: 'hashtag-riding',
  };
}

/**
 * Rule 5: Cross-Platform Transfer.
 *
 * When multiple trending collections are available (future: array input),
 * this rule operates on the single collection provided and checks whether
 * the platform's best-performing topic is already well-represented in the
 * user's existing post mix. If not, it recommends adapting it.
 *
 * With a single TrendingCollection the rule fires when: the top trending
 * topic by heat score has low presence in the user's post history,
 * implying the user hasn't yet transferred this platform's content style
 * to their own channel.
 */
function ruleCrossPlatformTransfer(
  personaScore: PersonaScore,
  trending: TrendingCollection,
  analysis: ContentAnalysisResult | null,
  existingPosts: Post[],
  ts: number,
): NextContentSuggestion | null {
  if (trending.topics.length === 0) return null;

  // Best topic on this platform by heat
  const topTopic = [...trending.topics].sort((a, b) => b.heat - a.heat)[0];
  const userCategories = topUserCategories(personaScore);

  // Check if user already posts about this topic
  const overlapCount = countOverlap(topicKeywords(topTopic), userCategories);

  // Only fire if overlap is low (user hasn't adopted this yet)
  if (overlapCount >= 2) return null;

  const angle = `Bring ${trending.platform}'s top trending topic (#${topTopic.keyword}, heat ${topTopic.heat}/100) to your channel — you're not currently posting about this`;
  const hashtags = mergeHashtags(
    [topTopic.keyword, ...topTopic.relatedHashtags],
    userCategories,
    10,
  );
  const hooks = buildHooks(topTopic.keyword, analysis);

  const refPost = trending.posts.find((p) =>
    p.hashtags.some((h) => h.toLowerCase().includes(topTopic.keyword.toLowerCase())),
  ) ?? trending.posts[0];

  const scoring = calculateScoring(
    topTopic,
    personaScore,
    analysis,
    overlapCount,
    personaScore.contentDistribution[userCategories[0]] ?? 0,
  );
  // Boost gap opportunity since user has low presence in this topic
  scoring.gapOpportunity = clamp100(scoring.gapOpportunity + 20);
  const confidence = scoreToConfidence(scoring);

  return {
    id: `next-5-${trending.platform}-${ts}`,
    priority: 'medium',
    confidence,
    topic: topTopic.keyword,
    angle,
    format: 'video',
    suggestedDuration: 60,
    hooks,
    copyTemplate: buildCopyTemplate(hooks, hashtags, analysis),
    hashtags,
    timing: buildTiming(personaScore, trending.platform),
    reference: {
      trendingPostUrl: refPost?.url ?? `https://${trending.platform}.com/search?q=${encodeURIComponent(topTopic.keyword)}`,
      trendingPostTitle: refPost?.title ?? `Trending: #${topTopic.keyword}`,
      whyItWorks: `#${topTopic.keyword} is ${trending.platform}'s top trending topic by heat (${topTopic.heat}/100) and you haven't yet posted about it — early-mover advantage is available.`,
      engagementData: {
        likes: refPost?.likes ?? 0,
        views: refPost?.views ?? 0,
      },
    },
    scoring,
    rule: 'cross-platform-transfer',
  };
}

/**
 * Rule 6: Audience Question Answer.
 *
 * Uses analysis.comments.questionPatterns and hotKeywords to surface
 * audience interest themes, then generates content that answers those questions.
 * Skipped when analysis is null.
 */
function ruleAudienceQuestion(
  personaScore: PersonaScore,
  trending: TrendingCollection,
  analysis: ContentAnalysisResult | null,
  existingPosts: Post[],
  ts: number,
): NextContentSuggestion | null {
  if (!analysis) return null;

  const { questionPatterns, hotKeywords } = analysis.comments;

  // Prefer explicit question patterns; fall back to top hot keywords
  const theme =
    questionPatterns.length > 0
      ? questionPatterns[0]
      : hotKeywords.length > 0
        ? hotKeywords[0].word
        : null;

  if (!theme) return null;

  const userCategories = topUserCategories(personaScore);
  const topic = theme;
  const angle = `Answer your audience's most common question: "${theme}" — this signals high demand from existing followers`;

  // Find a trending post that resonates with the theme
  const themeWords = theme.toLowerCase().split(/\s+/);
  const refPost =
    trending.posts.find((p) =>
      themeWords.some((w) => p.title.toLowerCase().includes(w) || p.hashtags.some((h) => h.includes(w))),
    ) ?? trending.posts[0];

  // Build hashtag list from analysis hashtagStrategy
  const analysisTopHashtags = analysis.copy.hashtagStrategy.topHashtags
    .slice(0, 5)
    .map((h) => h.tag);
  const hashtags = mergeHashtags(analysisTopHashtags, userCategories, 10);
  const hooks = buildHooks(topic, analysis);

  // Signal count for the best-matching theme
  const questionSignalCount = questionPatterns.length;
  const hotKeywordCount = hotKeywords.length > 0 ? hotKeywords[0].count : 1;

  // For scoring, use overall persona engagement as reference since this is audience-driven
  const scoring: NextContentSuggestion['scoring'] = {
    trendAlignment: clamp100(40 + Math.min(questionSignalCount * 5, 40)),
    nicheRelevance: clamp100(
      countOverlap(themeWords, userCategories) * 30 + 30,
    ),
    gapOpportunity: 65, // Answering audience questions is always a gap vs generic posts
    engagementPotential: clamp100(
      hotKeywords.length > 0
        ? Math.min((hotKeywordCount / Math.max(analysis.sampleSize, 1)) * 200, 80)
        : 50,
    ),
  };
  const confidence = scoreToConfidence(scoring);

  return {
    id: `next-6-${trending.platform}-${ts}`,
    priority: 'medium',
    confidence,
    topic,
    angle,
    format: 'video',
    suggestedDuration: 45,
    hooks,
    copyTemplate: buildCopyTemplate(hooks, hashtags, analysis),
    hashtags,
    timing: buildTiming(personaScore, trending.platform),
    reference: {
      trendingPostUrl: refPost?.url ?? '',
      trendingPostTitle: refPost?.title ?? 'Based on audience signal analysis',
      whyItWorks: `Audience theme "${theme}" appears in ${hotKeywordCount} posts. Answering common questions drives saves and repeat views.`,
      engagementData: {
        likes: refPost?.likes ?? 0,
        views: refPost?.views ?? 0,
      },
    },
    scoring,
    rule: 'audience-question',
  };
}

/**
 * Rule 7: Engagement Pattern Optimisation.
 *
 * Compares the user's current copy patterns against trending high-performers
 * and suggests the highest-ROI structural improvement.
 *
 * Firing conditions (first match wins):
 * - User's posts lack hooks but trending shows hooks get 2x engagement
 * - User rarely uses CTA but high performers always do
 * - User's hashtag count is below optimal (< 5)
 */
function ruleEngagementOptimisation(
  personaScore: PersonaScore,
  trending: TrendingCollection,
  analysis: ContentAnalysisResult | null,
  existingPosts: Post[],
  ts: number,
): NextContentSuggestion | null {
  if (!analysis) return null;

  const { hookPatterns, ctaPatterns, hashtagStrategy } = analysis.copy;
  const avgHashtagCount = hashtagStrategy.avgCount;
  const userCategories = topUserCategories(personaScore);

  // Identify the most impactful optimisation opportunity
  type OpType = 'hook' | 'cta' | 'hashtag';
  let opType: OpType | null = null;
  let angle = '';

  // Hook gap: top hooks have high frequency in analysis but user has low engagement
  // Use hookPatterns[0].frequency as a proxy for prevalence among top performers
  const hookBoost =
    hookPatterns.length > 0 && personaScore.engagement.overallRate > 0
      ? hookPatterns[0].frequency * 2 // frequency is 0-1; treat 1.0 => 2x signal
      : 0;

  // Question-hook prevalence from analysis (fraction of top posts using question hooks)
  const questionHookFrequency = hookPatterns.find((hp) => hp.pattern === 'question')?.frequency ?? 0;

  if (hookBoost >= 1 && questionHookFrequency < 0.2) {
    opType = 'hook';
    angle = `Add attention-grabbing hooks to your captions — top trending posts use the "${hookPatterns[0].pattern}" hook pattern at ${(hookPatterns[0].frequency * 100).toFixed(0)}% frequency`;
  } else if (ctaPatterns.length === 0) {
    opType = 'cta';
    angle = `Add a clear call-to-action to every post — top performers consistently include CTAs but your recent posts don't`;
  } else if (avgHashtagCount < 5) {
    opType = 'hashtag';
    angle = `Increase your hashtag count from an average of ${avgHashtagCount.toFixed(1)} to 5-8 — more targeted hashtags expand discovery reach`;
  }

  if (!opType) return null;

  // Pick the most relevant trending post as reference
  const refPost = trending.posts.length > 0
    ? [...trending.posts].sort((a, b) => engagementRate(b) - engagementRate(a))[0]
    : null;

  if (!refPost) return null;

  const topic = userCategories[0] ?? 'your next post';
  const hooks = buildHooks(topic, analysis);
  const hashtags = mergeHashtags(refPost.hashtags, userCategories, 10);

  const scoring: NextContentSuggestion['scoring'] = {
    trendAlignment: 50, // Pattern-based, not trend-dependent
    nicheRelevance: 70,  // User's own content, highly relevant
    gapOpportunity: opType === 'hook' ? 80 : opType === 'cta' ? 70 : 60,
    engagementPotential: opType === 'hook'
      ? clamp100(hookPatterns[0].frequency * 100)
      : opType === 'cta' ? 60 : 50,
  };
  const confidence = scoreToConfidence(scoring);

  return {
    id: `next-7-${trending.platform}-${ts}`,
    priority: 'low',
    confidence,
    topic,
    angle,
    format: refPost.contentType === 'video' ? 'video' : refPost.contentType === 'image' ? 'image' : 'carousel',
    suggestedDuration: refPost.contentType === 'video' ? 60 : undefined,
    hooks,
    copyTemplate: buildCopyTemplate(hooks, hashtags, analysis),
    hashtags,
    timing: buildTiming(personaScore, trending.platform),
    reference: {
      trendingPostUrl: refPost.url,
      trendingPostTitle: refPost.title,
      whyItWorks: angle,
      engagementData: { likes: refPost.likes, views: refPost.views },
    },
    scoring,
    rule: 'engagement-optimisation',
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate up to {@link MAX_SUGGESTIONS} deterministic next-content
 * suggestions by running all 7 rules against the provided inputs.
 *
 * Rules that cannot fire due to insufficient data (e.g. rules that
 * require analysis but `analysis` is null) silently return null and
 * are excluded from the result.
 *
 * When `personaScore.status === 'insufficient_data'`, only rules 3 and 4
 * (which rely solely on trending data) are run.
 *
 * @param personaScore   The user's computed persona score.
 * @param trending       Trending posts and topics from the collector.
 * @param analysis       Optional content analysis of the user's posts.
 * @param existingPosts  The user's existing post corpus (for gap detection).
 * @returns Sorted result with up to 7 suggestions, highest confidence first.
 */
export function generateNextContent(
  personaScore: PersonaScore,
  trending: TrendingCollection,
  analysis: ContentAnalysisResult | null,
  existingPosts: Post[],
): NextContentResult {
  // Use a single stable timestamp per call for deterministic IDs
  const ts = Date.now();

  const insufficientData = personaScore.status === 'insufficient_data';

  // Run all applicable rules
  const rawResults: Array<NextContentSuggestion | null> = insufficientData
    ? [
        // Only trending-only rules fire when user data is sparse
        null,                                                            // Rule 1 — needs niche
        null,                                                            // Rule 2 — needs format data
        ruleViralReplication(personaScore, trending, analysis, existingPosts, ts),
        ruleHashtagRiding(personaScore, trending, analysis, existingPosts, ts),
        null,                                                            // Rule 5 — needs categories
        null,                                                            // Rule 6 — needs analysis
        null,                                                            // Rule 7 — needs analysis
      ]
    : [
        ruleNicheMatch(personaScore, trending, analysis, existingPosts, ts),
        ruleContentGapFill(personaScore, trending, analysis, existingPosts, ts),
        ruleViralReplication(personaScore, trending, analysis, existingPosts, ts),
        ruleHashtagRiding(personaScore, trending, analysis, existingPosts, ts),
        ruleCrossPlatformTransfer(personaScore, trending, analysis, existingPosts, ts),
        ruleAudienceQuestion(personaScore, trending, analysis, existingPosts, ts),
        ruleEngagementOptimisation(personaScore, trending, analysis, existingPosts, ts),
      ];

  // Filter nulls, deduplicate by rule slug
  const seen = new Set<string>();
  const suggestions: NextContentSuggestion[] = rawResults
    .filter((s): s is NextContentSuggestion => s !== null)
    .filter((s) => {
      if (seen.has(s.rule)) return false;
      seen.add(s.rule);
      return true;
    });

  // Rank-normalize scoring dimensions across the batch
  const validSuggestions = suggestions.filter(Boolean) as NextContentSuggestion[];
  if (validSuggestions.length > 1) {
    const dims = ['trendAlignment', 'nicheRelevance', 'gapOpportunity', 'engagementPotential'];
    const scoringObjects = validSuggestions.map(s => ({ ...s.scoring }));
    const normalized = rankNormalize(scoringObjects, dims);
    for (let i = 0; i < validSuggestions.length; i++) {
      validSuggestions[i].scoring = normalized[i] as NextContentSuggestion['scoring'];
      validSuggestions[i].confidence = Math.round(
        (normalized[i].trendAlignment + normalized[i].nicheRelevance +
         normalized[i].gapOpportunity + normalized[i].engagementPotential) / 4
      );
      validSuggestions[i].priority = confidenceToPriority(validSuggestions[i].confidence);
    }
  }

  // Sort by confidence descending and cap at MAX_SUGGESTIONS
  suggestions.sort((a, b) => b.confidence - a.confidence);
  suggestions.splice(MAX_SUGGESTIONS);

  // Build input summary for the result envelope
  const personaTags = personaScore.tags.map((t) => t.label);
  const topCategories = topUserCategories(personaScore);

  return {
    suggestions,
    generatedAt: new Date(ts).toISOString(),
    inputSummary: {
      personaTags,
      trendingPostsAnalyzed: trending.posts.length,
      topCategories,
    },
  };
}
