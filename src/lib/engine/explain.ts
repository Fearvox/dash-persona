/**
 * Score explanation system for DashPersona.
 *
 * Provides deterministic, human-readable explanations for persona scores,
 * growth deltas, and persona tree node scores. All functions are pure and
 * side-effect-free.
 *
 * @module engine/explain
 */

import type { Post } from '../schema/creator-data';
import type { NodeScoring } from '../schema/persona-tree';
import type { PersonaScore } from './persona';
import type { GrowthDelta } from './growth';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single contributing factor to a score. */
export interface ScoreFactor {
  /** Human-readable factor name. */
  name: string;
  /** Raw numeric value of this factor. */
  value: number;
  /** Weight applied to this factor (0-1). */
  weight: number;
  /** Whether this factor helps, hurts, or is neutral. */
  impact: 'positive' | 'negative' | 'neutral';
  /** Post IDs that most contribute to this factor. */
  topPostIds: string[];
}

/** Full explanation of a computed score. */
export interface ScoreExplanation {
  /** The final score value. */
  score: number;
  /** Human-readable formula string showing the calculation. */
  formula: string;
  /** Contributing factors, sorted by weight descending. */
  factors: ScoreFactor[];
  /** One-line summary of the score. */
  summary: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Round a number to one decimal place. */
function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Capitalise the first letter of a string. */
function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Classify impact based on a 0-100 score. */
function scoreImpact(score: number): 'positive' | 'negative' | 'neutral' {
  if (score >= 60) return 'positive';
  if (score <= 30) return 'negative';
  return 'neutral';
}

/** Get top N posts by engagement rate. */
function topPostsByEngagement(posts: Post[], n = 3): string[] {
  return [...posts]
    .sort((a, b) => {
      const rateA = a.views > 0 ? (a.likes + a.comments + a.shares + a.saves) / a.views : 0;
      const rateB = b.views > 0 ? (b.likes + b.comments + b.shares + b.saves) / b.views : 0;
      return rateB - rateA;
    })
    .slice(0, n)
    .map((p) => p.postId);
}

/** Get top N posts by views. */
function topPostsByViews(posts: Post[], n = 3): string[] {
  return [...posts]
    .sort((a, b) => b.views - a.views)
    .slice(0, n)
    .map((p) => p.postId);
}

/** Get top N posts by saves. */
function topPostsBySaves(posts: Post[], n = 3): string[] {
  return [...posts]
    .sort((a, b) => b.saves - a.saves)
    .slice(0, n)
    .map((p) => p.postId);
}

/** Filter posts by content type. */
function postsByCategory(posts: Post[], category: string): Post[] {
  return posts.filter((p) => p.contentType === category);
}

// ---------------------------------------------------------------------------
// explainPersonaScore
// ---------------------------------------------------------------------------

/**
 * Generate explanations for all six dimensions of a PersonaScore.
 *
 * Returns a record keyed by dimension name: contentMix, engagementProfile,
 * rhythm, personaConsistency, growthHealth, viralPotential.
 *
 * @param score  The computed PersonaScore.
 * @param posts  The posts that were analysed.
 */
export function explainPersonaScore(
  score: PersonaScore,
  posts: Post[],
): Record<string, ScoreExplanation> {
  return {
    contentMix: explainContentMix(score, posts),
    engagementProfile: explainEngagement(score, posts),
    rhythm: explainRhythm(score, posts),
    personaConsistency: explainConsistency(score, posts),
    growthHealth: explainGrowth(score, posts),
    viralPotential: explainViralPotential(score, posts),
  };
}

// ---------------------------------------------------------------------------
// Dimension explainers
// ---------------------------------------------------------------------------

function explainContentMix(score: PersonaScore, posts: Post[]): ScoreExplanation {
  const categories = Object.keys(score.contentDistribution);
  const diversityIndex = categories.length;
  const diversityScore = Math.min(diversityIndex * 10, 100);

  const factors: ScoreFactor[] = categories
    .sort((a, b) => (score.contentDistribution[b] ?? 0) - (score.contentDistribution[a] ?? 0))
    .slice(0, 5)
    .map((cat) => ({
      name: capitalise(cat),
      value: r1(score.contentDistribution[cat] ?? 0),
      weight: (score.contentDistribution[cat] ?? 0) / 100,
      impact: scoreImpact((score.contentDistribution[cat] ?? 0) > 10 ? 70 : 40),
      topPostIds: postsByCategory(posts, cat).slice(0, 3).map((p) => p.postId),
    }));

  const topCat = categories.length > 0
    ? categories.reduce((a, b) =>
        (score.contentDistribution[a] ?? 0) >= (score.contentDistribution[b] ?? 0) ? a : b,
      )
    : 'none';

  return {
    score: diversityScore,
    formula: `min(${diversityIndex} categories * 10, 100) = ${diversityScore}`,
    factors,
    summary: `Content spans ${diversityIndex} categories, led by ${topCat} at ${r1(score.contentDistribution[topCat] ?? 0)}%.`,
  };
}

function explainEngagement(score: PersonaScore, posts: Post[]): ScoreExplanation {
  const engScore = Math.min(Math.round(score.engagement.overallRate * 100 * 5), 100);
  const overallPct = r1(score.engagement.overallRate * 100);
  const medianPct = r1(score.engagement.medianRate * 100);
  const trendPct = r1(score.engagement.trend * 100);

  const factors: ScoreFactor[] = [
    {
      name: t('engine.explain.overallRate'),
      value: overallPct,
      weight: 0.4,
      impact: scoreImpact(engScore),
      topPostIds: topPostsByEngagement(posts, 3),
    },
    {
      name: t('engine.explain.medianRate'),
      value: medianPct,
      weight: 0.3,
      impact: medianPct >= 3 ? 'positive' : medianPct >= 1 ? 'neutral' : 'negative',
      topPostIds: [],
    },
    {
      name: t('engine.explain.trend'),
      value: trendPct,
      weight: 0.3,
      impact: trendPct > 0 ? 'positive' : trendPct < -0.5 ? 'negative' : 'neutral',
      topPostIds: topPostsByEngagement(posts.slice(0, Math.floor(posts.length / 2)), 2),
    },
  ];

  return {
    score: engScore,
    formula: `min(${overallPct}% * 5, 100) = ${engScore}`,
    factors,
    summary: `Engagement rate of ${overallPct}% (median ${medianPct}%) with a ${trendPct >= 0 ? '+' : ''}${trendPct}pp trend.`,
  };
}

function explainRhythm(score: PersonaScore, posts: Post[]): ScoreExplanation {
  const rhythmScore = score.rhythm.consistencyScore;
  const ppw = score.rhythm.postsPerWeek;
  const interval = score.rhythm.meanIntervalDays;
  const bestHour = score.rhythm.bestHour;

  // Get most recent posts for "top posts" context
  const recentPosts = [...posts]
    .filter((p) => p.publishedAt)
    .sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime())
    .slice(0, 3)
    .map((p) => p.postId);

