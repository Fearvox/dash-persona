# Phase 4 Research: History & Comparison

**Date**: 2026-04-02  
**Prepared for**: P10 decision-making

---

## 1. History/Snapshot System

### What Exists

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/history/store.ts` | 324 | IndexedDB persistence for snapshots. `HistoryStore` interface with `saveSnapshot`, `getSnapshots`, `clearProfile`, `clearAll`. In-memory fallback. |
| `src/lib/history/snapshot.ts` | 58 | `extractSnapshot()` (profile → HistorySnapshot), `mergeHistory()` (dedup + sort + trim), `profileKeyFromProfile()`. |
| `src/lib/history/analysis-types.ts` | 161 | `AnalysisSnapshot` (timestamped analysis results) and `AnalysisDelta` (computed diff between two analyses). `computeAnalysisDelta()` function. |
| `src/lib/history/use-profile-history.ts` | 78 | React hook. Loads snapshots from IndexedDB, saves current profile as snapshot, merges with existing history. Exposes `collectNow()`. |
| `src/lib/history/use-analysis-delta.ts` | 35 | Hook that loads previous `AnalysisSnapshot` from IndexedDB and computes `AnalysisDelta`. |
| `src/lib/schema/snapshot.ts` | 139 | `CreatorSnapshot` wrapper format (schema version, collectedAt, platform, uniqueId, profile). File naming helpers. Not the same as `HistorySnapshot`. |
| `src/lib/schema/creator-data.ts:122` | — | `HistorySnapshot` definition: `{ fetchedAt: string, profile: { followers, likesTotal, videosCount } }`. Three numeric fields only. |

### Key Characteristics
- **Data model**: `HistorySnapshot` stores only 3 metrics (followers, likesTotal, videosCount) with a timestamp. No engagement rate, no SignalVector fields.
- **Storage**: IndexedDB with in-memory fallback. Key = `platform:uniqueId`. Max 365 snapshots per profile.
- **Analysis snapshots**: A *separate* store (`analysis`) holds `AnalysisSnapshot` objects (up to 100) with richer fields: overallScore, engagementRate, followers, likesTotal, postsAnalysed, momentum, consistencyScore, rhythmScore, nicheLabel/nicheConfidence.
- **No `getSnapshotsByDate` / `listSnapshots` with date range filtering** — only `getSnapshots(key)` returns all, sorted oldest-first. Client-side filtering needed.

### Gaps
- `HistorySnapshot` has only 3 fields — insufficient for the trend chart described in Criterion 1 (needs engagement trend, follower delta, etc.)
- No built-in date range query — `getSnapshots` returns everything; date filtering is client-side only
- `AnalysisSnapshot` has the richer fields but is tied to analysis events, not regular polling intervals

---

## 2. Existing Timeline/Trend Code

### What Exists

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/timeline/page.tsx` | 180 | Server component. Builds demo profile, tree, lanes, ideas. Passes `GrowthTrendChart` with `storeKeys` and `fallbackSnapshots`. No date granularity selector. |
| `src/app/timeline/timeline-client.tsx` | 966 | Client component. Shows experiment tree (mainline/branches/boundaries lanes), not growth history. No trend chart. |
| `src/app/calendar/page.tsx` | 126 | Server component. Generates content plan, renders `CalendarClient`. |
| `src/app/calendar/calendar-client.tsx` | 546 | Month-grid calendar UI. Navigation between months. Slot pills. Accept/dismiss slot status. ICS export. No trend/analytics. |
| `src/components/growth-trend-chart.tsx` | 373 | **The existing trend chart.** `ResponsiveContainer` + `LineChart` (recharts). `storeKeys` prop → loads from IndexedDB. Fallback to `fallbackSnapshots`. Metric toggles (followers/likes/videos). Range selector (7D/30D/90D/all). Summary stats (delta, % change). |

### GrowthTrendChart Details
- **Chart type**: Recharts `LineChart` with `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`
- **Metrics**: followers, likesTotal, videosCount — matches `HistorySnapshot.profile` exactly
- **Granularity selector**: 7D / 30D / 90D / ALL (predefined ranges only — no arbitrary date range)
- **Data source**: IndexedDB via `createHistoryStore().getSnapshots(key)`
- **Limitations**: 
  - Only 3 fields from HistorySnapshot
  - No engagement rate or derived metrics
  - Range is predefined buckets, not user-selectable start/end dates
  - Single-creator only (takes `storeKeys: string[]` but loads and merges — no per-creator separation)

