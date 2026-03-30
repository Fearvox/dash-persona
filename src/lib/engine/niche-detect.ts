/**
 * Niche auto-detection — maps a creator's content distribution to one of the
 * 10 benchmark niches defined in benchmark-data.ts.
 *
 * Uses pre-computed content distribution when available, otherwise
 * classifies posts on-the-fly via the PersonaScoreEngine.
 *
 * @module engine/niche-detect
 */

import type { CreatorProfile } from '../schema/creator-data';
import { classifyContent } from './persona';
import {
  NICHE_BENCHMARKS,
  BENCHMARK_NICHES,
  type BenchmarkNiche,
} from './benchmark-data';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Category → niche mapping
// ---------------------------------------------------------------------------

/**
 * Maps each of the 30 content categories (from persona.ts) to one of the
 * 10 benchmark niches. Categories not listed here fall back to DEFAULT_NICHE.
 */
export const CATEGORY_TO_NICHE: Record<string, BenchmarkNiche> = {
  // tutorial niche
  tutorial: 'tutorial',
  knowledge: 'tutorial',
  language: 'tutorial',

  // entertainment niche
  entertainment: 'entertainment',
  comedy_skit: 'entertainment',
  story: 'entertainment',
  emotion: 'entertainment',
  music: 'entertainment',
  dance: 'entertainment',

  // food niche
  food: 'food',

  // fitness niche
  fitness: 'fitness',
  health: 'fitness',

  // beauty niche
  beauty: 'beauty',

  // fashion niche
  fashion: 'fashion',

  // tech niche
  tech: 'tech',

  // travel niche
  travel: 'travel',
  outdoor: 'travel',

  // gaming niche
  gaming: 'gaming',
};

const DEFAULT_NICHE: BenchmarkNiche = 'lifestyle';

// Ensure BENCHMARK_NICHES is referenced to avoid unused-import lint warnings.
// (It is exported from benchmark-data and imported here for completeness.)
void BENCHMARK_NICHES;

// ---------------------------------------------------------------------------
// detectNiche
// ---------------------------------------------------------------------------

export interface NicheDetectionResult {
  niche: BenchmarkNiche;
  /** Human-readable label from NICHE_BENCHMARKS. */
  label: string;
  /** Fraction 0-1 representing the dominant niche's share of content. */
  confidence: number;
}

/**
 * Detect the primary niche for a creator profile.
 *
 * @param profile - The creator profile to analyse.
 * @param contentDistribution - Optional pre-computed distribution
 *   (category slug → percentage 0-100). When omitted the function
 *   classifies `profile.posts` itself.
 */
export function detectNiche(
  profile: CreatorProfile,
  contentDistribution?: Record<string, number>,
): NicheDetectionResult {
  // Build distribution from pre-computed data or by classifying posts
  let dist: Record<string, number>;

  if (contentDistribution && Object.keys(contentDistribution).length > 0) {
    dist = contentDistribution;
  } else {
    if (profile.posts.length === 0) {
      return {
        niche: DEFAULT_NICHE,
        label: t('engine.niche.' + DEFAULT_NICHE),
        confidence: 0,
      };
    }

    const classified = classifyContent([...profile.posts]);
    dist = {};
    for (const [cat, pct] of classified) {
      dist[cat] = pct;
    }
  }

  // Aggregate category percentages into niche scores
  const nicheScores = new Map<BenchmarkNiche, number>();
  for (const [cat, pct] of Object.entries(dist)) {
    const niche: BenchmarkNiche = (CATEGORY_TO_NICHE[cat] as BenchmarkNiche | undefined) ?? DEFAULT_NICHE;
    nicheScores.set(niche, (nicheScores.get(niche) ?? 0) + pct);
  }

  // Pick the niche with the highest aggregated percentage
  let bestNiche: BenchmarkNiche = DEFAULT_NICHE;
  let bestScore = 0;
  for (const [niche, score] of nicheScores) {
    if (score > bestScore) {
      bestScore = score;
      bestNiche = niche;
    }
  }

  const confidence = Math.min(bestScore / 100, 1);

  return {
    niche: bestNiche,
    label: t('engine.niche.' + bestNiche),
    confidence,
  };
}
