# Engine Statistical Upgrade + Signal Collector — Design Spec

**Date:** 2026-03-30
**Status:** Draft
**Sprint:** Engine Optimization (Phase 1 of 3: Engine → Adapters → UX)

## Context

DashPersona's 11-module analysis engine produces creator intelligence using deterministic algorithms. An audit revealed that 5 modules use statistically unsound methods (linear interpolation on power-law data, unvalidated trend slopes, fixed thresholds on variable sample sizes, mixed scoring scales). This degrades trust in analysis results — the core brand promise ("Zero AI. Pure algorithms.").

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
/** Empirical CDF percentile: proportion of sorted values <= userValue */
function empiricalPercentile(userValue: number, sorted: number[]): number
// Returns 0-100. Correct for power-law distributions.

/** Batch percentile: single sort, multiple queries */
function batchPercentile(values: number[], sorted: number[]): number[]
```

**Replaces:** `benchmark.ts` binary search with linear interpolation (assumes uniform distribution).

#### `regression.ts`

```ts
interface TrendResult {
  slope: number
  intercept: number
  rSquared: number
  pValue: number        // t-test for H0: slope = 0
  significant: boolean  // pValue < 0.05
}

/** Simple linear regression with t-test significance */
function linearTrend(values: number[]): TrendResult

/** Minimum sample guard: returns null if n < minN */
function safeTrend(values: number[], minN?: number): TrendResult | null
// Default minN = 7
```

**Replaces:** `persona.ts` raw slope calculation with no validation. When `significant === false`, downstream modules (strategy, idea-generator) suppress trend-based suggestions.

#### `normalize.ts`

```ts
/** z-score: (value - mean) / stddev */
function zScore(value: number, values: number[]): number

/** Batch normalize to 0-100 range (min-max after z-score) */
function normalizeScores(scores: Record<string, number>): Record<string, number>

/** Safe division: returns fallback when divisor = 0 */
function safeDivide(a: number, b: number, fallback?: number): number
```

**Replaces:** `next-content.ts` mixed scales (0-100, 25/50/75/95, raw heat).

#### `threshold.ts`

```ts
/** Adaptive threshold: widens for small samples, tightens for large */
function adaptiveThreshold(
  baseThreshold: number,  // ideal threshold at refN samples
  sampleSize: number,
  minSamples?: number     // below this, returns Infinity (rule doesn't fire)
): number
// Formula: baseThreshold * sqrt(refN / max(sampleSize, minSamples))
// refN = 100
```

**Replaces:** `comparator.ts` fixed 1.5x/2.0x, `idea-generator.ts` fixed 15%.

### Module Integration Plan

#### `benchmark.ts` (3/5 → 4/5)

- Replace `findPercentile()` binary search with `empiricalPercentile()`
- Add per-category benchmark: compute percentile for user's engagement rate within their top niche category
- New output field: `categoryPercentiles: Record<string, number>`

#### `persona.ts` (3.5/5 → 4.5/5)

- Replace engagement trend raw slope with `safeTrend()`
- Add `trendReliable: boolean` to PersonaScore.engagement
- Consistency window: make configurable (default = current behavior)
- No change to content classification (inverted index is already efficient)

#### `comparator.ts` (3.5/5 → 4.5/5)

- Replace fixed 1.5x engagement gap with `adaptiveThreshold(1.5, sampleSize)`
- Replace fixed 2.0x audience gap with `adaptiveThreshold(2.0, sampleSize)`
- Replace fixed 2.0x per-category gap with `adaptiveThreshold(2.0, categoryPostCount)`
- When threshold returns Infinity (too few samples), skip that insight

#### `next-content.ts` (2.5/5 → 4/5)

- Pass all 4 scoring dimensions through `normalizeScores()` before computing confidence
- Confidence = mean of normalized scores (all on same 0-100 scale)
- Priority thresholds remain 65/40 (now meaningful because inputs are comparable)
- Add `minSamples` guard: rules with < 5 relevant posts don't fire

#### `idea-generator.ts` (3.5/5 → 4.5/5)

- Replace fixed 15% content gap threshold with `adaptiveThreshold(0.15, totalPosts)`
- Replace fixed 2x cross-platform gap with `adaptiveThreshold(2.0, min(platformAPosts, platformBPosts))`
- Replace fixed 15% rhythm threshold with `adaptiveThreshold(0.15, totalPosts)`
- Add `minSamples` guard on all 5 rules

### New: `src/lib/engine/signal-collector.ts`

Unified signal extraction from CreatorProfile + PersonaScore.

```ts
interface CreatorSignal {
  id: string
  category: 'engagement' | 'rhythm' | 'growth' | 'content' | 'audience'
  rawValue: number
  normalizedValue: number  // 0-100 via normalizeScores
  confidence: number       // 0-1 based on sample size
  source: string           // originating module
}

interface SignalVector {
  profileId: string
  platform: string
  signals: CreatorSignal[]
  collectedAt: string
}

function collectSignals(profile: CreatorProfile, score: PersonaScore): SignalVector
```

**Signals (~15):**

| Signal ID | Category | Source |
|-----------|----------|--------|
| engagementRate | engagement | persona.ts |
| engagementTrend | engagement | persona.ts + regression |
| saveRate | engagement | content-analyzer |
| completionRate | engagement | adapter raw data |
| postingFrequency | rhythm | persona.ts |
| consistencyScore | rhythm | persona.ts |
| bestPostingHour | rhythm | content-planner |
| followerGrowthRate | growth | growth.ts |
| growthMomentum | growth | persona.ts |
| contentDiversity | content | persona.ts |
| topCategoryShare | content | persona.ts |
| hookUsageRate | content | content-analyzer |
| hashtagCoverage | content | content-analyzer |
| viralPostRatio | content | idea-generator |
| audienceQuality | audience | fanPortrait (if available) |

Confidence formula: `min(1, sampleSize / refN)` where refN = 30 (one month of daily posts).

### Testing Strategy (T2)

#### Stats unit tests (`stats/*.test.ts`)

- `percentile.test.ts`: Known distributions (uniform, power-law), edge cases (empty, single value)
- `regression.test.ts`: Known slope datasets, verify p-value against scipy reference values
- `normalize.test.ts`: Invariants (output in [0, 100], mean ≈ 50 for uniform input)
- `threshold.test.ts`: Monotonicity (larger sample → stricter threshold), minSamples guard

#### Before/after comparison tests (`*.comparison.test.ts`)

Each test:
1. Runs the OLD algorithm on demo fixture (tutorial persona, Douyin)
2. Runs the NEW algorithm on same fixture
3. Asserts output is structurally identical (same fields, same types)
4. Asserts numeric drift is within acceptable range (< 15% for percentiles, same direction for trends)
5. Asserts new fields exist (trendReliable, categoryPercentiles, etc.)

Fixture: Demo adapter's `tutorial:douyin` profile (deterministic via seeded PRNG).

#### Signal collector tests (`signal-collector.test.ts`)

- Structure validation: all signals have valid id, category, rawValue, normalizedValue, confidence
- Bounds: normalizedValue ∈ [0, 100], confidence ∈ [0, 1]
- Completeness: demo fixture produces ≥ 12 signals (some audience signals may be absent)

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
4. `next-content.ts` scoring dimensions on same 0-100 scale (verified by test)
5. `benchmark.ts` percentiles correct for power-law data (verified by test)
6. `persona.ts` trend marked unreliable when p > 0.05 (verified by test)
7. `comparator.ts` and `idea-generator.ts` suppress insights on n < 10 (verified by test)
8. `signal-collector.ts` produces valid SignalVector from demo fixture
