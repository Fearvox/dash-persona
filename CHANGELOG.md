# Changelog

All notable changes to DashPersona are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versions follow [Semantic Versioning](https://semver.org/).

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
- **TikTok date parsing** — "3月25日" (no year) now correctly normalizes to ISO format with year-boundary detection (Dec → Jan crossing increments year).
- **Douyin timeseries** — 总粉丝量 column now maps to followers field. History entries merge by date to prevent duplicates.
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
