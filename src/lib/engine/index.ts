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
  overallScore,
} from './persona';

// -- Cross-platform comparator --
export {
  type PlatformSummary,
  type ComparisonInsight,
  type CrossPlatformComparison,
  comparePlatforms,
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
  exportToICS,
} from './content-planner';

// -- Experiment idea generator --
export {
  type ExperimentIdea,
  generateExperimentIdeas,
} from './idea-generator';
