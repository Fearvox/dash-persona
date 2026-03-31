# Changelog

All notable changes to DashPersona are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versions follow [Semantic Versioning](https://semver.org/).

---

## [0.7.0] - 2026-03-30

### Added

- **Animation system** — Button micro-interactions (hover lift, active compress), card hover lift effect, scroll-triggered output wall reveals with stagger, file drop zone drag feedback, nav pill transitions.
- **ScrollReveal component** — IntersectionObserver-based scroll entrance animations with mount-first pattern (SSR/no-JS safe).
- **DASH Collector headless mode** — Electron collector supports headless Chromium for CI/server environments.
- **XHS multi-login** — Red Note adapter supports multiple account sessions with cookie isolation.
- **Builder pipeline visualization** — Interactive @xyflow/react pipeline view with elkjs auto-layout.
- **Analyzing shimmer transition** — 2-second shimmer animation from landing page to dashboard analysis state.
- **Pipeline horizontal scroll** — Responsive horizontal scrolling on wide screens for pipeline view.

### Fixed

- **prefers-reduced-motion** — Comprehensive reduced-motion support: universal animation/transition kill, visibility and pointer-events reset for scroll-reveal elements.
- **ScrollReveal a11y** — Hidden elements removed from tab order via `visibility: hidden` + `pointer-events: none`; setTimeout cleanup prevents memory leaks on unmount.

### Changed

- **Inline style migration** — Migrated all remaining `style={{}}` to Tailwind utility classes across 54+ files.
- **Portrait polish** — Refined portrait page layout, spacing, and typography for data density.
- **Error UX improvements** — Unified error states with actionable recovery CTAs across all pages.
- **Electron builder config** — Fixed electron-builder `.dmg` packaging configuration.

---

## [0.6.1] - 2026-03-30

### Changed

- **Install page** — DASH Collector desktop app promoted as the primary install method (3-step flow: download → sign in → collect). CLI install collapsed as an alternative option.
- **Onboarding auto-collect** — Shows DASH Collector recommendation card when CDP agent is not connected, guiding users to download the desktop app.
- **i18n** — All user-facing "CDP Agent" copy updated to "DASH Collector" (both zh and en). FAQ rewritten to introduce DASH Collector.

---

## [0.6.0] - 2026-03-30

### Added

- **Statistical foundation** (`src/lib/engine/stats/`) — Four pure-function modules powering all analysis: Hazen plotting-position percentiles (no more tail collapse), OLS linear regression with t-test significance (p-value gating), adaptive sample-size thresholds (small datasets no longer trigger false alarms), and rank-based normalization (comparable scoring across mixed scales).
- **Signal collector** — 18 standardized signals across 5 categories (engagement, rhythm, growth, content, audience). Each signal carries raw value, normalized 0-100 score, confidence level, and platform-specific weight. Integrated into `runAllEngines()` for dashboard consumption.
- **Platform-specific signal weights** — Douyin weights completion rate at 8x (core algorithm signal). XHS weights save/bookmark at 6x (high-intent signal). TikTok weights viral post ratio at 7x. Derived from Twitter/X UUA production patterns.
- **Engagement velocity signal** — Measures what percentage of total engagement arrived in the most recent 30% of the posting period. Higher velocity = better content quality.
- **Freshness decay signal** — Exponential decay with 30-day half-life, averaging across all posts. Newer content corpus = higher freshness.
- **Data completeness signal** — Quantifies how many optional high-value fields (history, fanPortrait, completionRate, publishedAt) are populated in a profile.
- **Post quality scoring** — Three-factor penalty system: short descriptions (<5 chars: 0.3x, <20 chars: 0.7x), zero engagement with views (0.5x), impossibly high engagement ratios suggesting bot activity (0.6x). Integrated into persona engagement computation.
- **Persistent SiteHeader** — Global top navigation visible on all pages except landing. Dashboard, Portrait, Pipeline, Settings links always accessible.
- **Portrait demo mode** — `/portrait?source=demo` loads from demo adapter instead of IndexedDB. Demo users can now explore the data portrait feature.
- **Calendar cold-start CTA** — "Import More Data" button linking to onboarding when calendar has insufficient posts.
- **Extension timeout feedback** — 10-second countdown timer with explicit failure message and fallback CTAs when Data Passport extension is not detected.
- **Timeline cold-start fix** — Demo mode now passes history snapshots to GrowthTrendChart as fallback data.
- **DASH Desktop Collector** (`collector/`) — Standalone Electron desktop app replacing the Claude Code CLI for data collection. Ships with Playwright persistent Chromium, HTTP API fully compatible with localhost:3458 interface. Lives in system tray, cookies persist across sessions. Zero changes to cdp-adapter.ts.

### Changed

- **Benchmark percentile** — Replaced `roughPercentile()` (rank/N with tail collapse at 0 and 100) with Hazen plotting position `(rank - 0.5) / N * 100`. Power-law engagement data now gets accurate percentile ranking.
- **Persona trend analysis** — Replaced difference-of-means (newer half vs older half) with OLS linear regression. Added `trendReliable: boolean` field gated by p < 0.05. Strategy and idea engines suppress trend-based suggestions when trend is not statistically significant.
- **Comparator thresholds** — Fixed 1.5x engagement gap and 2.0x audience gap replaced with `adaptiveThreshold()` that scales with sample size. Fewer than 5 posts: insight suppressed entirely.
- **Next-content scoring** — Step-quantized nicheRelevance (0/25/50/75/95) recalibrated to continuous 0-100 via `recalibrateSteps()`. All 4 scoring dimensions rank-normalized across suggestion batch for comparable confidence.
- **Idea generator thresholds** — Fixed 15% content gap and 2x cross-platform gap replaced with adaptive thresholds. Small datasets no longer produce spurious experiment ideas.
- **Consistency window** — Hardcoded window size of 5 replaced with adaptive formula: `max(5, ceil(posts / 10))`. Gives window=5 for 30 posts, 10 for 100, 20 for 200.
- **Onboarding** — Removed Step 2 (benchmarks) UI that was permanently disabled. Direct flow from import to dashboard.

### Performance

- **Keyword overlap dedup** — Pre-computed `postKeywords()` and `countOverlap()` once per trending post, shared across all 7 rules. Previously computed 4x per post. ~75% reduction in next-content rule execution.
- **topUserCategories cache** — Computed once at top of `generateNextContent()`, passed to all rules. Previously called 6+ times.
- **classifyContent cache** — Content planner now skips classification if posts already have `contentType` from persona engine.
- **Flaky benchmark test fixed** — `generateBenchmarkProfiles()` now uses deterministic timestamp instead of `new Date()`.

### Fixed

- **TikTok date boundary** — Relative dates like "Mar 25" (Chinese format, no year) crossing year boundaries (Dec → Jan) now correctly subtract a year when the inferred date is >30 days in the future.
- **CJK column alignment** — Portrait page identity box and tags use `charWidth/strWidth/sliceCols/padEndCols` helpers that account for CJK fullwidth characters (2-column width).

---

## [0.5.0] - 2026-03-30

### Added

- **Textcraft engine** — ASCII art rendering system with font registry (dash-brand, block-digits), effects (drift, assemble, compose), composers (ascii-logo, char-chart, braille-line, data-portrait, text-field), and canvas/DOM renderers. Powers brand typography across landing and portrait pages.
- **Data Portrait page** (`/portrait`) — Visual data card with performance matrix, 30-day trend sparkline, and tag display. Supports copy-to-clipboard and PNG export.
- **TextcraftDivider component** — Section divider used between landing page acts (Boot → Pipeline → Output).
- **Canvas text field** — Custom canvas renderer for ASCII art with Geist Mono font and animation support.
- **LocaleInitializer** — Reads localStorage post-hydration to avoid SSR/client locale mismatch.
- **Locale toggle** — Language switch button (EN/ZH) with accessible aria-label.
- **28 new i18n keys** — Full coverage for error page, 404 page, pipeline skeleton, and accessibility labels in both zh and en.

### Fixed

- **4 unit test failures** — benchmark.test.ts and explain.test.ts expected English strings but i18n defaults to zh. Added locale setup in test files.
- **NICHE_BENCHMARKS label baked at import time** — Labels resolved via `t()` at module load always returned Chinese. Changed `niche-detect.ts` to resolve labels at call time.
- **Vitest scanning external files** — Config had no `include` pattern, picking up 43 `.golutra/` bun:test files and 5 Playwright e2e specs. Scoped to `src/**/*.test.{ts,tsx}`.
- **metadataBase not set** — OG/Twitter image URLs fell back to `localhost:3000`. Added `metadataBase` to layout.tsx.
- **Hydration mismatch** — Locale read from localStorage during SSR caused React hydration error. Moved to post-hydration via useEffect.
- **error.tsx / not-found.tsx** — Hardcoded English strings replaced with i18n-keyed translations.
- **pipeline-skeleton.tsx** — Hardcoded row labels and aria-label replaced with i18n keys.

### Changed

- Boot sequence ASCII art uses English brand text (CJK fonts incompatible with ASCII art rendering).
- Code-art-background simplified from complex particle system to clean dot-matrix pattern.

---

## [0.4.0] - 2026-03-26

### Added

- **Chinese localization (zh-CN)** — All user-facing text now defaults to Chinese. 660+ translation keys across UI and engine output. Lightweight `t()` i18n system with `zh.ts` / `en.ts` dictionaries, ready for future locale-based routing.
- **CLI installation guide** (`/install`) — 5-step beginner-friendly tutorial with real screenshots, terminal commands, and troubleshooting FAQ. Targets users with zero programming experience.
- **UpgradeBanner component** — Prompts demo users to install the full CLI version. Two modes: full-width (dashboard) and compact (sidebar).
- **Demo/Real data separation** — Persona, Timeline, and Calendar detail pages now correctly use real imported data when `source=import`. Previously all three always displayed demo data.
- **TikTok Studio XLSX import** — 7 new schema types: content analytics, overview, viewers, follower history, gender distribution, territory, and activity hours. Batch date normalization handles yearless Chinese dates with year-boundary detection.
- **Persistent profile storage** — IndexedDB-backed profile store with sessionStorage sync cache. Import data survives browser sessions and merges across multiple uploads.
- **Sparkline chart improvements** — XAxis time labels: HH:mm for 24h, "MMM DD" for 7d/30d/90d. Invalid Date guards across all growth engine functions.
- **CDP data collection** — Collect posts, followers, and engagement directly from Douyin (creator center), TikTok Studio, and XHS via Chrome DevTools Protocol. Foreground tab mode for Douyin infinite scroll (78+ posts). MAX_POSTS raised to 200.
- **Trending analysis system** — Real-time search and hot topic collection from XHS and TikTok with copy pattern, hashtag, and engagement signal analysis.
- **Next Content Engine** — 7 deterministic rules combining persona data with trending analysis for content creation suggestions.
- **Content structure analysis** — Video frame extraction (5-10 screenshots) for visual content analysis.
- **"Install Full Version" CTA** on landing page linking to `/install`.

### Fixed

- **Persona detail page** ignored `source=import` and always showed demo data — now correctly loads and renders real imported profiles.
- **Timeline page** same fix — uses real data for decision tree visualization.
- **Calendar page** same fix — generates content plan from real imported posts.
- **TikTok date parsing** — "Mar 25" (Chinese format, no year) now correctly normalizes to ISO format with year-boundary detection (Dec → Jan crossing increments year).
- **Douyin timeseries** — "Total Followers" column now maps to followers field. History entries merge by date to prevent duplicates.
- **Data import merge** — Uploading new files no longer overwrites existing CDP-collected data. Posts deduplicate by description, larger follower counts are preserved.
- **Douyin scroll collection** — Foreground tab + scrollIntoView on load-more element resolves IntersectionObserver not firing in background tabs.

### Changed

- Version bumped from 0.1.0 to 0.4.0 across package.json, footer, and settings page.
- README restructured: "Two Ways to Use" section, grouped feature tables, condensed EverMem section.
- `<html lang="en">` changed to `<html lang="zh">` for Chinese-first default.
- XLSX schema detection expanded from 4 Douyin to 11 total (4 Douyin + 7 TikTok).

---

## [0.3.0] - 2026-03-25

### Added

- CDP-based data collection for Douyin, TikTok, and XHS via web-access proxy.
- CSV export for dashboard data.
- Analysis delta tracking (change detection between analysis runs).
- Enhanced onboarding wizard with CDP proxy setup and platform login verification.
- Manifest host permissions for dashboard and localhost in extension.

### Fixed

- bb-browser PATH resolution for engine parallel execution.
- Growth trend UI improvements.

---

## [0.2.0] - 2026-03-24

### Added

- Niche-aware benchmarking with 10 niches and synthetic cohort comparison.
- Data Passport Chrome extension for one-click Douyin data capture.
- Client-side history persistence via IndexedDB.
- Radar chart multi-dimensional cross-platform comparison.
- Report export as PNG and PDF.
- Engine memoization with FNV-1a content hashing and LRU eviction.
- E2E test coverage with Playwright (15 test cases).
- Cinematic landing page with boot sequence, pipeline visualization, and output wall.
- Content calendar with AI-free publishing schedule.
- Persona timeline decision tree.
- Experiment idea generator.

### Changed

- Visual overhaul sprint: density pass, PostDrawer rewrite, design system setup.
- 8 engine algorithm optimizations (sparse sliding window, binary search percentile, redundancy elimination).

---

## [0.1.0] - 2026-03-20

### Added

- Initial release: 9 deterministic analysis engines.
- Persona scoring across 6 dimensions.
- Cross-platform comparison for Douyin, TikTok, and Red Note.
- Growth tracking with historical snapshots.
- Strategy suggestions engine.
- File import with auto-schema detection (4 Douyin XLSX formats).
- Demo mode with built-in sample profiles.
- Dark mode UI with Geist typography.
