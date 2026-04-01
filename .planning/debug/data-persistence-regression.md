# Debug: Data Persistence Regression

**Date**: 2026-04-01
**Status**: FIXED
**Symptom**: Imported data lost when navigating between pages. Dashboard reverts to demo data after visiting /portrait or /pipeline and returning.

---

## Root Causes

### Bug 1: Snapshot ordering (HIGH)
**File**: `src/components/import-dashboard-loader.tsx:43-52`, `src/app/portrait/page.tsx:186-189`
**Cause**: `getProfiles()` returns snapshots sorted newest-first by `collectedAt`. The `for-of` loop that builds the `loaded` map overwrites `loaded[snap.platform]` on each iteration. Since newest comes first and oldest comes last, the **oldest** snapshot per platform wins — the opposite of the intended behavior.
**Fix**: Added `if (loaded[snap.platform]) continue;` to skip platforms already set, keeping the first (newest) entry.

### Bug 2: XHS placeholder row (MEDIUM)
**File**: `src/lib/adapters/file-import-adapter.ts:628-660`
**Cause**: XHS exports include a merged placeholder row with text like "最多导出排序后前1000条笔记". This row passes the existing filter (`笔记标题` is non-empty) and creates a synthetic post with empty timestamp and all-zero metrics, polluting the data.
**Fix**: Added three-layer filtering:
1. Reject known placeholder text patterns (`最多导出排序后前1000条笔记`, `最多导出排序后前`)
2. Require either a valid publish date (`YYYY年MM月DD日` pattern) OR at least one non-zero metric (views, likes, comments, shares, saves)
3. Keep existing non-empty title check

### Bug 3: Fragmented data loading architecture (HIGH)
**File**: `src/components/import-dashboard-loader.tsx`, `src/app/portrait/page.tsx`
**Cause**: Each page independently implemented a 3-step loading chain: sessionStorage -> /api/profiles -> IndexedDB. Problems:
- sessionStorage is tab-scoped and ephemeral — lost on new tab or browser restart
- Some pages didn't implement all steps, or implemented them differently
- Collector API data was never persisted to IndexedDB, so it was refetched on every page load and lost if the API returned demo data on subsequent calls
- No single source of truth — each page could see different data

**Fix**: Created `resolveProfiles()` in `src/lib/store/profile-store.ts` as the single unified data resolver:
1. Checks sessionStorage cache (fast sync path for repeat visits within same tab)
2. Falls back to IndexedDB (persistent, survives tab close and browser restart)
3. Falls back to /api/profiles (Electron Collector data from filesystem)
4. When collector data is found, it is **persisted to IndexedDB** immediately so subsequent page loads find it without re-fetching
5. Returns empty record only when no real data exists anywhere

Both `import-dashboard-loader.tsx` and `portrait/page.tsx` now call `resolveProfiles()` instead of implementing their own loading chains.

---

## Architecture After Fix

```
Import/Collect
     |
     v
saveProfiles() -----> IndexedDB (persistent truth)
     |                     |
     +---> sessionStorage  |  (cache only)
                           |
resolveProfiles() <--------+
     |
     +--- sessionStorage cache (fast path)
     +--- IndexedDB (persistent path)
     +--- /api/profiles (collector fallback, persists to IDB)
     |
     v
  All Pages
```

**Key invariant**: Once real data is saved via `saveProfiles()`, it persists in IndexedDB. All pages read from the same `resolveProfiles()` function. Demo data is only shown when `resolveProfiles()` returns an empty record (no data in any source).

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/store/profile-store.ts` | Added `resolveProfiles()`, refactored internals into `readFromIndexedDB()`, `writeToIndexedDB()`, `readSessionCache()`, `writeSessionCache()`, `fetchAndPersistCollectorData()` |
| `src/components/import-dashboard-loader.tsx` | Replaced 60-line fragmented loading with single `resolveProfiles()` call |
| `src/app/portrait/page.tsx` | Replaced 60-line fragmented loading with single `resolveProfiles()` call; removed unused `CreatorSnapshot` import |
| `src/lib/adapters/file-import-adapter.ts` | XHS placeholder rejection + valid data requirement in `parseXhsNotes()` |

## Verification

- `npm run build` — compiles successfully
- `npm run test` — 32 test files, 308 tests passed
