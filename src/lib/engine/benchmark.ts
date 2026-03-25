/**
 * BenchmarkAnalyzer -- compare a creator against benchmark profiles.
 *
 * **MVP scope**: compares basic aggregate metrics (followers, engagement
 * rate, posting frequency). The data structures are designed for v2
 * expansion (per-category benchmarks, percentile rankings, etc.).
 *
 * @module engine/benchmark
 */

import type { CreatorProfile, BenchmarkProfile, Post } from '../schema/creator-data';
import { detectNiche } from './niche-detect';
import { generateBenchmarkProfiles, NICHE_BENCHMARKS, type BenchmarkNiche } from './benchmark-data';
import type { PersonaScore } from './persona';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** How the user's metric compares to the benchmark. */
export type BenchmarkRank = 'above' | 'at' | 'below';

/** Comparison result for a single metric. */
export interface MetricBenchmark {
  /** Metric name (human-readable). */
  metric: string;
  /** User's value. */
  userValue: number;
  /** Benchmark mean value. */
  benchmarkMean: number;
  /** Benchmark median value. */
  benchmarkMedian: number;
  /** How the user ranks relative to the benchmark set. */
  rank: BenchmarkRank;
  /**
   * Percentile position (0-100). Placeholder: computed as a rough linear
   * interpolation in MVP; v2 will use proper distribution fitting.
   */
  percentile: number;
}

/** Full benchmark comparison result. */
export interface BenchmarkResult {
  /** Number of benchmark profiles used for comparison. */
  benchmarkCount: number;
  /** Per-metric comparison results. */
  metrics: MetricBenchmark[];
  /** Human-readable summary sentence. */
  summary: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Compute the mean engagement rate of a set of posts. */
function meanEngagementRate(posts: Post[]): number {
  if (posts.length === 0) return 0;
  const rates = posts.map((p) =>
    p.views > 0 ? (p.likes + p.comments + p.shares + p.saves) / p.views : 0,
  );
  return rates.reduce((s, r) => s + r, 0) / rates.length;
}

/** Compute the median of a sorted numeric array. */
function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Determine rank relative to benchmark mean, using a +/- 15% tolerance
 * band for "at" classification.
 */
function rankAgainst(userValue: number, benchMean: number): BenchmarkRank {
  if (benchMean === 0) return userValue > 0 ? 'above' : 'at';
  const ratio = userValue / benchMean;
  if (ratio >= 1.15) return 'above';
  if (ratio <= 0.85) return 'below';
  return 'at';
}

/**
 * Rough percentile estimation via linear interpolation among the
 * benchmark values. Returns 0-100.
 */
function roughPercentile(userValue: number, sorted: number[]): number {
  if (sorted.length === 0) return 50;
  if (userValue <= sorted[0]) return 0;
  if (userValue >= sorted[sorted.length - 1]) return 100;
  // Binary search: count elements <= userValue in O(log n)
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] <= userValue) lo = mid + 1;
    else hi = mid;
  }
  return Math.round((lo / sorted.length) * 100);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compare a user's creator profile against a set of benchmark profiles.
 *
 * **MVP metrics compared:**
 *  - Followers
 *  - Mean engagement rate
 *  - Post count (total published)
 *
 * @param user        The user's {@link CreatorProfile}.
 * @param benchmarks  Array of {@link BenchmarkProfile} for comparison.
 * @returns Structured comparison with per-metric results and summary.
 */
export function compareToBenchmark(
  user: CreatorProfile,
  benchmarks: BenchmarkProfile[],
): BenchmarkResult {
  if (benchmarks.length === 0) {
    return {
      benchmarkCount: 0,
      metrics: [],
      summary: 'No benchmark profiles available for comparison.',
    };
  }

  // Extract benchmark values
  const benchFollowers = benchmarks
    .map((b) => b.profile.followers)
    .sort((a, b) => a - b);
  const benchEngRates = benchmarks
    .map((b) => meanEngagementRate(b.posts))
    .sort((a, b) => a - b);
  const benchPostCounts = benchmarks
    .map((b) => b.posts.length)
    .sort((a, b) => a - b);

  // User values
  const userFollowers = user.profile.followers;
  const userEngRate = meanEngagementRate(user.posts);
  const userPostCount = user.posts.length;

  // Pre-compute means once (replaces 6 redundant reduce calls)
  const meanFollowers = benchFollowers.reduce((s, v) => s + v, 0) / benchFollowers.length;
  const meanEngRate = benchEngRates.reduce((s, v) => s + v, 0) / benchEngRates.length;
  const meanPostCount = benchPostCounts.reduce((s, v) => s + v, 0) / benchPostCounts.length;

  // Build metric comparisons
  const followersBench: MetricBenchmark = {
    metric: 'Followers',
    userValue: userFollowers,
    benchmarkMean: meanFollowers,
    benchmarkMedian: median(benchFollowers),
    rank: rankAgainst(userFollowers, meanFollowers),
    percentile: roughPercentile(userFollowers, benchFollowers),
  };

  const engRateBench: MetricBenchmark = {
    metric: 'Engagement Rate',
    userValue: Math.round(userEngRate * 10000) / 10000,
    benchmarkMean: Math.round(meanEngRate * 10000) / 10000,
    benchmarkMedian: Math.round(median(benchEngRates) * 10000) / 10000,
    rank: rankAgainst(userEngRate, meanEngRate),
    percentile: roughPercentile(userEngRate, benchEngRates),
  };

  const postCountBench: MetricBenchmark = {
    metric: 'Post Count',
    userValue: userPostCount,
    benchmarkMean: meanPostCount,
    benchmarkMedian: median(benchPostCounts),
    rank: rankAgainst(userPostCount, meanPostCount),
    percentile: roughPercentile(userPostCount, benchPostCounts),
  };

  const metrics = [followersBench, engRateBench, postCountBench];

  // Generate summary
  const above = metrics.filter((m) => m.rank === 'above').map((m) => m.metric);
  const below = metrics.filter((m) => m.rank === 'below').map((m) => m.metric);

  let summary: string;
  if (above.length === metrics.length) {
    summary = `Outperforming benchmarks across all metrics (${above.join(', ')}).`;
  } else if (below.length === metrics.length) {
    summary = `Below benchmark averages on all metrics (${below.join(', ')}). Focus on the highest-gap area first.`;
  } else if (above.length > 0 && below.length > 0) {
    summary = `Above benchmarks in ${above.join(', ')}; below in ${below.join(', ')}.`;
  } else {
    summary = `Performing at benchmark average levels across all compared metrics.`;
  }

  return {
    benchmarkCount: benchmarks.length,
    metrics,
    summary,
  };
}

/**
 * Niche-aware benchmark comparison. Auto-detects the user's content niche,
 * generates benchmark profiles for that niche, and runs the comparison.
 */
export function compareToBenchmarkByNiche(
  user: CreatorProfile,
  userScore?: PersonaScore,
): BenchmarkResult & { niche: string; nicheLabel: string } {
  const { niche, label } = detectNiche(user, userScore?.contentDistribution);
  const benchmarks = generateBenchmarkProfiles(niche as BenchmarkNiche, 20);
  const result = compareToBenchmark(user, benchmarks);
  return { ...result, niche, nicheLabel: label };
}
