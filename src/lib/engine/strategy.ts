/**
 * ContentStrategyEngine -- rule-based content strategy suggestions.
 *
 * Analyses a {@link PersonaScore} and optional {@link CrossPlatformComparison}
 * to generate up to 5 actionable suggestions for the creator.
 *
 * **MVP rules implemented:**
 *  1. Best engagement category differs from most-posted category
 *     --> suggest adjusting content mix.
 *  2. Inconsistent publishing rhythm
 *     --> suggest establishing a regular cadence.
 *  3. Cross-platform engagement gap
 *     --> suggest leveraging the stronger platform's patterns.
 *
 * @module engine/strategy
 */

import type { PersonaScore } from './persona';
import type { CrossPlatformComparison } from './comparator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Priority level for a strategy suggestion. */
export type SuggestionPriority = 'high' | 'medium' | 'low';

/** A single content strategy suggestion. */
export interface StrategySuggestion {
  /** Short title suitable for a card heading. */
  title: string;
  /** Detailed explanation of what to do and why. */
  description: string;
  /** Action priority. */
  priority: SuggestionPriority;
  /** Which analysis area the suggestion relates to. */
  area: 'content_mix' | 'rhythm' | 'cross_platform' | 'engagement' | 'growth';
  /** Machine-readable rule ID (for deduplication and tracking). */
  ruleId: string;
}

// ---------------------------------------------------------------------------
// Internal rule functions
// ---------------------------------------------------------------------------

/**
 * Rule 1: Content mix mismatch.
 *
 * If the category with the best engagement rate is NOT the category the
 * creator posts most frequently in, suggest shifting the content mix.
 */
function ruleContentMixMismatch(score: PersonaScore): StrategySuggestion | null {
  const { engagement, contentDistribution } = score;

  if (!engagement.bestCategory) return null;

  // Find the category with the highest percentage in the distribution
  let mostPostedCategory: string | null = null;
  let highestPct = 0;
  for (const [cat, pct] of Object.entries(contentDistribution)) {
    if (pct > highestPct) {
      highestPct = pct;
      mostPostedCategory = cat;
    }
  }

  if (!mostPostedCategory) return null;
  if (mostPostedCategory === engagement.bestCategory) return null;

  // Only flag if the best-engagement category is meaningfully different
  const bestCatEntry = engagement.byCategory.find(
    (c) => c.category === engagement.bestCategory,
  );
  const mostPostedEntry = engagement.byCategory.find(
    (c) => c.category === mostPostedCategory,
  );

  if (!bestCatEntry || !mostPostedEntry) return null;
  if (bestCatEntry.postCount < 2) return null;

  // Require at least 50% higher engagement in the best category
  if (
    mostPostedEntry.meanEngagementRate > 0 &&
    bestCatEntry.meanEngagementRate / mostPostedEntry.meanEngagementRate < 1.5
  ) {
    return null;
  }

  const ratio =
    mostPostedEntry.meanEngagementRate > 0
      ? (
          bestCatEntry.meanEngagementRate / mostPostedEntry.meanEngagementRate
        ).toFixed(1)
      : 'significantly';

  return {
    title: `Shift towards ${engagement.bestCategory} content`,
    description:
      `Your ${engagement.bestCategory} posts achieve ${ratio}x higher engagement than your most-posted category (${mostPostedCategory}). ` +
      `Consider increasing ${engagement.bestCategory} content from its current share and reducing less effective categories.`,
    priority: 'high',
    area: 'content_mix',
    ruleId: 'content-mix-mismatch',
  };
}

/**
 * Rule 2: Inconsistent publishing rhythm.
 *
 * If the consistency score is below 50, suggest establishing a regular
 * posting schedule.
 */
