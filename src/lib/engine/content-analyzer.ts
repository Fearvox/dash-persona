/**
 * ContentAnalyzer — deterministic analysis engine for trending post data.
 *
 * Extracts copy patterns, hashtag strategies, engagement signals, and
 * content structure patterns from a collection of `TrendingPost` records.
 *
 * All functions are pure and side-effect-free. No network calls, no database
 * lookups, no external dependencies.
 *
 * @module engine/content-analyzer
 */

import type { TrendingPost } from '../collectors/trending-collector';

// ---------------------------------------------------------------------------
// Public type definitions
// ---------------------------------------------------------------------------

export interface CopyAnalysis {
  avgLength: number;
  medianLength: number;
  hookPatterns: { pattern: string; frequency: number; example: string }[];
  ctaPatterns: { pattern: string; frequency: number }[];
  emojiUsage: { avgPerPost: number; topEmojis: { emoji: string; count: number }[] };
  hashtagStrategy: {
    avgCount: number;
    topHashtags: { tag: string; frequency: number }[];
    mixStrategy: 'niche-heavy' | 'broad-heavy' | 'balanced' | 'trending-heavy';
  };
}

export interface EngagementPattern {
  avgLikes: number;
  avgComments: number;
  avgShares: number;
  avgSaves: number;
  avgViews: number;
  engagementRate: number;
  likeToCommentRatio: number;
  saveRate: number;
  topPerformers: TrendingPost[];
}

export interface CommentInsight {
  hotKeywords: { word: string; count: number }[];
  questionPatterns: string[];
  engagementTriggers: string[];
}