### Benchmark-Card

| File | Lines | Purpose |
|------|-------|---------|
| `src/components/benchmark-card.tsx` | 91 | Shows `BenchmarkResult` with per-metric percentile bars, rank arrows (above/below), user value vs benchmark mean. Used on dashboard. |

---

## 3. Comparator Engine

### What Exists

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/engine/comparator.ts` | 309 | `comparePlatforms()` — compares multiple `CreatorProfile`s across platforms. `PlatformSummary` (per-platform), `ComparisonInsight`, `CrossPlatformComparison`. `comparePlatformsCached` (memoized). **Cross-platform comparison only (Douyin/TikTok/XHS), not multi-creator on same platform.** |

### Comparator API
- **Input**: `CreatorProfile[]` (one per platform)
- **Output**: `CrossPlatformComparison { summaries[], insights[], bestEngagementPlatform, largestAudiencePlatform }`
- **Normalization**: Radar chart uses min-max normalization to 0-100 per dimension
- **Insights**: engagement_gap, audience_size, best_content, content_distribution
- **Limitations**:
  - Fixed to 3 platforms (douyin/tiktok/xhs) — not generalized for arbitrary creator list
  - No multi-creator comparison (2-5 creators on same platform)
  - No benchmark integration for percentile scores
  - `comparePlatforms` operates on *current* profiles only — no historical snapshots

### compareToBenchmark

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/engine/benchmark.ts` | 203 | `compareToBenchmark(user, benchmarks)` and `compareToBenchmarkByNiche(user, userScore?)`. Compares user profile against an array of `BenchmarkProfile`. Produces `BenchmarkResult` with per-metric `MetricBenchmark` (rank, percentile). |

- **Metrics**: Followers, mean engagement rate, post count
- **BenchmarkRank**: 'above' | 'at' | 'below' (±15% tolerance band)
- **Percentile**: Uses `empiricalPercentile` (Hazen plotting position)
- **Niche detection**: Auto-detects niche, generates 20 benchmark profiles for that niche
- **Limitation**: Only 3 metrics. No SignalVector-level signals.

---

## 4. Existing Comparison UI

### What Exists

| File | Lines | Purpose |
|------|-------|---------|
| `src/app/compare/page.tsx` | 392 | Server component. Loads all 3 platform profiles, computes `comparePlatforms()`, renders `CompareTable`, `CompareRadarChart`, insight highlights, content overlap table, persona score comparison cards. Fixed to 3 platforms. |
| `src/app/compare/compare-radar-chart.tsx` | 154 | Recharts `RadarChart` + `PolarGrid` + `PolarAngleAxis` + `PolarRadiusAxis` + `Radar` + `Legend`. Normalizes all 5 dimensions (followers, engagementRate, postCount, totalViews, totalEngagement) to 0-100. Per-platform colors from CSS vars. Responsive via `ResponsiveContainer`. |
| `src/app/compare/compare-table.tsx` | 167 | Desktop table + mobile tab switcher. Shows metric rows with winner highlighted in green. |
| `src/components/platform-comparison.tsx` | 157 | Alternative comparison card — shows 2x2 grid of platform metrics + insight pills. Used on dashboard. |

### UI Pattern (Recharts)
```tsx
<ResponsiveContainer width="100%" height={320}>
  <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
    <PolarGrid stroke="rgba(255,255,255,0.08)" />
    <PolarAngleAxis dataKey="dimension" tick={{ fill: 'var(--text-subtle)', fontSize: 11 }} />
    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
    {summaries.map((s) => (
      <Radar key={s.platform} name={...} dataKey={s.platform} stroke={...} fill={...} fillOpacity={0.12} strokeWidth={2} />
    ))}
    <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
  </RadarChart>
</ResponsiveContainer>
```

---

## 5. Engine Signals Available

### SignalVector Fields (from `signal-collector.ts`)

**Categories**: engagement, rhythm, growth, content, audience

