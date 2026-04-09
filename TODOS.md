# TODOS

## In Progress
- [ ] Phase 02 verification — run gsd:verify-work before advancing to Phase 03

## Backlog
- [ ] Red Note content script — Data Passport Phase 2
- [ ] /data-algo-social real data algorithm optimization — integrate after skill is ready
- [ ] Playwright E2E test infrastructure — scroll sync, hydration, responsive layout need browser-level checks
- [ ] pipeline-config.ts dev-only validation — warn if module IDs drift from engine exports
- [x] Create DashPersona DESIGN.md (full version, not just .impeccable.md) **Completed:** 2026-04-09
- [ ] Persona Detail radial progress ring for overall score
- [ ] Mobile responsive pipeline (vertical scroll on <768px)
- [ ] Full a11y audit (WCAG AA) after implementation stabilizes
- [ ] Platform tabs aria-pattern fix (remove role="tab" or implement arrow-key nav)
- [ ] Collector: macOS code signing + notarization
- [ ] Collector: Windows NSIS installer + code signing
- [ ] Collector: electron-updater auto-update configuration (GitHub Releases)
- [ ] Collector: full headless mode toggle (auto-hide works post-auth, need pre-auth headless option)
- [ ] Collector: Douyin + XHS collection engine (only TikTok implemented in Phase 02)

## Completed (2026-04-01 — data persistence fix)
- [x] Unified profile resolver (resolveProfiles) — single source of truth for all pages **Completed:** 2026-04-01
- [x] Snapshot ordering fix — newest collector snapshot per platform wins **Completed:** 2026-04-01
- [x] XHS placeholder row filter — reject banner text from exports **Completed:** 2026-04-01
- [x] XHS notes XLSX import + Douyin 30-day aggregate import (4 schema types) **Completed:** 2026-04-01
- [x] Shared getProfiles() extraction (API route + server component) **Completed:** 2026-04-01
- [x] ~~Data Passport browser extension~~ (replaced by DASH Collector) **Completed:** Phase 02

## Completed (2026-03-31 — Phase 02 Collector)
- [x] Collector: TikTok platform support (tray menu + cookie detection) **Completed:** Phase 02 (2026-03-31)
- [x] Collector: BatchQueue sequential job state machine **Completed:** Phase 02 (2026-03-31)
- [x] Collector: cron-based scheduler + run log persistence **Completed:** Phase 02 (2026-03-31)
- [x] Collector: batch progress / settings / history HTML windows **Completed:** Phase 02 (2026-03-31)
- [x] Collector: SSE endpoint + tray collection/CAPTCHA states **Completed:** Phase 02 (2026-03-31)

## Completed (2026-03-30 — v0.7.0 animation sprint)
- [x] Animation system — button micro-interactions, card hover lift, scroll-reveal, drop zone feedback, nav transitions **Completed:** v0.7.0 (2026-03-30)
- [x] prefers-reduced-motion comprehensive fix — universal animation kill + visibility reset **Completed:** v0.7.0 (2026-03-30)
- [x] ScrollReveal a11y — mount-first pattern (no-JS safe), tab order fix, setTimeout cleanup **Completed:** v0.7.0 (2026-03-30)
- [x] .superpowers/ added to .gitignore — prevent runtime artifacts from entering repo **Completed:** v0.7.0 (2026-03-30)

## Completed (2026-03-30 — v0.7.0 sprint)
- [x] feat/textcraft-engine branch merge to main + deploy **Completed:** v0.7.0 (2026-03-30)
- [x] Portrait page polish — CJK alignment + braille filled-area trendline **Completed:** v0.7.0 (2026-03-30)
- [x] Inline style migration — zero remaining `style={{}}` across 59 files **Completed:** v0.7.0 (2026-03-30)
- [x] Pipeline horizontal scroll enhancement — responsive scroll on wide screens **Completed:** v0.7.0 (2026-03-30)
- [x] Landing → Dashboard shimmer transition (2s "Analyzing..." shimmer) **Completed:** v0.7.0 (2026-03-30)
- [x] Collector: structured error responses, crash detection, tray error display **Completed:** v0.7.0 (2026-03-30)
- [x] Collector: XHS cookie detection + per-platform login flow **Completed:** v0.7.0 (2026-03-30)
- [x] Collector: auto-hide login window after both platforms authenticate **Completed:** v0.7.0 (2026-03-30)
- [x] Collector: electron build pipeline scripts **Completed:** v0.7.0 (2026-03-30)
- [x] i18n: English metadata in install page **Completed:** v0.7.0 (2026-03-30)

