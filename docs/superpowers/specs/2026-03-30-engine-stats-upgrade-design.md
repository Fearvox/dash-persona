# Engine Statistical Upgrade + Signal Collector — Design Spec

**Date:** 2026-03-30
**Status:** Approved (post-review revision)
**Sprint:** Engine Optimization (Phase 1 of 3: Engine → Adapters → UX)

## Context

DashPersona's 11-module analysis engine produces creator intelligence using deterministic algorithms. An audit revealed that 5 modules use statistically unsound methods (tail-collapsing percentiles, unvalidated trend slopes, fixed thresholds on variable sample sizes, step-quantized scoring scales). This degrades trust in analysis results — the core brand promise ("Zero AI. Pure algorithms.").

Additionally, signal extraction logic is scattered across modules with no unified format, blocking future ranking/recommendation capabilities.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Optimization depth | Practical (A) + Signal groundwork (C2) | Maximum ROI without over-engineering |
| Implementation path | Bottom-Up (stats library first) | Zero-risk foundation, progressive integration |
| Testing strategy | T2 (before/after comparison) | Catches output drift from algorithm changes |
| Modules to change | 5 of 11 (benchmark, persona, comparator, next-content, idea-generator) | Bottom 5 quality scores, highest impact |
| Modules to skip | 6 of 11 (growth, strategy, content-planner, content-analyzer, explain, persona-tree) | Already 4/5 quality or low user impact |

## Architecture

### New: `src/lib/engine/stats/`

Shared statistical primitives. Pure functions, zero dependencies, zero side effects.

#### `percentile.ts`

```ts
/**
 * Hazen plotting position percentile.
 * Fixes tail collapse in the current roughPercentile (returns 0 at bottom, 100 at top).
 * Formula: (rank + 0.5) / N * 100
 * Gives non-zero percentiles at extremes; well-behaved for skewed/power-law distributions.
 */
function empiricalPercentile(userValue: number, sorted: number[]): number
// Returns 0.x - 99.x (never exactly 0 or 100). Handles empty array → 50.

/** Batch percentile: sort once, query multiple values against the same sorted array */
function batchPercentile(values: number[], sorted: number[]): number[]
// Used by benchmark.ts when computing multiple metrics against the same benchmark set.
```

**Replaces:** `benchmark.ts` `roughPercentile()` which uses rank/N ratio. The current implementation collapses the bottom tail (all values ≤ min → 0) and top tail (all values ≥ max → 100). For power-law engagement data, the top tail is the most informative region — Hazen plotting position resolves this.

#### `regression.ts`

```ts
interface TrendResult {
  slope: number
  intercept: number
  rSquared: number
  pValue: number        // t-test for H0: slope = 0
  significant: boolean  // pValue < 0.05
}

/** Simple OLS linear regression with t-test significance */
function linearTrend(values: number[]): TrendResult

/**
 * Minimum sample guard: returns null if n < minN.
 * Default minN = 5 (preserves current persona.ts behavior which requires rates.length >= 4;
 * using 5 gives one extra data point for regression quality).
 */
function safeTrend(values: number[], minN?: number): TrendResult | null
```

**Replaces:** `persona.ts` difference-of-means trend calculation (mean of newer half minus mean of older half, lines 357-367). The current approach detects step changes but misses gradual trends. OLS regression captures gradual slopes and provides p-value for significance testing. When `significant === false`, downstream modules (strategy, idea-generator) suppress trend-based suggestions.

**Note on minN:** Default is 5 (not 7) to avoid breaking existing behavior for creators with 4-6 posts. The comparison test must verify this edge case: creators with exactly 5 posts should still get trend data.

#### `normalize.ts`

```ts
/** Safe division: returns fallback when divisor = 0 */
function safeDivide(a: number, b: number, fallback?: number): number

/**
 * Recalibrate step-quantized scores to continuous 0-100.
 * Maps discrete steps (e.g., 0/25/50/75/95) to evenly-spaced continuous values
 * using linear interpolation between known step positions.
 */
function recalibrateSteps(value: number, steps: number[]): number

/**
 * Rank-based scoring across a batch of suggestions.
 * For each dimension, ranks all suggestions (1 = lowest, N = highest),
 * then converts rank to 0-100 scale: (rank - 0.5) / N * 100.
 * Produces comparable distributions regardless of original formula shapes.
 */
function rankNormalize(
  suggestions: Array<Record<string, number>>,
  dimensions: string[]
): Array<Record<string, number>>
```

