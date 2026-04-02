---
phase: 03-real-data-integration
plan: 01
subsystem: data-layer
tags: [profile-store, indexeddb, sessionstorage, i18n, error-handling, relative-time]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: profile-store.ts with resolveProfiles/saveProfiles/loadProfiles
  - phase: 01-foundation
    provides: CreatorSnapshot schema with collectedAt field
provides:
  - ResolvedProfiles type carrying source/collectedAt/reason/code metadata
  - formatRelativeTime() and isStale() utilities for timestamp display
  - ERROR_REMEDIATIONS map for all ProfilesResult error codes
  - i18n keys for data source awareness and error remediation (en + zh)
affects: [03-02, dashboard-ui, error-display]

# Tech tracking
tech-stack:
  added: [Intl.RelativeTimeFormat]
  patterns: [source-metadata-propagation, error-code-to-i18n-key-map, indexeddb-dual-key-storage]

key-files:
  created:
    - src/lib/utils/relative-time.ts
    - src/lib/utils/error-remediation.ts
  modified:
    - src/lib/store/profile-store.ts
    - src/lib/i18n/messages/en.ts
    - src/lib/i18n/messages/zh.ts
    - src/components/import-dashboard-loader.tsx
    - src/app/portrait/page.tsx

key-decisions:
  - "IndexedDB dual-key storage: profiles in 'current', metadata in 'current-meta' for backward compat"
  - "Error remediation stores i18n keys not translated strings -- t() called at render time per project convention"
  - "sessionStorage backward compat: old format (bare record) auto-detected and wrapped with source: 'real'"

patterns-established:
  - "ResolvedProfiles pattern: all profile data queries return metadata alongside profiles"
  - "Error code -> i18n key mapping: ERROR_REMEDIATIONS constant map, never call t() at module level"
  - "Intl.RelativeTimeFormat for locale-aware time display"

requirements-completed: [DASH-01, DASH-02, DASH-04]

# Metrics
duration: 4min
completed: 2026-04-02
---

# Phase 03 Plan 01: Data Layer Source Metadata Summary

**ResolvedProfiles type with source/collectedAt/reason/code propagation through IndexedDB and sessionStorage, plus relative-time and error-remediation utilities with en/zh i18n**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-02T09:45:29Z
- **Completed:** 2026-04-02T09:49:22Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- resolveProfiles() now returns ResolvedProfiles with source metadata (source, collectedAt, reason, code) propagated from /api/profiles through sessionStorage and IndexedDB caching layers
- Created formatRelativeTime() using native Intl.RelativeTimeFormat and isStale() for 7-day threshold detection
- Created ERROR_REMEDIATIONS map covering all 5 error codes (READ_PERMISSION_DENIED, READ_DIR_ERROR, PARSE_ERROR, COLLECTOR_UNREACHABLE, FETCH_ERROR)
- Added 15 i18n keys in both en and zh for data source awareness and error remediation strings

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend resolveProfiles() to return ResolvedProfiles** - `994a04e` (feat)
2. **Task 2: Create relative-time utility and error-remediation mapping** - `82331b9` (feat)

## Files Created/Modified
- `src/lib/store/profile-store.ts` - Added ResolvedProfiles interface, updated all caching/fetching to carry source metadata
- `src/lib/utils/relative-time.ts` - New: formatRelativeTime() and isStale() utilities
- `src/lib/utils/error-remediation.ts` - New: ERROR_REMEDIATIONS constant mapping error codes to i18n keys
- `src/lib/i18n/messages/en.ts` - Added data source awareness and error remediation keys
- `src/lib/i18n/messages/zh.ts` - Added Chinese translations for all new keys
- `src/components/import-dashboard-loader.tsx` - Updated to use resolved.profiles
- `src/app/portrait/page.tsx` - Updated to use resolved.profiles

## Decisions Made
- IndexedDB dual-key storage: kept 'current' for profiles and added 'current-meta' for source metadata to maintain backward compatibility with existing data
- Error remediation map stores i18n keys (not translated strings) per project convention of never calling t() at module level
- sessionStorage backward compatibility: old format (bare Record) is auto-detected by checking for 'source' field and wrapped with source: 'real'

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated existing resolveProfiles() consumers to use .profiles accessor**
- **Found during:** Task 1 (ResolvedProfiles return type change)
- **Issue:** import-dashboard-loader.tsx and portrait/page.tsx called Object.keys(resolved)/Object.values(resolved) directly on the return value -- would break with new ResolvedProfiles type
- **Fix:** Updated both consumers to access resolved.profiles instead
- **Files modified:** src/components/import-dashboard-loader.tsx, src/app/portrait/page.tsx
- **Verification:** TypeScript compiles without errors, npm run build succeeds
- **Committed in:** 994a04e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix to prevent TypeScript errors. No scope creep -- Plan 02 will further enhance these consumers with source-aware UI.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ResolvedProfiles type is ready for Plan 02 to build source-aware UI components (demo banners, error cards, stale warnings)
- formatRelativeTime() and isStale() are importable for displaying collection timestamps
- ERROR_REMEDIATIONS map is ready for error card rendering
- All existing page loaders continue to work via loadProfiles() backward compat

## Self-Check: PASSED

All 7 files verified present. Both commit hashes (994a04e, 82331b9) confirmed in git log. No stubs detected.

---
*Phase: 03-real-data-integration*
*Completed: 2026-04-02*