## Completed (2026-03-30)
- [x] i18n completion: error.tsx / not-found.tsx / pipeline-skeleton.tsx fully localized, 28 new translation keys added
- [x] a11y: locale-toggle aria-label, pipeline-skeleton aria-label localized
- [x] 4 unit test fixes (benchmark.test.ts / explain.test.ts locale setup)
- [x] NICHE_BENCHMARKS label runtime resolution (no longer hardcoded to Chinese at module load time)
- [x] vitest scan scope fix (exclude .golutra and e2e external files)
- [x] metadataBase setup (fix OG image URL fallback to localhost)
- [x] CHANGELOG v0.5.0 written

## Completed (2026-03-24)
- [x] Calendar event card overlap
- [x] Dashboard Persona Score heading position
- [x] Timeline Save/Reset buttons with localStorage
- [x] Cinematic landing page (boot + pipeline + output wall)
- [x] Dashboard 2-zone layout
- [x] overallScore DRY extraction + NaN guard
- [x] PostDrawer full rewrite (modal, no inline styles)
- [x] AI slop cleanup (left-borders, equal grids)
- [x] Z-index system + ConfirmDialog focus trap
- [x] Button tactile feedback + Toast + ConfirmDialog system
- [x] 8 engine algorithm optimizations (sparse sliding window, binary search percentile, redundancy elimination, etc.)
- [x] Phase 3: IndexedDB history persistence + useProfileHistory hook + Collect Now button
- [x] Phase 3: 10-niche benchmark comparison engine + auto niche detection + BenchmarkCard component
- [x] Timeline platform switch bug fix (key={platform})
- [x] Timeline platform switch guidance prompt bar
- [x] Data Passport design document (office-hours + DOM research + eng review + design review)
- [x] Douyin Creator Center DOM selector research (5 pages fully mapped)

## Completed (2026-03-25)
- [x] Serena project initialization + SessionStart auto-activation hook
- [x] Full GitHub sync (engine optimization + Data Passport + pipeline viz + history persistence)
- [x] Privacy file cleanup (CLAUDE.md, .impeccable.md, .claude/, docs/superpowers/ removed from repo)
- [x] README restructure: product showcase page + 4 Playwright auto-screenshots

## Completed (2026-03-26)
- [x] CDP data collection: Douyin (content management 78+ posts) + TikTok Studio + XHS Creator Center
- [x] TikTok Studio XLSX import: 7 schema types (content, overview, viewers, follower_history, gender, territory, activity)
- [x] TikTok date normalization: batch year-boundary detection (Chinese dates without year → ISO)
- [x] Douyin time series: total follower count mapping + date-based merge deduplication
- [x] IndexedDB persistent storage (profile-store) + sessionStorage sync cache + import merging
- [x] Persona/Timeline/Calendar detail page data pipeline fix (source=import uses real imported data)
- [x] Sparkline chart fix: XAxis timeline (24h=hourly, 7d+=daily), Invalid Date guard
- [x] UpgradeBanner component + demo/real data layering
- [x] /install CLI installation guide (5-step beginner-friendly tutorial)
- [x] Version bump to v0.4.0

## Completed (2026-03-29)
- [x] Textcraft engine core (types, measure, fonts, renderers, effects, composers)
- [x] 31 Textcraft unit tests
- [x] Canvas text field replaces landing code-drift DOM background
- [x] Global decorator components (TextcraftLoader, TextcraftDivider, TextcraftEmpty)
- [x] /portrait data profile page + i18n keys
- [x] TEXTCRAFT.md engine usage manual
- [x] Locale switching feature (LocaleToggle + LocaleInitializer, no hydration conflict)
- [x] TextcraftDivider applied between landing Acts
- [x] pretext@0.0.2 compatibility handling (type stub + transpilePackages)