export interface ContentAnalysisResult {
  platform: 'xhs' | 'tiktok';
  niche: string;
  analyzedAt: string;
  sampleSize: number;
  copy: CopyAnalysis;
  engagement: EngagementPattern;
  comments: CommentInsight;
  contentTypeDistribution: Record<string, number>;
  keyInsights: string[];
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** CTA keywords found in post titles / descriptions. */
const CTA_KEYWORDS = [
  '点赞',
  '收藏',
  '评论',
  '关注',
  '转发',
  '分享',
];

/**
 * Chinese and English stop words to exclude from keyword frequency analysis.
 * Kept minimal: only single-char Chinese particles and the most common English
 * function words.
 */
const STOP_WORDS = new Set([
  // Chinese particles / function words (single-char)
  '的', '是', '了', '在', '和', '有', '一', '不', '这', '那', '我', '你',
  '他', '她', '它', '们', '也', '都', '就', '但', '而', '或', '被', '把',
  '从', '到', '以', '为', '于', '与', '及', '对', '由', '让', '用', '再',
  '没', '更', '最', '很', '太', '好', '大', '小', '多', '少', '可', '什',
  '么', '啊', '吧', '呢', '哦', '嗯',
  // English function words
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'and', 'in',
  'for', 'on', 'with', 'at', 'by', 'from', 'be', 'it', 'as', 'this', 'that',
  'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her', 'its',
  'our', 'their', 'not', 'but', 'or', 'so', 'if', 'do', 'did', 'have', 'has',
]);

/**
 * Broad generic hashtags — used to classify hashtag strategy.
 * A tag is "broad" when it appears in this set OR when it is present in more
 * than 30% of posts (platform-wide trending signal).
 */
const BROAD_HASHTAGS = new Set([
  '小红书', 'xhs', '种草', '好物推荐', '生活记录', '日常', 'vlog', '分享',
  '推荐', '好物', '干货', 'lifestyle', 'share', 'fyp', 'foryou', 'foryoupage',
  'trending', 'viral', 'tiktok', 'explore',
]);

// ---------------------------------------------------------------------------
// Emoji regex (Unicode property escapes — requires ES2018 + strict target)
// ---------------------------------------------------------------------------

const EMOJI_RE = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compute the median of a numeric array.
 * Returns 0 for empty arrays. Sorts a copy to avoid mutating the input.
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Round a number to two decimal places.
 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Safe average — returns 0 when the array is empty.
 */
function safeAvg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ---------------------------------------------------------------------------
// analyzeCopy
// ---------------------------------------------------------------------------

/**
 * Analyse the copywriting patterns present in a set of post titles.
 *
 * Hook detection scans the first 20 characters of each title (the fold that
 * matters for thumbnail cards) using pattern rules derived from XHS / TikTok
 * best-practice data.
 */
function analyzeCopy(posts: TrendingPost[]): CopyAnalysis {
  if (posts.length === 0) {
    return {
      avgLength: 0,
      medianLength: 0,
      hookPatterns: [],
      ctaPatterns: [],
      emojiUsage: { avgPerPost: 0, topEmojis: [] },
      hashtagStrategy: {
        avgCount: 0,
        topHashtags: [],
        mixStrategy: 'balanced',
      },
    };
  }

  // ---- Title length ----
  const lengths = posts.map((p) => p.title.length);
  const avgLength = round2(safeAvg(lengths));
  const medianLength = round2(median(lengths));

  // ---- Hook pattern detection ----

  type HookName =
    | 'question'
    | 'number'
    | 'contrast'
    | 'emotional'
    | 'challenge'
    | 'story';

  const hookCounts = new Map<HookName, number>();
  const hookExamples = new Map<HookName, string>();

  function recordHook(hook: HookName, title: string): void {
    hookCounts.set(hook, (hookCounts.get(hook) ?? 0) + 1);
    if (!hookExamples.has(hook)) {
      hookExamples.set(hook, title);
    }
  }

  for (const post of posts) {
    const title = post.title;
    const head = title.slice(0, 20);

    // Question hook — contains Chinese/English question marks in the opening
    if (/[？?]/.test(head) || /^[^，。！？,.!?]*[？?]/.test(title.slice(0, 30))) {
      recordHook('question', title);
    }

    // Number hook — title starts with a digit, possibly after leading emoji/space
    if (/^[\s\p{Emoji_Presentation}\p{Extended_Pictographic}]*\d/u.test(head)) {
      recordHook('number', title);
    }

    // Contrast hook — "从X到Y", "以前…现在", "vs", "before/after" structures
    if (
      /从.{1,10}到/.test(title) ||
      /以前.{1,15}现在/.test(title) ||
      /before.{1,20}after/i.test(title) ||
      /\bvs\b/i.test(title) ||
      /对比/.test(title)
    ) {
      recordHook('contrast', title);
    }

    // Emotional hook — high-affect openers
    if (
      /^(终于|被震撼|万万没想到|震惊|感动|泪目|扎心|太美了|绝了|牛了|崩溃|惊喜|心动)/.test(title)
    ) {
      recordHook('emotional', title);
    }

    // Challenge hook
    if (/挑战|challenge/i.test(head)) {
      recordHook('challenge', title);
    }

    // Story hook — narrative temporal openers
    if (/^(那天|当时|记得|曾经|有一次|上次|今天|昨天|前几天|小时候)/.test(title)) {
      recordHook('story', title);
    }
  }

  const hookLabels: Record<HookName, string> = {
    question: 'Question hook',
    number: 'Number hook',
    contrast: 'Contrast hook',
    emotional: 'Emotional hook',
    challenge: 'Challenge hook',
    story: 'Story hook',
  };

  const hookPatterns = (Object.entries(hookLabels) as [HookName, string][])
    .map(([key, label]) => ({
      pattern: label,
      frequency: hookCounts.get(key) ?? 0,
      example: hookExamples.get(key) ?? '',
    }))
    .filter((h) => h.frequency > 0)
    .sort((a, b) => b.frequency - a.frequency);

  // ---- CTA pattern detection ----
  const ctaCounts = new Map<string, number>();
  for (const post of posts) {
    for (const cta of CTA_KEYWORDS) {
      if (post.title.includes(cta)) {
        ctaCounts.set(cta, (ctaCounts.get(cta) ?? 0) + 1);
      }
    }
  }
  const ctaPatterns = [...ctaCounts.entries()]
    .map(([pattern, frequency]) => ({ pattern, frequency }))
    .sort((a, b) => b.frequency - a.frequency);

  // ---- Emoji usage ----
  const emojiCountPerPost: number[] = [];
  const globalEmojiCounts = new Map<string, number>();

  for (const post of posts) {
    const emojis = post.title.match(EMOJI_RE) ?? [];
    emojiCountPerPost.push(emojis.length);
    for (const emoji of emojis) {
      globalEmojiCounts.set(emoji, (globalEmojiCounts.get(emoji) ?? 0) + 1);
    }
  }

  const avgPerPost = round2(safeAvg(emojiCountPerPost));
  const topEmojis = [...globalEmojiCounts.entries()]
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ---- Hashtag strategy ----
  const hashtagCounts = new Map<string, number>();
  const hashtagCountsPerPost: number[] = [];

  for (const post of posts) {
    // Collect hashtags from both the dedicated array and inline title mentions
    const inlineTags =
      post.title.match(/#[^\s#\uff03]+|＃[^\s#\uff03]+/g)?.map((t) =>
        t.replace(/^[#＃]/, '').toLowerCase(),
      ) ?? [];
    const allTags = [
      ...post.hashtags.map((t) => t.replace(/^[#＃]/, '').toLowerCase()),
      ...inlineTags,
    ];
    // Deduplicate per post before counting
    const uniqueTags = [...new Set(allTags)];
    hashtagCountsPerPost.push(uniqueTags.length);
    for (const tag of uniqueTags) {
      hashtagCounts.set(tag, (hashtagCounts.get(tag) ?? 0) + 1);
    }
  }

  const avgHashtagCount = round2(safeAvg(hashtagCountsPerPost));

  const topHashtags = [...hashtagCounts.entries()]
    .map(([tag, frequency]) => ({ tag, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20);

  const mixStrategy = classifyHashtagStrategy(hashtagCounts, posts.length);

  return {
    avgLength,
    medianLength,
    hookPatterns,
    ctaPatterns,
    emojiUsage: { avgPerPost, topEmojis },
    hashtagStrategy: {
      avgCount: avgHashtagCount,
      topHashtags,
      mixStrategy,
    },
  };
}

/**
 * Classify the hashtag usage pattern across a set of posts.
 *
 * Categorisation logic:
 * - trending-heavy: top 3 tags each appear in > 50% of posts
 * - broad-heavy: > 60% of unique tags are in the BROAD_HASHTAGS set
 * - niche-heavy: < 20% of unique tags are broad, no single tag > 30% coverage
 * - balanced: everything else
 */
function classifyHashtagStrategy(
  tagCounts: Map<string, number>,
  postCount: number,
): CopyAnalysis['hashtagStrategy']['mixStrategy'] {
  if (postCount === 0 || tagCounts.size === 0) return 'balanced';

  const entries = [...tagCounts.entries()];

  // Trending-heavy: dominant tags appear in more than half the posts
  const trendingCount = entries.filter(([, c]) => c / postCount > 0.5).length;
  if (trendingCount >= 3) return 'trending-heavy';

  // Count broad vs. niche tags
  let broadCount = 0;
  for (const [tag] of entries) {
    if (BROAD_HASHTAGS.has(tag) || (tagCounts.get(tag) ?? 0) / postCount > 0.3) {
      broadCount++;
    }
  }

  const broadRatio = broadCount / entries.length;

  if (broadRatio > 0.6) return 'broad-heavy';
  if (broadRatio < 0.2) return 'niche-heavy';
  return 'balanced';
}

// ---------------------------------------------------------------------------
// analyzeEngagement
// ---------------------------------------------------------------------------

/**
 * Derive aggregate engagement metrics and identify top-performing posts.
 *
 * Engagement rate = (likes + comments + shares + saves) / views.
 * Posts with 0 views are excluded from the rate calculation to avoid
 * division-by-zero skewing the average.
 */
function analyzeEngagement(posts: TrendingPost[]): EngagementPattern {
  if (posts.length === 0) {
    return {
      avgLikes: 0,
      avgComments: 0,
      avgShares: 0,
      avgSaves: 0,
      avgViews: 0,
      engagementRate: 0,
      likeToCommentRatio: 0,
      saveRate: 0,
      topPerformers: [],
    };
  }

  const avgLikes = round2(safeAvg(posts.map((p) => p.likes)));
  const avgComments = round2(safeAvg(posts.map((p) => p.comments)));
  const avgShares = round2(safeAvg(posts.map((p) => p.shares)));
  const avgSaves = round2(safeAvg(posts.map((p) => p.saves)));
  const avgViews = round2(safeAvg(posts.map((p) => p.views)));

  // Engagement rate — exclude posts with 0 views
  const postsWithViews = posts.filter((p) => p.views > 0);
  const engagementRates = postsWithViews.map(
    (p) => (p.likes + p.comments + p.shares + p.saves) / p.views,
  );
  const engagementRate = round2(safeAvg(engagementRates));

  // Like-to-comment ratio (across aggregate totals)
  const totalComments = posts.reduce((s, p) => s + p.comments, 0);
  const totalLikes = posts.reduce((s, p) => s + p.likes, 0);
  const likeToCommentRatio =
    totalComments === 0 ? Infinity : round2(totalLikes / totalComments);

  // Save rate = saves / views (aggregate)
  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const totalSaves = posts.reduce((s, p) => s + p.saves, 0);
  const saveRate = totalViews > 0 ? round2(totalSaves / totalViews) : 0;

  // Top performers: sort by per-post engagement rate descending, take top 5
  const topPerformers = [...posts]
    .filter((p) => p.views > 0)
    .sort((a, b) => {
      const rateA = (a.likes + a.comments + a.shares + a.saves) / a.views;
      const rateB = (b.likes + b.comments + b.shares + b.saves) / b.views;
      return rateB - rateA;
    })
    .slice(0, 5);

  return {
    avgLikes,
    avgComments,
    avgShares,
    avgSaves,
    avgViews,
    engagementRate,
    likeToCommentRatio,
    saveRate,
    topPerformers,
  };
}

// ---------------------------------------------------------------------------
// analyzeComments
// ---------------------------------------------------------------------------

/**
 * Derive comment-surface insights by analysing post titles as a proxy for
 * what audiences engage with.
 *
 * Since raw comment text is unavailable from trend collection, this function
 * mines title text for:
 *  1. High-frequency meaningful words (hot keywords)
 *  2. Question patterns embedded in titles (reflect audience curiosity)
 *  3. Engagement triggers — title features that correlate with high ER
 */
function analyzeComments(
  posts: TrendingPost[],
  topEngagementRate: number,
): CommentInsight {
  if (posts.length === 0) {
    return { hotKeywords: [], questionPatterns: [], engagementTriggers: [] };
  }

  // ---- Hot keywords from title corpus ----
  const wordCounts = new Map<string, number>();

  for (const post of posts) {
    // Strip hashtags and emoji before tokenising
    const text = post.title
      .replace(/#[^\s#\uff03]+|＃[^\s#\uff03]+/g, '')
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
      .toLowerCase();

    // Extract Latin words (2+ chars)
    const latinWords = text.match(/[a-z0-9]{2,}/g) ?? [];
    // Extract CJK characters individually for bi-gram chunking
    const cjkChars = text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) ?? [];

    // Build 2-grams from CJK characters for more meaningful units
    const cjkBigrams: string[] = [];
    for (let i = 0; i < cjkChars.length - 1; i++) {
      cjkBigrams.push(cjkChars[i] + cjkChars[i + 1]);
    }

    const tokens = [...latinWords, ...cjkBigrams, ...cjkChars];

    for (const token of tokens) {
      if (STOP_WORDS.has(token) || token.length < 2) continue;
      // Skip tokens composed entirely of stop-word characters
      if ([...token].every((ch) => STOP_WORDS.has(ch))) continue;
      wordCounts.set(token, (wordCounts.get(token) ?? 0) + 1);
    }
  }

  const hotKeywords = [...wordCounts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // ---- Question patterns ----
  // Titles that contain a question mirror audience curiosity topics
  const questionPatterns: string[] = [];
  const questionRe = /[^？?]*[？?]/g;
  const seenPatterns = new Set<string>();

  for (const post of posts) {
    const match = post.title.match(questionRe);
    if (match) {
      const pattern = match[0].trim().slice(0, 30);
      if (!seenPatterns.has(pattern) && questionPatterns.length < 8) {
        seenPatterns.add(pattern);
        questionPatterns.push(pattern);
      }
    }
  }

  // ---- Engagement triggers ----
  // Identify title features correlated with the top-25% of posts by ER
  const engagementTriggers: string[] = [];

  if (posts.length >= 4) {
    const threshold = topEngagementRate * 0.75;

    const topPosts = posts
      .filter((p) => p.views > 0)
      .filter((p) => (p.likes + p.comments + p.shares + p.saves) / p.views >= threshold);

    if (topPosts.length > 0) {
      // Feature: emoji presence
      const emojiRatio = topPosts.filter((p) => EMOJI_RE.test(p.title)).length / topPosts.length;
      if (emojiRatio >= 0.6) {
        engagementTriggers.push('Emoji in title correlates with higher engagement');
      }

      // Feature: question mark presence
      const questionRatio =
        topPosts.filter((p) => /[？?]/.test(p.title)).length / topPosts.length;
      if (questionRatio >= 0.4) {
        engagementTriggers.push('Question phrasing in title triggers more responses');
      }

      // Feature: number hook
      const numberRatio =
        topPosts.filter((p) =>
          /^[\s\p{Emoji_Presentation}\p{Extended_Pictographic}]*\d/u.test(p.title),
        ).length / topPosts.length;
      if (numberRatio >= 0.35) {
        engagementTriggers.push(
          'Numerical openers ("3个方法", "5 tips") increase click-through',
        );
      }

      // Feature: title length relative to corpus average
      const topAvgLen = safeAvg(topPosts.map((p) => p.title.length));
      const globalAvgLen = safeAvg(posts.map((p) => p.title.length));
      if (topAvgLen < globalAvgLen * 0.8) {
        engagementTriggers.push('Top posts use shorter titles — brevity aids scan-ability');
      } else if (topAvgLen > globalAvgLen * 1.2) {
        engagementTriggers.push('Top posts use longer, more detailed titles');
      }

      // Feature: explicit CTA
      const ctaRatio =
        topPosts.filter((p) => CTA_KEYWORDS.some((cta) => p.title.includes(cta))).length /
        topPosts.length;
      if (ctaRatio >= 0.3) {
        engagementTriggers.push('Explicit CTAs in title boost interaction rate');
      }
    }
  }

  return { hotKeywords, questionPatterns, engagementTriggers };
}

// ---------------------------------------------------------------------------
// computeContentTypeDistribution
// ---------------------------------------------------------------------------

/**
 * Compute percentage distribution across `contentType` values.
 * Returns a plain object mapping type string to percentage (0-100).
 * The percentages sum to 100 (subject to floating-point rounding).
 */
function computeContentTypeDistribution(posts: TrendingPost[]): Record<string, number> {
  if (posts.length === 0) return {};

  const counts = new Map<string, number>();
  for (const post of posts) {
    counts.set(post.contentType, (counts.get(post.contentType) ?? 0) + 1);
  }

  const result: Record<string, number> = {};
  for (const [type, count] of counts) {
    result[type] = round2((count / posts.length) * 100);
  }
  return result;
}

// ---------------------------------------------------------------------------
// generateKeyInsights
// ---------------------------------------------------------------------------

/**
 * Generate 3-5 human-readable insight strings from the completed analysis
 * sub-results.
 *
 * Each insight is a single, actionable sentence — no emoji, no markdown.
 * Insights are only appended when the underlying signal meets a confidence
 * threshold (documented inline).
 */
function generateKeyInsights(
  posts: TrendingPost[],
  copy: CopyAnalysis,
  engagement: EngagementPattern,
): string[] {
  const insights: string[] = [];
  const n = posts.length;
  if (n === 0) return insights;

  // Insight 1: dominant hook type
  if (copy.hookPatterns.length > 0) {
    const top = copy.hookPatterns[0];
    const pct = Math.round((top.frequency / n) * 100);
    if (pct >= 20) {
      insights.push(`Top posts use ${top.pattern.toLowerCase()} ${pct}% of the time`);
    }
  }

  // Insight 2: hashtag strategy + average count
  if (copy.hashtagStrategy.avgCount > 0) {
    const strategyLabel: Record<CopyAnalysis['hashtagStrategy']['mixStrategy'], string> = {
      'niche-heavy': 'skewing toward niche-specific tags',
      'broad-heavy': 'leaning on broad discovery tags',
      'balanced': 'mixing niche and broad tags',
      'trending-heavy': 'clustering around a few dominant trending tags',
    };
    insights.push(
      `Average ${copy.hashtagStrategy.avgCount} hashtags per post, ${strategyLabel[copy.hashtagStrategy.mixStrategy]}`,
    );
  }

  // Insight 3: save rate signal
  if (engagement.saveRate > 0) {
    const savePct = round2(engagement.saveRate * 100);
    if (savePct >= 3) {
      insights.push(
        `Save rate (${savePct}%) is unusually high — content has strong reference or revisit value`,
      );
    } else if (savePct >= 1) {
      insights.push(
        `Save rate of ${savePct}% suggests moderate evergreen value in the content`,
      );
    }
  }

  // Insight 4: emoji engagement multiplier
  if (copy.emojiUsage.avgPerPost > 0) {
    const postsWithEmoji = posts.filter((p) => EMOJI_RE.test(p.title));
    const postsWithViews = posts.filter((p) => p.views > 0);

    if (postsWithEmoji.length > 0 && postsWithViews.length > 0) {
      const withEmojiER = safeAvg(
        postsWithEmoji
          .filter((p) => p.views > 0)
          .map((p) => (p.likes + p.comments + p.shares + p.saves) / p.views),
      );
      const withoutEmoji = postsWithViews.filter((p) => !EMOJI_RE.test(p.title));
      const withoutEmojiER =
        withoutEmoji.length > 0
          ? safeAvg(withoutEmoji.map((p) => (p.likes + p.comments + p.shares + p.saves) / p.views))
          : 0;

      if (withoutEmojiER > 0 && withEmojiER / withoutEmojiER >= 1.3) {
        const multiplier = round2(withEmojiER / withoutEmojiER);
        insights.push(
          `Posts with emoji in the title get ${multiplier}x more engagement on average`,
        );
      } else {
        insights.push(`Posts average ${copy.emojiUsage.avgPerPost} emoji per title`);
      }
    }
  }

  // Insight 5: overall engagement rate context
  const erPct = round2(engagement.engagementRate * 100);
  if (erPct > 0) {
    const label =
      erPct >= 10
        ? 'exceptionally high'
        : erPct >= 5
          ? 'strong'
          : erPct >= 2
            ? 'moderate'
            : 'low';
    insights.push(`Overall engagement rate of ${erPct}% is ${label} for this niche`);
  }

  return insights.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Analyse a collection of trending posts for a given niche.
 *
 * Orchestrates all sub-analyses and returns a fully populated
 * {@link ContentAnalysisResult}. The function is deterministic: identical
 * inputs will always produce identical outputs.
 *
 * @param posts  Array of `TrendingPost` records. Empty array is handled
 *               gracefully — all metrics will be zero or empty.
 * @param niche  Human-readable niche label (e.g. "fitness", "beauty").
 * @returns      Complete analysis result ready for serialisation.
 */
export function analyzeContent(
  posts: TrendingPost[],
  niche: string,
): ContentAnalysisResult {
  // Derive platform from the majority of posts; fall back to 'xhs'
  const platformVotes = posts.reduce<Record<string, number>>(
    (acc, p) => ({ ...acc, [p.platform]: (acc[p.platform] ?? 0) + 1 }),
    {},
  );
  const platform: 'xhs' | 'tiktok' =
    (Object.entries(platformVotes).sort(([, a], [, b]) => b - a)[0]?.[0] as
      | 'xhs'
      | 'tiktok') ?? 'xhs';

  const copy = analyzeCopy(posts);
  const engagement = analyzeEngagement(posts);
  const comments = analyzeComments(posts, engagement.engagementRate);
  const contentTypeDistribution = computeContentTypeDistribution(posts);
  const keyInsights = generateKeyInsights(posts, copy, engagement);

  return {
    platform,
    niche,
    analyzedAt: new Date().toISOString(),
    sampleSize: posts.length,
    copy,
    engagement,
    comments,
    contentTypeDistribution,
    keyInsights,
  };
}