**All signal IDs**:
- `engagementRate` (raw: overallRate 0-1)
- `engagementTrend` (raw: trend -1 to 1)
- `saveRate` (raw: avg saves/likes)
- `completionRate` (raw: avg completionRate)
- `postingFrequency` (raw: postsPerWeek)
- `consistencyScore` (raw: 0-100)
- `bestPostingHour` (raw: 0-23)
- `followerGrowthRate` (raw: delta/first, -1 to 1)
- `growthMomentum` (raw: 0-0.8 mapped from accelerating/steady/decelerating/stagnant)
- `contentDiversity` (raw: categories/10, 0-1)
- `topCategoryShare` (raw: 0-1)
- `hookUsageRate` (raw: 0-1)
- `hashtagCoverage` (raw: 0-1)
- `viralPostRatio` (raw: 0-1)
- `audienceQuality` (raw: gender entropy 0-1)
- `engagementVelocity` (raw: recent 30% engagement fraction)
- `freshnessDecay` (raw: avg 0.5^(ageDays/30))
- `dataCompleteness` (raw: 0-1)

**Each signal has**: `rawValue`, `normalizedValue` (0-100, min-max normalized within category), `confidence` (0-1), `weight` (platform-specific 0-10), `source`, `id`, `category`

**Critical for trend**: `engagementTrend`, `followerGrowthRate`, `growthMomentum`, `engagementVelocity`, `freshnessDecay` — these are the signals most useful for trend/delta calculations.

---

## 6. Recharts Usage Patterns

**Pattern across all chart components**:
1. Import: `LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`, `Legend` from `recharts`
2. Wrapper: `<ResponsiveContainer width="100%" height={280|320}>`
3. Axes: `XAxis dataKey="label"`, `YAxis tickFormatter={formatNumber}`
4. Tooltip: Custom component via `content={<CustomTooltip ... />}`
5. Line: `<Line type="monotone" dataKey={key} stroke={color} strokeWidth={2} dot={bool} activeDot={{ r: 4 }} />`
6. Grid: `<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />`

---

## 7. Date Picker Infrastructure

**No date picker components exist in the codebase.** There is no `DateRangePicker`, `DatePicker`, or similar.

The `GrowthTrendChart` has a range selector with hardcoded buckets (7D/30D/90D/all) using button-style toggles, not a calendar picker.

The `CalendarClient` has month navigation (prev/next buttons) for the content calendar grid, but no arbitrary date range selection.

---

## 8. Success Criteria Analysis

### Criterion 1: "5+ snapshots spanning multiple days shows follower/engagement trend chart with day/week/month granularity selector"

**Status**: PARTIAL

**What exists**: 
- `GrowthTrendChart` shows follower/likes/videos trend as a line chart
- Range selector: 7D / 30D / 90D / ALL — but these are predefined, not a day/week/month *granularity selector*

**Gaps**:
- No granularity selector (day / week / month aggregation) — only raw data with time-range filter
- `HistorySnapshot` only has 3 fields (followers, likesTotal, videosCount) — no engagement rate
- "5+ snapshots spanning multiple days" — the data model supports this (up to 365 snapshots per profile), but no UI enforces or highlights this requirement
- The `AnalysisSnapshot` has engagementRate but is tied to analysis events, not regular snapshots

**Implementation approach**:
1. Add aggregation logic: day (raw), week (aggregate by ISO week), month (aggregate by month)
2. Expand `HistorySnapshot` to include engagement rate, or derive it from posts data
3. Add a granularity selector UI (day/week/month buttons) to `GrowthTrendChart`

**Estimated complexity**: HIGH (requires data model change + new UI + aggregation logic)

---

### Criterion 2: "Daily delta table for last 14-30 days"

**Status**: PARTIAL

**What exists**:
- `AnalysisDelta` interface with `followersDelta`, `engagementDelta`, `likesDelta`, `consistencyDelta`, `rhythmDelta`
- `computeAnalysisDelta(current, previous)` function — computes absolute and percentage changes
- `useAnalysisDelta` hook — loads previous analysis from IndexedDB, computes delta
- `GrowthTrendChart` summary stats section shows delta + % change for the filtered range

**Gaps**:
- `AnalysisSnapshot` (and thus `AnalysisDelta`) is tied to analysis events, not daily snapshots. The analysis is not run on a fixed schedule — it's triggered by `collectNow()` or analysis events.
- No "14-30 day rolling window" delta table UI
- `AnalysisDelta` compares only consecutive pairs, not a rolling window of the last N days
- The `GrowthTrendChart` shows deltas for the *entire filtered range*, not per-day deltas