  const factors: ScoreFactor[] = [
    {
      name: t('engine.explain.postsPerWeek'),
      value: ppw,
      weight: 0.4,
      impact: ppw >= 3 ? 'positive' : ppw >= 1 ? 'neutral' : 'negative',
      topPostIds: recentPosts,
    },
    {
      name: t('engine.explain.consistency'),
      value: rhythmScore,
      weight: 0.4,
      impact: scoreImpact(rhythmScore),
      topPostIds: [],
    },
    {
      name: t('engine.explain.meanInterval'),
      value: interval,
      weight: 0.2,
      impact: interval <= 2 ? 'positive' : interval <= 5 ? 'neutral' : 'negative',
      topPostIds: [],
    },
  ];

  const hourLabel = bestHour !== null ? `${bestHour}:00` : 'N/A';

  return {
    score: rhythmScore,
    formula: `100 * (1 / (1 + CV)) = ${rhythmScore}`,
    factors,
    summary: `Publishing ${ppw}/wk with ${interval}d mean interval. Best hour: ${hourLabel}. Consistency: ${rhythmScore}/100.`,
  };
}

function explainConsistency(score: PersonaScore, posts: Post[]): ScoreExplanation {
  const cScore = score.consistency.score;
  const dominant = score.consistency.dominantCategory ?? 'N/A';
  const dominantPct = score.consistency.dominantCategoryPct;

  const topDomPosts = dominant !== 'N/A'
    ? postsByCategory(posts, dominant).slice(0, 3).map((p) => p.postId)
    : [];

  const factors: ScoreFactor[] = [
    {
      name: t('engine.explain.cosineSimilarity'),
      value: cScore,
      weight: 0.6,
      impact: scoreImpact(cScore),
      topPostIds: [],
    },
    {
      name: t('engine.explain.dominant', {
        category: dominant !== 'N/A' ? t('engine.category.' + dominant) : t('ui.common.na'),
      }),
      value: dominantPct,
      weight: 0.4,
      impact: dominantPct >= 40 ? 'positive' : dominantPct >= 20 ? 'neutral' : 'negative',
      topPostIds: topDomPosts,
    },
  ];

  return {
    score: cScore,
    formula: `mean(cosine_sim(window_i, window_i+1)) * 100 = ${cScore}`,
    factors,
    summary: `Persona consistency ${cScore}/100. ${score.consistency.isConsistent ? 'Stable' : 'Unstable'} identity, led by ${dominant} (${dominantPct}%).`,
  };
}

