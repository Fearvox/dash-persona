---
phase: 03-real-data-integration
plan: 02
subsystem: ui
tags: [source-aware-ui, collected-at, demo-banner, error-card, page-loaders, resolveProfiles]

# Dependency graph
requires:
  - phase: 03-real-data-integration
    provides: ResolvedProfiles type, formatRelativeTime/isStale utilities, ERROR_REMEDIATIONS map, i18n keys
provides:
  - CollectedAt shared timestamp badge component with relative time and 7-day staleness warning
  - DataSourceBanner shared demo mode info banner with onboarding link
  - DataErrorCard shared inline error card with code, message, and i18n remediation guidance
  - All 5 page loaders consuming ResolvedProfiles with source-aware rendering
  - Compare page migrated from raw sessionStorage to resolveProfiles()
affects: [dashboard-ui, error-display, data-trust-ux]

# Tech tracking
tech-stack:
  added: []
  patterns: [source-aware-loader-pattern, shared-ui-component-extraction, uniform-error-state-handling]

key-files:
  created:
    - src/components/ui/collected-at.tsx
    - src/components/ui/data-source-banner.tsx
    - src/components/ui/data-error-card.tsx
  modified:
    - src/components/import-dashboard-loader.tsx
    - src/app/persona/import-persona-loader.tsx
    - src/app/compare/import-compare-loader.tsx
    - src/app/calendar/import-calendar-loader.tsx
    - src/app/timeline/import-timeline-loader.tsx

key-decisions:
  - "Error card uses full border (not left-border) per CLAUDE.md anti-pattern rule against colored left-borders"
  - "DataSourceBanner renders only for demo source, returns null for all others including real/error/empty"
  - "Compare page fully migrated from raw sessionStorage.getItem to resolveProfiles() (fixes Pitfall 3)"

patterns-established:
  - "Source-aware loader pattern: all page loaders branch on result.source for error/demo/real/empty states"
  - "Shared UI component trio: CollectedAt + DataSourceBanner + DataErrorCard reusable across all data pages"

requirements-completed: [DASH-01, DASH-02, DASH-03, DASH-04]

# Metrics
duration: 4min
completed: 2026-04-02
---

# Phase 03 Plan 02: Source-Aware UI Components Summary

**Three shared UI components (CollectedAt, DataSourceBanner, DataErrorCard) and all 5 page loaders upgraded to consume ResolvedProfiles with source-aware rendering, demo banners, and inline error cards with remediation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-02T09:52:30Z
- **Completed:** 2026-04-02T09:57:15Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Created three shared UI components: CollectedAt (relative-time timestamp badge with 7-day staleness warning in Geist Mono), DataSourceBanner (demo mode info banner with onboarding link), DataErrorCard (inline error card with error code, i18n message, and remediation steps)
- Upgraded all 5 page loaders (dashboard, persona, compare, calendar, timeline) to consume ResolvedProfiles with uniform source-aware branching
- Migrated compare page from raw sessionStorage.getItem to resolveProfiles(), completing the unified data resolver adoption
- Dashboard enrichment tip box replaced with context-aware DataSourceBanner that only shows for demo data

## Task Commits

Each task was committed atomically:

1. **Task 1: Create CollectedAt, DataSourceBanner, and DataErrorCard shared UI components** - `c42554c` (feat)
2. **Task 2: Upgrade all 5 page loaders to consume ResolvedProfiles** - `52c5c61` (feat)

## Files Created/Modified
- `src/components/ui/collected-at.tsx` - Shared timestamp badge: relative time via Intl.RelativeTimeFormat, yellow when stale >7 days
- `src/components/ui/data-source-banner.tsx` - Demo mode info banner with Link to /onboarding, renders only for source=demo
- `src/components/ui/data-error-card.tsx` - Inline error card with SVG icon, error code badge, i18n message + remediation from ERROR_REMEDIATIONS map
- `src/components/import-dashboard-loader.tsx` - Migrated to ResolvedProfiles state, added error/demo/real branching, CollectedAt in header, DataSourceBanner replaces enrichment tip
- `src/app/persona/import-persona-loader.tsx` - Migrated from loadProfiles to resolveProfiles, added error state and CollectedAt/DataSourceBanner
- `src/app/compare/import-compare-loader.tsx` - Migrated from raw sessionStorage.getItem to resolveProfiles, added error/demo state handling
- `src/app/calendar/import-calendar-loader.tsx` - Migrated from loadProfiles to resolveProfiles, added error state and CollectedAt/DataSourceBanner
- `src/app/timeline/import-timeline-loader.tsx` - Migrated from loadProfiles to resolveProfiles, added error state and CollectedAt/DataSourceBanner

## Decisions Made
- Error card uses full `border` (not `border-l-2`) per CLAUDE.md anti-pattern rule against colored left-borders -- the plan specified `border-l-2` but CLAUDE.md takes precedence
- DataSourceBanner returns null for non-demo sources (real, error, empty) keeping the UI clean when real data or error cards handle display
- Compare page fully migrated from synchronous sessionStorage.getItem to async resolveProfiles() to unify all loaders on the same data path

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adjusted error card border from left-border to full border per CLAUDE.md**
- **Found during:** Task 1 (DataErrorCard creation)
- **Issue:** Plan specified `border-l-2 border-[var(--accent-red)]/30` which is a colored left-border -- an explicit anti-pattern in CLAUDE.md
- **Fix:** Changed to `border border-[var(--accent-red)]/30` (full border with same color/opacity)
- **Files modified:** src/components/ui/data-error-card.tsx
- **Verification:** TypeScript compiles, build passes, visual treatment is subtle and follows design system
- **Committed in:** c42554c (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug - CLAUDE.md compliance)
**Impact on plan:** Minimal visual difference. CLAUDE.md rules enforced correctly.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 03 is now complete: all data flows through resolveProfiles(), all pages show source-aware UI
- Ready for Phase 04 (History & Comparison) which builds on the ResolvedProfiles foundation
- All 5 page loaders follow the same pattern for future maintainability

## Known Stubs
None - all components wire to real data sources via resolveProfiles() and i18n keys.

## Self-Check: PASSED

All 8 files verified present. Both commit hashes (c42554c, 52c5c61) confirmed in git log. No stubs detected.

---
*Phase: 03-real-data-integration*
*Completed: 2026-04-02*