**Implementation approach**:
1. Decide: should "daily delta" come from `HistorySnapshot` (follower counts) or `AnalysisSnapshot` (engagement metrics)?
2. For 14-30 day delta table: iterate over snapshots in range, compute per-day or per-period deltas
3. Render as a table with columns: date, followers, followers_delta, likes_delta, etc.
4. Highlight positive/negative with green/red

**Estimated complexity**: MEDIUM (table UI + iteration logic — data model already supports it)

---

### Criterion 3: "T1 vs T2 diff view with metric deltas highlighted"

**Status**: DOES NOT EXIST

**What exists**:
- `compareToBenchmark()` in `benchmark.ts` compares user vs benchmark *set*, not two arbitrary time points
- `computeAnalysisDelta()` compares consecutive analyses, but no UI for selecting two specific snapshots
- `GrowthTrendChart` shows range deltas (start vs end of range), but not two specific dates

**Gaps**:
- No UI for selecting two specific snapshots (T1 and T2)
- No "snapshot diff view" — a dedicated page or panel showing before/after for all metrics
- No `compareTwoSnapshots()` function in the history module

**Implementation approach**:
1. Add a date range selector to `GrowthTrendChart` or create a new `SnapshotDiffView` component
2. User selects two dates from the available snapshots
3. Compute diff: `{ metric: string, t1_value, t2_value, delta, delta_pct }[]`
4. Render as table with highlighted values (green for positive, red for negative)
5. Optionally show a bar chart comparing T1 vs T2 values

**Estimated complexity**: MEDIUM-HIGH (new UI component + diff computation + date selection)

---

### Criterion 4: "2-5 creators comparison with normalized 0-100 percentile scores, radar/bar charts"

**Status**: PARTIAL (exists for 3 platforms, not arbitrary 2-5 creators)

**What exists**:
- `comparePlatforms()` — compares exactly 3 platforms (douyin/tiktok/xhs) for a single persona
- `CompareRadarChart` — radar chart with normalized 0-100 scores for 5 dimensions
- `CompareTable` — table comparing metrics across platforms with winner highlighted
- `compareToBenchmarkByNiche()` — percentile scores (0-100) relative to niche benchmarks
- `BenchmarkCard` — percentile bar chart for 3 metrics

**Gaps**:
- `comparePlatforms` is hardcoded to 3 fixed platforms — cannot compare 2 or 4 arbitrary creators
- No multi-creator on the *same* platform (only cross-platform)
- No UI for selecting which creators to compare (creator picker)
- The radar chart normalization is per-comparison (min-max within the compared set), not against an external benchmark
- "2-5 creators" implies comparing different personas or the same persona across time periods — not currently supported

**Implementation approach**:
1. Extend `comparePlatforms` to accept an arbitrary `CreatorProfile[]` (not fixed to 3)
2. Create a new `CreatorComparisonEngine` that:
   - Takes 2-5 `SignalVector` objects
   - Normalizes each signal dimension to 0-100 percentile (using benchmark data or min-max within group)
   - Returns per-creator `PlatformSummary`-like structure with normalized scores
3. Build a creator picker UI (multi-select from saved profiles)
4. Reuse `CompareRadarChart` or create `ComparisonBarChart` variant
5. Reuse the `CompareTable` pattern with dynamic columns

**Estimated complexity**: HIGH (engine refactor + new UI picker + multi-creator data loading)

---

## 9. Key Risks and Gaps

### Risk 1: `HistorySnapshot` Data Poverty (HIST-01)
- `HistorySnapshot` only has `{ fetchedAt, profile: { followers, likesTotal, videosCount } }`
- The trend chart cannot show engagement rate, growth rate, or any SignalVector-derived metrics without either:
  (a) Expanding `HistorySnapshot` to include more fields, or
  (b) Storing `SignalVector` snapshots alongside `HistorySnapshot`
- **Recommendation**: Create a `SignalSnapshot` that mirrors `SignalVector` per timestamp. Store in a new IndexedDB store or extend the existing `analysis` store.

### Risk 2: Date Picker Infrastructure Missing (UI-01)
- No `DateRangePicker` component exists
- The `GrowthTrendChart` range selector is hardcoded buckets (7D/30D/90D)
- **Recommendation**: Build a `DateRangePicker` component (or adapt a shadcn/ui date picker) before building range-specific UI