function explainGrowth(score: PersonaScore, posts: Post[]): ScoreExplanation {
  const momentum = score.growthHealth.momentum;
  const followerGrowth = score.growthHealth.followerGrowthRate;
  const dataPoints = score.growthHealth.dataPointsUsed;

  const growthScore =
    momentum === 'accelerating'
      ? 80
      : momentum === 'steady'
        ? 60
        : momentum === 'decelerating'
          ? 30
          : 0;

  const factors: ScoreFactor[] = [
    {
      name: t('engine.explain.followerGrowthRate'),
      value: followerGrowth,
      weight: 0.5,
      impact: followerGrowth > 5 ? 'positive' : followerGrowth > 0 ? 'neutral' : 'negative',
      topPostIds: topPostsByViews(posts, 3),
    },
    {
      name: t('engine.explain.momentum'),
      value: growthScore,
      weight: 0.3,
      impact: scoreImpact(growthScore),
      topPostIds: [],
    },
    {
      name: t('engine.explain.dataPoints'),
      value: dataPoints,
      weight: 0.2,
      impact: dataPoints >= 3 ? 'positive' : dataPoints >= 2 ? 'neutral' : 'negative',
      topPostIds: [],
    },
  ];

  return {
    score: growthScore,
    formula: `momentum="${momentum}" -> ${growthScore}, followerGrowth=${followerGrowth}%`,
    factors,
    summary: `Growth is ${momentum} with ${followerGrowth}% follower change over ${dataPoints} data points.`,
  };
}

function explainViralPotential(score: PersonaScore, posts: Post[]): ScoreExplanation {
  const bestCat = score.engagement.byCategory[0];
  const bestRate = bestCat?.meanEngagementRate ?? 0;
  const viral = Math.min(Math.round(bestRate * 100 * 6.67), 100);

  const bestCatPosts = bestCat
    ? postsByCategory(posts, bestCat.category).slice(0, 3).map((p) => p.postId)
    : [];

  const factors: ScoreFactor[] = [
    {
      name: t('engine.explain.bestCategory', {
        category: bestCat ? t('engine.category.' + bestCat.category) : t('ui.common.na'),
      }),
      value: r1(bestRate * 100),
      weight: 0.6,
      impact: bestRate >= 0.1 ? 'positive' : bestRate >= 0.05 ? 'neutral' : 'negative',
      topPostIds: bestCatPosts,
    },
    {
      name: t('engine.explain.postCount'),
      value: bestCat?.postCount ?? 0,
      weight: 0.2,
      impact: (bestCat?.postCount ?? 0) >= 5 ? 'positive' : 'neutral',
      topPostIds: [],
    },
    {
      name: t('engine.explain.overallEngagement'),
      value: r1(score.engagement.overallRate * 100),
      weight: 0.2,
      impact: score.engagement.overallRate >= 0.08 ? 'positive' : 'neutral',
      topPostIds: topPostsByEngagement(posts, 2),
    },
  ];

  return {
    score: viral,
    formula: `min(${r1(bestRate * 100)}% * 6.67, 100) = ${viral}`,
    factors,
    summary: `Viral potential ${viral}/100. ${bestCat ? `${capitalise(bestCat.category)} content achieves ${r1(bestRate * 100)}% engagement.` : 'No category data.'}`,
  };
}

