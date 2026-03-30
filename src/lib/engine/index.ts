/**
 * Barrel export for all DashPersona analysis engines.
 *
 * @example
 * ```ts
 * import {
 *   computePersonaScore,
 *   comparePlatforms,
 *   compareToBenchmark,
 *   generateStrategySuggestions,
 *   computeGrowthDelta,
 *   aggregateGrowth,
 * } from '@/lib/engine';
 * ```
 *
 * @module engine
 */

// -- Growth engine --
export {
  type MetricDelta,
  type GrowthDelta,
  type AggregatedGrowth,
  type SparklinePoint,
  sumViews,
  makeDelta,
  findBaselineEntry,
  computeGrowthDelta,
  aggregateGrowth,
  extractSparklineData,
  formatTimeLabel,
  formatDelta,
  formatNumber,
} from './growth';

// -- Persona engine --
export {
  type ContentDistribution,
  type CategoryEngagement,
  type EngagementProfile,
  type RhythmAnalysis,
  type ConsistencyScore,
  type Momentum,
  type GrowthHealth,
  type PersonaTag,
  type PersonaStatus,
  type PersonaScore,
  classifyContent,
  computeEngagementProfile,
  computeRhythm,
  computePersonaConsistency,
  computeGrowthHealth,
  generatePersonaTags,
  computePersonaScore,
  computePersonaScoreCached,
  overallScore,
} from './persona';

// -- Cross-platform comparator --
export {
  type PlatformSummary,
  type ComparisonInsight,
  type CrossPlatformComparison,
  comparePlatforms,
  comparePlatformsCached,
} from './comparator';

// -- Benchmark analyser --
export {
  type BenchmarkRank,
  type MetricBenchmark,
  type BenchmarkResult,
  compareToBenchmark,
  compareToBenchmarkByNiche,
} from './benchmark';
export {
  type BenchmarkNiche,
  BENCHMARK_NICHES,
  NICHE_BENCHMARKS,
  generateBenchmarkProfiles,
} from './benchmark-data';
export { detectNiche, CATEGORY_TO_NICHE } from './niche-detect';

// -- Content strategy engine --
export {
  type SuggestionPriority,
  type StrategySuggestion,
  generateStrategySuggestions,
} from './strategy';

// -- Persona event tree engine --
export {
  type TreeViewNode,
  type TreeView,
  buildTreeStructure,
  scoreNode,
  generateDemoTree,
  getTreeLanes,
  detectConflicts,
} from './persona-tree';

// -- Score explanation engine --
export {
  type ScoreFactor,
  type ScoreExplanation,
  explainPersonaScore,
  explainGrowthDelta,
  explainNodeScoring,
} from './explain';

// -- Content planner engine --
export {
  type ContentSlot,
  type ContentPlan,
  generateContentPlan,
  generateContentPlanCached,
  exportToICS,
} from './content-planner';

// -- Experiment idea generator --
export {
  type ExperimentIdea,
  generateExperimentIdeas,
} from './idea-generator';

// -- Signal collector --
export {
  type CreatorSignal,
  type SignalVector,
  collectSignals,
} from './signal-collector';

// -- Stats utilities --
export {
  empiricalPercentile,
  batchPercentile,
  type TrendResult,
  linearTrend,
  safeTrend,
  safeDivide,
  recalibrateSteps,
  rankNormalize,
  adaptiveThreshold,
} from './stats';

// ---------------------------------------------------------------------------
// Parallel engine runner
// ---------------------------------------------------------------------------

import type { CreatorProfile, Post } from '../schema/creator-data';
import { computePersonaScore, type PersonaScore } from './persona';
import { comparePlatforms, type CrossPlatformComparison } from './comparator';
import { explainPersonaScore, type ScoreExplanation } from './explain';
import { generateStrategySuggestions, type StrategySuggestion } from './strategy';
import { compareToBenchmarkByNiche, type BenchmarkResult } from './benchmark';
import { detectNiche } from './niche-detect';
import type { NicheDetectionResult } from './niche-detect';
import { collectSignals } from './signal-collector';
import type { SignalVector } from './signal-collector';

export interface AllEngineResults {
  personaScores: Record<string, PersonaScore>;
  explanations: Record<string, Record<string, ScoreExplanation>>;
  comparison: CrossPlatformComparison;
  suggestions: StrategySuggestion[];
  benchmarkResult: BenchmarkResult & { niche: string; nicheLabel: string };
  nicheResult: NicheDetectionResult;
  signalVectors: Record<string, SignalVector>;
  allPosts: Post[];
  bestPlatform: string;
}

/**
 * Run all 9 analysis engines in parallel via Promise.all.
 *
 * Each engine is pure and side-effect-free with no shared mutable state,
 * so parallel execution is safe and deterministic.
 */
export async function runAllEngines(
  profiles: Record<string, CreatorProfile>,
): Promise<AllEngineResults> {
  const platformEntries = Object.entries(profiles);

  // Phase 1: Persona scores (per-platform, independent) — parallel
  const scoreEntries = await Promise.all(
    platformEntries.map(async ([platform, profile]) => {
      const score = computePersonaScore(profile);
      return [platform, score] as const;
    }),
  );
  const personaScores: Record<string, PersonaScore> = Object.fromEntries(scoreEntries);

  // Phase 2: All remaining engines — parallel (they depend on personaScores)
  const comparison = comparePlatforms(Object.values(profiles));
  const bestPlatform = comparison.bestEngagementPlatform ?? platformEntries[0][0];
  const bestPersonaScore = personaScores[bestPlatform] ?? Object.values(personaScores)[0];
  const bestProfile = profiles[bestPlatform] ?? Object.values(profiles)[0];

  const [explanationEntries, suggestions, benchmarkResult, nicheResult, signalEntries] = await Promise.all([
    // Explanations (per-platform, parallel)
    Promise.all(
      platformEntries.map(async ([platform, profile]) => {
        const expl = explainPersonaScore(personaScores[platform], profile.posts);
        return [platform, expl] as const;
      }),
    ),
    // Strategy suggestions
    Promise.resolve(generateStrategySuggestions(bestPersonaScore, comparison)),
    // Benchmark
    Promise.resolve(compareToBenchmarkByNiche(bestProfile, bestPersonaScore)),
    // Niche detection
    Promise.resolve(detectNiche(bestProfile)),
    // Signal vectors (per-platform, parallel)
    Promise.all(
      platformEntries.map(async ([platform, profile]) => {
        const vector = collectSignals(profile, personaScores[platform]);
        return [platform, vector] as const;
      }),
    ),
  ]);

  const explanations: Record<string, Record<string, ScoreExplanation>> =
    Object.fromEntries(explanationEntries);

  const allPosts: Post[] = Object.values(profiles).flatMap((p) => p.posts);

  const signalVectors: Record<string, SignalVector> = Object.fromEntries(signalEntries);

  return {
    personaScores,
    explanations,
    comparison,
    suggestions,
    benchmarkResult,
    nicheResult,
    signalVectors,
    allPosts,
    bestPlatform,
  };
}