function ruleInconsistentRhythm(score: PersonaScore): StrategySuggestion | null {
  const { rhythm } = score;

  if (rhythm.consistencyScore >= 50) return null;

  const bestHourLabel =
    rhythm.bestHour !== null ? `${String(rhythm.bestHour).padStart(2, '0')}:00` : 'N/A';
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const bestDay =
    rhythm.bestDayOfWeek !== null ? dayNames[rhythm.bestDayOfWeek] : 'N/A';

  return {
    title: 'Establish a consistent posting schedule',
    description:
      `Your posting consistency score is ${rhythm.consistencyScore}/100, which indicates irregular publishing intervals. ` +
      `Algorithms on most platforms favour predictable creators. ` +
      `Your historical data suggests ${bestDay} around ${bestHourLabel} UTC may be your best time slot. ` +
      `Try committing to a fixed schedule (e.g., every ${rhythm.postsPerWeek >= 3 ? '2 days' : '3 days'}).`,
    priority: rhythm.consistencyScore < 30 ? 'high' : 'medium',
    area: 'rhythm',
    ruleId: 'inconsistent-rhythm',
  };
}

/**
 * Rule 3: Cross-platform engagement gap.
 *
 * If there is a significant engagement gap between platforms, suggest
 * adapting the stronger platform's content strategy to the weaker one.
 */
function ruleCrossPlatformGap(
  _score: PersonaScore,
  comparison?: CrossPlatformComparison,
): StrategySuggestion | null {
  if (!comparison || comparison.summaries.length < 2) return null;

  // Find the insight with the highest magnitude engagement gap
  const engGap = comparison.insights.find((i) => i.type === 'engagement_gap');
  if (!engGap) return null;

  return {
    title: `Adapt ${comparison.bestEngagementPlatform} strategy to other platforms`,
    description:
      `${engGap.text}. ` +
      `Analyse what makes your content resonate on ${comparison.bestEngagementPlatform} -- format, length, hooks, timing -- ` +
      `and test applying those patterns to your weaker platforms.`,
    priority: engGap.magnitude >= 3 ? 'high' : 'medium',
    area: 'cross_platform',
    ruleId: 'cross-platform-gap',
  };
}

/**
 * Rule 4: Engagement declining.
 *
 * If the engagement trend is negative, suggest refreshing content
 * approach.
 */
function ruleEngagementDecline(score: PersonaScore): StrategySuggestion | null {
  if (score.engagement.trend >= -0.005) return null;

  return {
    title: 'Reverse the engagement decline',
    description:
      `Your engagement rate is trending downward (${(score.engagement.trend * 100).toFixed(2)}pp shift from older to newer posts). ` +
      `This may indicate audience fatigue with the current format. ` +
      `Consider experimenting with new content formats, stronger opening hooks, or direct calls-to-action in your posts.`,
    priority: score.engagement.trend < -0.02 ? 'high' : 'medium',
    area: 'engagement',
    ruleId: 'engagement-decline',
  };
}

/**
 * Rule 5: Growth plateau.
 *
 * If growth is decelerating, suggest strategies to reignite momentum.
 */
function ruleGrowthPlateau(score: PersonaScore): StrategySuggestion | null {
  if (score.growthHealth.momentum !== 'decelerating') return null;

  return {
    title: 'Break through the growth plateau',
    description:
      `Your follower growth is decelerating (${score.growthHealth.followerGrowthRate}% over the tracked window). ` +
      `Consider collaborations with creators in adjacent niches, leveraging trending formats, ` +
      `or running a content series that encourages saves and shares to boost algorithmic distribution.`,
    priority: score.growthHealth.followerGrowthRate < 2 ? 'high' : 'medium',
    area: 'growth',
    ruleId: 'growth-plateau',
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate actionable content strategy suggestions based on persona
 * analysis and optional cross-platform comparison.
 *
 * Returns at most 5 suggestions, sorted by priority (high first).
 *
 * @param score        Completed {@link PersonaScore} from the persona engine.
 * @param comparison   Optional {@link CrossPlatformComparison} for multi-platform insights.
 */
export function generateStrategySuggestions(
  score: PersonaScore,
  comparison?: CrossPlatformComparison,
): StrategySuggestion[] {
  if (score.status === 'insufficient_data') return [];

  const rules: Array<StrategySuggestion | null> = [
    ruleContentMixMismatch(score),
    ruleInconsistentRhythm(score),
    ruleCrossPlatformGap(score, comparison),
    ruleEngagementDecline(score),
    ruleGrowthPlateau(score),
  ];

  const priorityOrder: Record<SuggestionPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return (rules.filter(Boolean) as StrategySuggestion[])
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 5);
}