**Replaces:** `next-content.ts` mixed scoring scales. The real issue is not z-score (which requires a population distribution we don't have for single suggestions), but that `nicheRelevance` is step-quantized (0/25/50/75/95) while `trendAlignment` is continuous. `rankNormalize` solves this: rank each dimension across all suggestions in a batch, then average ranks for confidence. This is deterministic and insensitive to formula shape.

#### `threshold.ts`

```ts
/**
 * Adaptive threshold: widens for small samples, tightens for large.
 * Formula: baseThreshold * sqrt(refN / max(sampleSize, minSamples))
 * refN = 100 (reference sample size where threshold equals baseThreshold)
 *
 * Behavior by sample size (for baseThreshold = 1.5, i.e., comparator engagement gap):
 *   n=10:  threshold = 4.74  (very wide — need 4.74x gap to trigger)
 *   n=25:  threshold = 3.00  (wide)
 *   n=50:  threshold = 2.12  (moderate)
 *   n=100: threshold = 1.50  (baseline)
 *   n=400: threshold = 0.75  (tight — smaller effects detectable)
 *
 * For percentage-based thresholds (idea-generator, baseThreshold = 0.15):
 *   n=10:  threshold = 0.474 (47.4% — very conservative, almost never fires)
 *   n=25:  threshold = 0.300 (30%)
 *   n=50:  threshold = 0.212 (21.2%)
 *   n=100: threshold = 0.150 (15% — baseline)
 *   n=400: threshold = 0.075 (7.5% — can detect small gaps)
 *
 * For percentage thresholds on small samples: this is CORRECT behavior.
 * With only 10 posts, a "15% content gap" is just 1.5 posts — noise.
 * Requiring 47.4% (≈5 posts) is more appropriate for statistical reliability.
 */
function adaptiveThreshold(
  baseThreshold: number,
  sampleSize: number,
  minSamples?: number     // below this, returns Infinity (rule doesn't fire)
): number
// Default minSamples = 5
```

**Replaces:** `comparator.ts` fixed 1.5x/2.0x, `idea-generator.ts` fixed 15%.

### Module Integration Plan

#### `benchmark.ts` (3/5 → 4/5)

- Replace `roughPercentile()` with `empiricalPercentile()` (Hazen plotting position)
- Add per-category benchmark: compute percentile for user's engagement rate within their top niche category
- New output field: `categoryPercentiles: Record<string, number>`
- `batchPercentile()` used when computing followers + ER + postCount against the same benchmark set

#### `persona.ts` (3.5/5 → 4.5/5)

- Replace difference-of-means trend (mean of newer half − mean of older half) with `safeTrend()` OLS regression
- Add `trendReliable: boolean` to `PersonaScore.engagement` (true when `pValue < 0.05`)
- `safeTrend` default minN = 5 (preserves current behavior for creators with 4-6 posts)
- Consistency window: make configurable (default = current behavior)
- No change to content classification (inverted index is already efficient)

#### `comparator.ts` (3.5/5 → 4.5/5)

- Replace fixed 1.5x engagement gap with `adaptiveThreshold(1.5, sampleSize)`
- Replace fixed 2.0x audience gap with `adaptiveThreshold(2.0, sampleSize)`
- Replace fixed 2.0x per-category gap with `adaptiveThreshold(2.0, categoryPostCount)`
- When threshold returns Infinity (too few samples), skip that insight

#### `next-content.ts` (2.5/5 → 4/5)

- Replace `clamp100()` scoring with `rankNormalize()` across all suggestions in a batch
- Confidence = mean of rank-normalized scores (all on same 0-100 scale, comparable distributions)
- Priority thresholds remain 65/40 (now meaningful because inputs are comparable)
- Add `minSamples` guard: rules with < 5 relevant posts don't fire
- Recalibrate `nicheRelevance` from step-quantized (0/25/50/75/95) to continuous using `recalibrateSteps()`

#### `idea-generator.ts` (3.5/5 → 4.5/5)

- Replace fixed 15% content gap threshold with `adaptiveThreshold(0.15, totalPosts)`
- Replace fixed 2x cross-platform gap with `adaptiveThreshold(2.0, min(platformAPosts, platformBPosts))`
- Replace fixed 15% rhythm threshold with `adaptiveThreshold(0.15, totalPosts)`
- Add `minSamples` guard on all 5 rules (default = 5)

### New: `src/lib/engine/signal-collector.ts`

Unified signal extraction from CreatorProfile + PersonaScore.

```ts
interface CreatorSignal {
  id: string
  category: 'engagement' | 'rhythm' | 'growth' | 'content' | 'audience'
  rawValue: number
  normalizedValue: number  // 0-100 via rankNormalize (across signals in same category)
  confidence: number       // 0-1, signal-specific (see confidence mapping below)
  source: string           // originating module
}

interface SignalVector {
  profileId: string
  platform: string
  signals: CreatorSignal[]  // sorted by category (alpha), then by id (alpha) for determinism
  collectedAt: string
}

function collectSignals(profile: CreatorProfile, score: PersonaScore): SignalVector
```

**Signals (~15):**

| Signal ID | Category | Source | Confidence Formula |
|-----------|----------|--------|--------------------|
| engagementRate | engagement | persona.ts | `min(1, postCount / 30)` |
| engagementTrend | engagement | persona.ts + safeTrend | `trendReliable ? min(1, postCount / 30) : 0.2` |
| saveRate | engagement | raw Post.saves / Post.likes average | `min(1, postsWithSaves / 15)` |
| completionRate | engagement | raw Post.completionRate average (not persona.ts weighted) | `min(1, postsWithCompletionRate / 15)` |
| postingFrequency | rhythm | persona.ts rhythm.postsPerWeek | `min(1, postCount / 14)` |
| consistencyScore | rhythm | persona.ts consistency.score | `min(1, postCount / 20)` |
| bestPostingHour | rhythm | content-planner peak hours | entropy-based: `1 - (entropy / maxEntropy)` where high entropy = uniform = low confidence |
| followerGrowthRate | growth | growth.ts delta | `min(1, dataPointsUsed / 7)` (snapshots, not posts) |
| growthMomentum | growth | persona.ts growthHealth | `min(1, timeseriesLength / 14)` |
| contentDiversity | content | persona.ts content mix categories | `min(1, postCount / 20)` |
| topCategoryShare | content | persona.ts top category % | `min(1, postCount / 20)` |
| hookUsageRate | content | compute inline: count posts matching hook regex / total | `min(1, postCount / 20)` |
| hashtagCoverage | content | compute inline: posts with ≥1 hashtag / total | `min(1, postCount / 20)` |
| viralPostRatio | content | compute inline: posts with views ≥ 5x mean / total | `min(1, postCount / 20)` |
| audienceQuality | audience | fanPortrait gender/territory entropy | `fanPortrait ? 0.8 : 0` (snapshot, no sample size) |

**Notes:**
- `completionRate` is raw `Post.completionRate` average, NOT the persona.ts engagement-weighted version. This gives a clean signal independent of the engagement formula.
- `viralPostRatio`, `hookUsageRate`, `hashtagCoverage` are computed inline in signal-collector (not imported from idea-generator or content-analyzer) to avoid coupling.
- `bestPostingHour` confidence uses information entropy of the hourly distribution: uniform distribution (all hours equal) → confidence near 0; peaked distribution (clear best hour) → confidence near 1.
- Signals are sorted by `category` (alphabetical), then `id` (alphabetical) for deterministic output.

### Testing Strategy (T2)

#### Stats unit tests (`stats/*.test.ts`)

- `percentile.test.ts`: Known distributions (uniform, power-law), edge cases (empty, single value), verify Hazen gives non-zero at extremes
- `regression.test.ts`: Known slope datasets, verify p-value against hand-calculated reference values, minN guard
- `normalize.test.ts`: `recalibrateSteps` monotonicity, `rankNormalize` output in [0, 100], `safeDivide` fallback
- `threshold.test.ts`: Monotonicity (larger sample → stricter threshold), minSamples guard, verify expected values at n=10/25/50/100/400

#### Before/after comparison tests (`*.comparison.test.ts`)

Each test:
1. Runs the OLD algorithm on demo fixture (tutorial persona, Douyin)
2. Runs the NEW algorithm on same fixture
3. Asserts output is structurally identical (same fields, same types)
4. Asserts benchmark percentile drift is within acceptable range (< 15 percentage points)
5. Asserts trend DIRECTION (positive/negative/zero) is preserved (numeric values will differ since we're changing from difference-of-means to OLS slope)
6. Asserts new fields exist (trendReliable, categoryPercentiles, etc.)
7. Edge case: creators with exactly 5 posts still get trend data (minN boundary)

Fixture: Demo adapter's `tutorial:douyin` profile (deterministic via seeded PRNG).

#### Signal collector tests (`signal-collector.test.ts`)

- Structure validation: all signals have valid id, category, rawValue, normalizedValue, confidence
- Bounds: normalizedValue ∈ [0, 100], confidence ∈ [0, 1]
- Ordering: signals sorted by category then id
- Completeness: demo fixture produces ≥ 12 signals (audienceQuality absent when no fanPortrait)
- Determinism: same input → same output (run twice, compare)

## Out of Scope

- `explain.ts` multiplier changes (format layer, low user impact)
- `persona-tree.ts` growth stub (requires history infrastructure)
- Distribution fitting (beta/lognormal — academic, low ROI)
- Confidence interval display in UI (engine-only sprint)
- Adapter layer changes (next sprint)
- UI changes (third sprint)

## Success Criteria

1. `npm run build` passes
2. `npm run test` — all 220 existing tests pass (no regression)
3. ~30 new tests added (stats unit + comparison + signal collector)
4. `next-content.ts` scoring via `rankNormalize` produces comparable dimensions (verified by test)
5. `benchmark.ts` Hazen percentiles give non-zero values at distribution extremes (verified by test)
6. `persona.ts` trend marked unreliable when p > 0.05 (verified by test)
7. `comparator.ts` and `idea-generator.ts` suppress insights on n < minSamples (verified by test)
8. `signal-collector.ts` produces valid, deterministic SignalVector from demo fixture

## Review Log

- **v1 (2026-03-30):** Initial draft
- **v2 (2026-03-30):** Post-review fixes:
  - C1: Fixed percentile description — current `roughPercentile` already does rank-based CDF, real issue is tail collapse. Specified Hazen plotting position `(rank + 0.5) / N * 100`.
  - I1: Fixed persona.ts trend description — current algo is difference-of-means, not raw slope. Updated comparison test to check direction preservation, not numeric proximity.
  - I2: Added explicit threshold behavior table at n=10/25/50/100/400 for both multiplier and percentage use cases. Confirmed adaptive formula is correct for percentage thresholds.
  - I3: Replaced `normalizeScores` z-score approach with `rankNormalize` (rank-based scoring across suggestion batches) + `recalibrateSteps` for step-quantized dimensions. Z-score inappropriate for single values without population.
  - I4: Added per-signal confidence mapping table. Signals without post-count-based sample sizes use domain-specific formulas (entropy for bestPostingHour, snapshot flag for audienceQuality).
  - I5: Clarified completionRate is raw Post.completionRate average, independent of persona.ts engagement weighting. viralPostRatio/hookUsageRate/hashtagCoverage computed inline to avoid coupling.
  - S1: Added batchPercentile usage note (benchmark.ts multiple metrics against same set).
  - S2: Changed safeTrend default minN from 7 to 5 to preserve existing behavior.
  - S3: viralPostRatio computed inline in signal-collector, not imported from idea-generator.
  - S4: Added deterministic sort order for SignalVector.signals (category alpha, then id alpha).
