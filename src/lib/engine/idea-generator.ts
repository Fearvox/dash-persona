/**
 * Deterministic experiment hypothesis generator.
 *
 * Analyses a set of {@link CreatorProfile}s to surface actionable experiment
 * ideas ranked by potential impact. All logic is rule-based -- no LLM.
 *
 * @module engine/idea-generator
 */

import type { CreatorProfile, Post } from '../schema/creator-data';
import type { PersonaTree } from '../schema/persona-tree';
import {
  classifyContent,
  computeEngagementProfile,
  computeRhythm,
  computePersonaConsistency,
} from './persona';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A generated experiment hypothesis with supporting rationale. */
export interface ExperimentIdea {
  /** Unique identifier, e.g. "idea-content-gap-tutorial". */
  id: string;
  /** Short human-readable title. */
  title: string;
  /** Template-interpolated hypothesis statement. */
  hypothesis: string;
  /** Suggested series / content category for the experiment. */
  series: string;
  /** Why this idea was generated. */
  rationale: string;
  /** Expected impact level. */
  potentialImpact: 'high' | 'medium' | 'low';
  /** Data points that support this idea. */
  basedOn: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const IMPACT_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Check if an existing tree already has an experiment covering a series + content type. */
function treeCovers(tree: PersonaTree | undefined, series: string, contentHint: string): boolean {
  if (!tree) return false;
  const lowerSeries = series.toLowerCase();
  const lowerHint = contentHint.toLowerCase();
  return tree.nodes.some(
    (n) =>
      n.series.toLowerCase() === lowerSeries &&
      n.title.toLowerCase().includes(lowerHint),
  );
}

function pct(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

// ---------------------------------------------------------------------------
// Core generator
// ---------------------------------------------------------------------------

/**
 * Generate up to 5 deterministic experiment ideas from creator profiles.
 *
 * Rules (applied in order, first-match per rule):
 * 1. Content gap: high engagement category with < 15% of posts
 * 2. Cross-platform delta: same content type has 2x+ engagement gap
 * 3. Rhythm anomaly: peak day/hour rarely used
 * 4. Persona drift: consistency score dropping
 * 5. Viral pattern: any post with views 5x above average
 *
 * Cold start guard: returns [] if total posts across all profiles < 5.
 *
 * @param profiles  Platform-keyed creator profiles (e.g. { douyin, tiktok, xhs }).
 * @param existingTree  Optional existing tree to avoid duplicate suggestions.
 * @returns Sorted array of ideas, max 5, highest impact first.
 */
export function generateExperimentIdeas(
  profiles: Record<string, CreatorProfile>,
  existingTree?: PersonaTree,
): ExperimentIdea[] {
  const ideas: ExperimentIdea[] = [];

  // Collect all posts across all platforms
  const allPosts: Post[] = [];
  const platformPosts: Record<string, Post[]> = {};
  for (const [platform, profile] of Object.entries(profiles)) {
    const posts = [...profile.posts];
    platformPosts[platform] = posts;
    allPosts.push(...posts);
  }

  // Cold start guard
  if (allPosts.length < 5) return [];

  // Classify content across all posts
  classifyContent(allPosts);

  // Per-platform analysis
  const platformEngagement: Record<string, ReturnType<typeof computeEngagementProfile>> = {};
  const platformRhythm: Record<string, ReturnType<typeof computeRhythm>> = {};
  for (const [platform, posts] of Object.entries(platformPosts)) {
    classifyContent(posts);
    platformEngagement[platform] = computeEngagementProfile(posts);
    platformRhythm[platform] = computeRhythm(posts);
  }

  // Global engagement profile and consistency
  const globalEngagement = computeEngagementProfile(allPosts);
  const globalConsistency = computePersonaConsistency(allPosts);

  // ------------------------------------------------------------------
  // Rule 1: Content gap -- high engagement but low volume
  // ------------------------------------------------------------------
  const totalPosts = allPosts.length;
  for (const cat of globalEngagement.byCategory) {
    if (cat.category === 'uncategorised') continue;
    const postPct = pct(cat.postCount, totalPosts);
    if (cat.meanEngagementRate > globalEngagement.overallRate && postPct < 15 && cat.postCount >= 1) {
      const ideaId = `idea-content-gap-${cat.category}`;
      if (treeCovers(existingTree, cat.category, cat.category)) continue;
      const currentPct = postPct;
      const suggestedPct = Math.min(currentPct * 2 + 5, 30);
      const engMult = globalEngagement.overallRate > 0
        ? (cat.meanEngagementRate / globalEngagement.overallRate).toFixed(1)
        : '2';
      ideas.push({
        id: ideaId,
        title: `Increase ${capitalise(cat.category)} Content`,
        hypothesis: `If you increase ${cat.category} content from ${currentPct}% to ${suggestedPct}%, engagement rate should improve by ~${engMult}x based on current per-category performance.`,
        series: cat.category,
        rationale: `${capitalise(cat.category)} has ${(cat.meanEngagementRate * 100).toFixed(1)}% engagement rate (${engMult}x above average) but only makes up ${currentPct}% of your posts.`,
        potentialImpact: cat.meanEngagementRate > globalEngagement.overallRate * 2 ? 'high' : 'medium',
        basedOn: [
          `${cat.category} engagement rate: ${(cat.meanEngagementRate * 100).toFixed(1)}%`,
          `Overall engagement rate: ${(globalEngagement.overallRate * 100).toFixed(1)}%`,
          `${cat.category} post share: ${currentPct}%`,
        ],
      });
      break; // One content gap idea max
    }
  }

  // ------------------------------------------------------------------
  // Rule 2: Cross-platform delta
  // ------------------------------------------------------------------
  const platforms = Object.keys(platformEngagement);
  if (platforms.length >= 2) {
    for (const cat of globalEngagement.byCategory) {
      if (cat.category === 'uncategorised') continue;
      if (treeCovers(existingTree, 'cross-platform', cat.category)) continue;

      let bestPlatform: string | null = null;
      let bestRate = 0;
      let worstPlatform: string | null = null;
      let worstRate = Infinity;

      for (const platform of platforms) {
        const platCat = platformEngagement[platform].byCategory.find(
          (c) => c.category === cat.category,
        );
        if (!platCat || platCat.postCount < 1) continue;
        if (platCat.meanEngagementRate > bestRate) {
          bestRate = platCat.meanEngagementRate;
          bestPlatform = platform;
        }
        if (platCat.meanEngagementRate < worstRate) {
          worstRate = platCat.meanEngagementRate;
          worstPlatform = platform;
        }
      }

      if (
        bestPlatform &&
        worstPlatform &&
        bestPlatform !== worstPlatform &&
        worstRate > 0 &&
        bestRate / worstRate >= 2
      ) {
        const ratio = (bestRate / worstRate).toFixed(1);
        ideas.push({
          id: `idea-cross-platform-${cat.category}`,
          title: `Test ${capitalise(cat.category)} on ${capitalise(worstPlatform)}`,
          hypothesis: `${capitalise(cat.category)} content gets ${ratio}x higher engagement on ${bestPlatform} vs ${worstPlatform}. Adapting the format for ${worstPlatform}'s audience could close the gap.`,
          series: 'cross-platform',
          rationale: `${capitalise(bestPlatform)} achieves ${(bestRate * 100).toFixed(1)}% engagement for ${cat.category}, while ${worstPlatform} only gets ${(worstRate * 100).toFixed(1)}%.`,
          potentialImpact: bestRate / worstRate >= 3 ? 'high' : 'medium',
          basedOn: [
            `${bestPlatform} ${cat.category} engagement: ${(bestRate * 100).toFixed(1)}%`,
            `${worstPlatform} ${cat.category} engagement: ${(worstRate * 100).toFixed(1)}%`,
            `Gap ratio: ${ratio}x`,
          ],
        });
        break; // One cross-platform idea max
      }
    }
  }

  // ------------------------------------------------------------------
  // Rule 3: Rhythm anomaly -- best hour/day rarely used
  // ------------------------------------------------------------------
  // Use the platform with the most posts for rhythm analysis
  const primaryPlatform = Object.entries(platformPosts)
    .sort((a, b) => b[1].length - a[1].length)[0];
  if (primaryPlatform) {
    const [platName, platPosts] = primaryPlatform;
    const rhythm = platformRhythm[platName];
    if (rhythm && rhythm.bestHour !== null && rhythm.bestDayOfWeek !== null) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const bestDay = dayNames[rhythm.bestDayOfWeek];

      // Check if the best time slot is underutilised
      const datedPosts = platPosts.filter((p) => p.publishedAt);
      const postsAtBestHour = datedPosts.filter((p) => {
        const d = new Date(p.publishedAt!);
        return d.getUTCHours() === rhythm.bestHour;
      }).length;
      const postsAtBestDay = datedPosts.filter((p) => {
        const d = new Date(p.publishedAt!);
        return d.getUTCDay() === rhythm.bestDayOfWeek;
      }).length;

      const bestHourPct = pct(postsAtBestHour, datedPosts.length);
      const bestDayPct = pct(postsAtBestDay, datedPosts.length);

      // "Rarely" means < 15% of posts despite being the peak
      if (bestHourPct < 15 || bestDayPct < 15) {
        if (!treeCovers(existingTree, 'scheduling', 'rhythm')) {
          ideas.push({
            id: 'idea-rhythm-anomaly',
            title: 'Optimize Publishing Schedule',
            hypothesis: `Your best engagement window is ${bestDay}s around ${rhythm.bestHour}:00 UTC, but only ${Math.min(bestHourPct, bestDayPct)}% of posts target this slot. Scheduling more posts here could boost visibility.`,
            series: 'scheduling',
            rationale: `Peak engagement at hour ${rhythm.bestHour} (${bestHourPct}% of posts) and ${bestDay} (${bestDayPct}% of posts) suggests an underutilised scheduling opportunity.`,
            potentialImpact: 'medium',
            basedOn: [
              `Best posting hour: ${rhythm.bestHour}:00 UTC`,
              `Best posting day: ${bestDay}`,
              `Posts at best hour: ${bestHourPct}%`,
              `Posts at best day: ${bestDayPct}%`,
            ],
          });
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Rule 4: Persona drift -- consistency dropping
  // ------------------------------------------------------------------
  if (globalConsistency.score < 60 && globalConsistency.score > 0 && allPosts.length >= 10) {
    if (!treeCovers(existingTree, 'content-identity', 'refocus')) {
      const dominant = globalConsistency.dominantCategory ?? 'unknown';
      ideas.push({
        id: 'idea-persona-drift',
        title: 'Refocus Content Identity',
        hypothesis: `Persona consistency is at ${globalConsistency.score}/100. Refocusing on ${dominant} (currently ${globalConsistency.dominantCategoryPct}% of posts) and reducing topic scatter could strengthen audience retention.`,
        series: 'content-identity',
        rationale: `Consistency score of ${globalConsistency.score} indicates frequent topic switching, which can dilute audience expectations and reduce repeat viewership.`,
        potentialImpact: globalConsistency.score < 40 ? 'high' : 'medium',
        basedOn: [
          `Persona consistency: ${globalConsistency.score}/100`,
          `Dominant category: ${dominant} (${globalConsistency.dominantCategoryPct}%)`,
          `Threshold for consistent: 60/100`,
        ],
      });
    }
  }

  // ------------------------------------------------------------------
  // Rule 5: Viral pattern -- any post with views 5x above average
  // ------------------------------------------------------------------
  if (allPosts.length >= 5) {
    const avgViews = allPosts.reduce((s, p) => s + p.views, 0) / allPosts.length;
    const viralPosts = allPosts
      .filter((p) => p.views >= avgViews * 5 && p.contentType)
      .sort((a, b) => b.views - a.views);

    if (viralPosts.length > 0) {
      const viral = viralPosts[0];
      const viralCategory = viral.contentType!;
      if (!treeCovers(existingTree, 'viral-replication', viralCategory)) {
        const viewsMultiple = (viral.views / avgViews).toFixed(1);
        ideas.push({
          id: `idea-viral-pattern-${viralCategory}`,
          title: `Replicate ${capitalise(viralCategory)} Viral Hit`,
          hypothesis: `One ${viralCategory} post achieved ${viewsMultiple}x average views. Replicating its characteristics (format, length, hook style) in a series of 3-5 posts could capture similar audience spikes.`,
          series: 'viral-replication',
          rationale: `Post "${viral.desc.slice(0, 40)}..." got ${viral.views.toLocaleString()} views vs ${Math.round(avgViews).toLocaleString()} average -- a ${viewsMultiple}x outlier.`,
          potentialImpact: viral.views >= avgViews * 10 ? 'high' : 'medium',
          basedOn: [
            `Viral post views: ${viral.views.toLocaleString()}`,
            `Average views: ${Math.round(avgViews).toLocaleString()}`,
            `Multiple: ${viewsMultiple}x`,
            `Category: ${viralCategory}`,
          ],
        });
      }
    }
  }

  // ------------------------------------------------------------------
  // Sort by impact and cap at 5
  // ------------------------------------------------------------------
  ideas.sort((a, b) => {
    const impactDiff = IMPACT_ORDER[a.potentialImpact] - IMPACT_ORDER[b.potentialImpact];
    if (impactDiff !== 0) return impactDiff;
    return a.id.localeCompare(b.id); // Deterministic tiebreak
  });

  return ideas.slice(0, 5);
}
