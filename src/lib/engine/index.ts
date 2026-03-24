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
} from './benchmark';

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