// ---------------------------------------------------------------------------
// explainGrowthDelta
// ---------------------------------------------------------------------------

/**
 * Explain a growth delta with contributing metric factors.
 *
 * @param delta  The computed GrowthDelta between two time points.
 */
export function explainGrowthDelta(delta: GrowthDelta): ScoreExplanation {
  const followerDelta = delta.followers.delta;
  const likesDelta = delta.likesTotal.delta;
  const viewsDelta = delta.totalViews.delta;

  // Composite score: weighted combination of growth rates
  const fScore = delta.followers.pct > 0 ? Math.min(delta.followers.pct * 10, 100) : Math.max(delta.followers.pct * 10, 0);
  const lScore = delta.likesTotal.pct > 0 ? Math.min(delta.likesTotal.pct * 5, 100) : Math.max(delta.likesTotal.pct * 5, 0);
  const compositeScore = Math.round(
    Math.max(0, Math.min(100, fScore * 0.5 + lScore * 0.3 + 50 * 0.2)),
  );

  const sign = (n: number) => (n > 0 ? '+' : '');

  const factors: ScoreFactor[] = [
    {
      name: t('engine.explain.followers'),
      value: followerDelta,
      weight: 0.5,
      impact: followerDelta > 0 ? 'positive' : followerDelta < 0 ? 'negative' : 'neutral',
      topPostIds: [],
    },
    {
      name: t('engine.explain.likes'),
      value: likesDelta,
      weight: 0.3,
      impact: likesDelta > 0 ? 'positive' : likesDelta < 0 ? 'negative' : 'neutral',
      topPostIds: [],
    },
    {
      name: t('engine.explain.views'),
      value: viewsDelta,
      weight: 0.2,
      impact: viewsDelta > 0 ? 'positive' : viewsDelta < 0 ? 'negative' : 'neutral',
      topPostIds: [],
    },
  ];

  return {
    score: compositeScore,
    formula: `50% * followers(${sign(delta.followers.pct)}${r1(delta.followers.pct)}%) + 30% * likes(${sign(delta.likesTotal.pct)}${r1(delta.likesTotal.pct)}%) + 20% * baseline = ${compositeScore}`,
    factors,
    summary: `Followers ${sign(followerDelta)}${followerDelta} (${sign(delta.followers.pct)}${r1(delta.followers.pct)}%), likes ${sign(likesDelta)}${likesDelta}, views ${sign(viewsDelta)}${viewsDelta}.`,
  };
}

// ---------------------------------------------------------------------------
// explainNodeScoring
// ---------------------------------------------------------------------------

/**
 * Explain a persona tree node's composite score.
 *
 * @param scoring  The computed NodeScoring.
 * @param posts    The posts used to compute the scoring.
 */
export function explainNodeScoring(
  scoring: NodeScoring,
  posts: Post[],
): ScoreExplanation {
  const { engagementScore, retentionScore, growthScore, compositeScore } = scoring;

  const factors: ScoreFactor[] = [
    {
      name: t('engine.explain.engagement'),
      value: engagementScore,
      weight: 0.4,
      impact: scoreImpact(engagementScore),
      topPostIds: topPostsByEngagement(posts, 3),
    },
    {
      name: t('engine.explain.retention'),
      value: retentionScore,
      weight: 0.35,
      impact: scoreImpact(retentionScore),
      topPostIds: topPostsBySaves(posts, 3),
    },
    {
      name: t('engine.explain.growth'),
      value: growthScore,
      weight: 0.25,
      impact: scoreImpact(growthScore),
      topPostIds: topPostsByViews(posts, 2),
    },
  ];

  return {
    score: compositeScore,
    formula: `40% * ${r1(engagementScore)} (engagement) + 35% * ${r1(retentionScore)} (retention) + 25% * ${r1(growthScore)} (growth) = ${compositeScore}`,
    factors,
    summary: `Composite score ${compositeScore}/100. ${scoring.passesThreshold ? 'Passes' : 'Below'} threshold. Engagement ${engagementScore}, retention ${retentionScore}, growth ${growthScore}.`,
  };
}