### Risk 3: Benchmark System is Single-Creator, Not Multi-Creator (COMP-04/05)
- `compareToBenchmark()` compares one user against a benchmark *set* (produces percentile ranks)
- `comparePlatforms()` compares 3 platforms but is not percentile-based (normalizes within the compared set)
- Neither function supports comparing 2-5 *creators* against each other with percentile scores
- **Recommendation**: Build a `MultiCreatorComparator` that accepts 2-5 profiles and computes normalized percentile scores using the existing `empiricalPercentile` function from `stats.ts`

### Risk 4: Snapshot Granularity (HIST-02)
- `AnalysisSnapshot` is event-based (triggered by analysis), not daily
- `HistorySnapshot` is created on-demand via `collectNow()` or profile save
- No guarantee of daily granularity — snapshots are only created when the user visits/imports
- **For "14-30 day daily delta table"**: If snapshots aren't daily, daily deltas won't be available. The delta table would need to handle sparse data gracefully.

### Risk 5: No Creator Picker for Multi-Creator Comparison
- The `/compare` page is hardcoded to load all 3 demo platforms
- No UI exists for selecting which saved profiles to compare
- **Recommendation**: Build a `CreatorPicker` (multi-select) that reads from `profile-store`, then pass selected profiles to the comparator engine

---

## 10. Summary Table

| Requirement | Status | Complexity | Key Files |
|---|---|---|---|
| HIST-01: 5+ snapshots trend chart with granularity selector | PARTIAL | HIGH | `growth-trend-chart.tsx`, `store.ts`, `analysis-types.ts` |
| HIST-02: Daily delta table 14-30 days | PARTIAL | MEDIUM | `analysis-types.ts`, `use-analysis-delta.ts`, `growth-trend-chart.tsx` |
| HIST-03: T1 vs T2 diff view with deltas | MISSING | MEDIUM-HIGH | None — new component needed |
| HIST-04: Multi-creator comparison radar/bar | PARTIAL | HIGH | `comparator.ts`, `compare-radar-chart.tsx`, `compare-table.tsx` |
| COMP-05: Percentile scores (0-100) | PARTIAL | MEDIUM | `benchmark.ts` (single-creator), needs multi-creator extension |
| ENG-01: SignalCollector availability | EXISTS | — | `signal-collector.ts` (18 signals) |
| ENG-02: Date picker infrastructure | MISSING | MEDIUM | No existing component |
| ENG-03: Recharts patterns | EXISTS | — | All chart components use same pattern |
| DATA-01: History store supports multiple snapshots | EXISTS | — | `store.ts` (up to 365 per profile) |
| DATA-02: Snapshot data model richness | PARTIAL | — | Only 3 fields in `HistorySnapshot`; `AnalysisSnapshot` has more but is event-based |

---

## 11. Suggested Implementation Approach

### Phase 4A: Expand Snapshot Data Model
1. Extend `HistorySnapshot` to include `engagementRate` and `followerGrowthRate`, OR create a new `MetricSnapshot` type
2. Modify `extractSnapshot()` in `snapshot.ts` to compute engagement rate from posts at capture time
3. Update `HistoryStore` if schema changes (version bump)

### Phase 4B: Build Date Range Picker
1. Build `DateRangePicker` component using shadcn/ui or custom
2. Add `getSnapshotsInRange(key, start, end)` helper in `store.ts`

### Phase 4C: Trend Chart Granularity
1. Add aggregation logic (day/week/month) to `GrowthTrendChart`
2. Add granularity selector buttons (day/week/month) to the chart controls
3. Implement week/month aggregation functions for snapshot arrays

### Phase 4D: Delta Table
1. Build `DeltaTable` component — columns: date, metric values, deltas
2. Implement rolling window delta computation in `use-analysis-delta.ts` or new hook
3. Add 14/30-day preset buttons to match criterion

### Phase 4E: T1 vs T2 Diff View
1. Add date selection UI to trend chart (click to select T1, click to select T2)
2. Build `SnapshotDiffView` component showing side-by-side values + delta
3. Highlight positive/negative with color coding

### Phase 4F: Multi-Creator Comparison
1. Build `CreatorPicker` multi-select component
2. Extend `comparePlatforms` to accept arbitrary `CreatorProfile[]`
3. Add percentile normalization using `empiricalPercentile` 
4. Create `ComparisonRadarChart` that accepts 2-5 creators
5. Create `CreatorComparePage` or extend existing `/compare` route

