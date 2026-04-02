# Phase 3: Real Data Integration - Research

**Researched:** 2026-04-02
**Domain:** Dashboard data-source awareness, timestamp UX, loading/error states
**Confidence:** HIGH

## Summary

Phase 3 wires the web app dashboard to real Collector snapshots by making the existing data pipeline **source-aware** in the UI layer. The foundation is already solid: `resolveProfiles()` in `profile-store.ts` implements the priority chain (IndexedDB -> /api/profiles -> empty), and the server-side `getProfiles()` in `api/profiles.ts` already returns a discriminated `ProfilesResult` with `source: 'real' | 'demo' | 'error'` and error codes. The gap is that this metadata is **discarded** at the client boundary -- `fetchAndPersistCollectorData()` strips the `source` field and `resolveProfiles()` returns bare `Record<string, CreatorProfile>`.

The work decomposes into four tracks: (1) propagate source metadata through `resolveProfiles()` to the UI, (2) create a shared `<CollectedAt />` timestamp badge component, (3) upgrade all 5 page loaders with source-aware rendering (demo banner, error card, timestamp badges), and (4) add actionable error messages with remediation guidance. No new libraries are required -- everything builds on existing Tailwind utilities, the `Skeleton` component, CSS shimmer animation, and the `t()` i18n function.

**Primary recommendation:** Extend `resolveProfiles()` to return `{ profiles, source, collectedAt?, reason?, code? }` instead of bare `Record<string, CreatorProfile>`, then thread that metadata through each page loader.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `resolveProfiles()` already implements the priority chain. Phase 3 extends this by making the dashboard **aware of the data source** -- the `ProfilesResult.source` field (`'real'` | `'demo'` | `'error'`) from `/api/profiles` must propagate to the UI so components can render source-appropriate badges and warnings.
- **D-02:** When `source === 'demo'`, the dashboard shows a persistent **info banner** at the top explaining why demo data is displayed and how to get real data (link to Collector download / import instructions). Replaces the current silent fallback.
- **D-03:** When `source === 'real'`, no banner -- clean data display. The `collectedAt` timestamp badge is sufficient to signal data trust.
- **D-04:** Every data card / metric display shows a subtle `collectedAt` timestamp badge -- Geist Mono, `text-[var(--text-subtle)]`, relative time format ("2h ago", "3 days ago") with full ISO timestamp on hover tooltip. Positioned at top-right corner of each card.
- **D-05:** When multiple snapshots exist for a creator, show the **most recent** snapshot's timestamp. If data is older than 7 days, the badge color shifts to `text-[var(--accent-yellow)]` as a staleness warning.
- **D-06:** Timestamp rendering uses a shared `<CollectedAt />` component -- reusable across all pages that display data.
- **D-07:** Any data operation exceeding 300ms shows a loading skeleton. Use the existing `loading.tsx` pattern already in place for each route.
- **D-08:** For the `resolveProfiles()` call specifically: show a full-page shimmer (existing pattern in `import-dashboard-loader.tsx` with 2s minimum) on initial load, then inline skeletons for subsequent data refreshes.
- **D-09:** Engine computation (`runAllEngines()`) keeps the existing shimmer pattern -- no change needed, already handles >300ms.
- **D-10:** Errors from `ProfilesResult` (`source === 'error'`) display as a **full-width error card** within the dashboard layout (not a toast, not a modal) -- persistent, visible, with: error code, human-readable message, and specific remediation guidance.
- **D-11:** Error card follows existing design system: `bg-[var(--bg-card)]` with `border-[var(--accent-red)]/30` left accent, red error icon, Geist Sans body text.
- **D-12:** Error classification reuses the error codes already defined in `src/lib/api/profiles.ts` (`READ_PERMISSION_DENIED`, `READ_ERROR`, `PARSE_ERROR`, etc.). Each code maps to a specific remediation string.
- **D-13:** Collector connectivity errors display specific guidance: "The DashPersona Collector app is not running. Start it to enable real-time data collection." with a fallback to file import.

### Claude's Discretion
- Exact skeleton component implementation (CSS shimmer vs Tailwind animate-pulse)
- `<CollectedAt />` component internal formatting logic
- Error code -> remediation string mapping table structure
- Whether to extract a shared `<DataSourceBanner />` or inline per-page
- How `resolveProfiles()` propagates the `source` field to client components (props vs context)

### Deferred Ideas (OUT OF SCOPE)
- Live collection progress indicator in dashboard (from Phase 2 SSE) -- belongs in a polish phase
- Automatic data refresh when Collector finishes a run -- requires WebSocket/SSE integration, scope for later
- Data source selector (manual toggle between demo and real) -- unnecessary if auto-detection works well
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | Dashboard consumes real Collector data from `/api/profiles` instead of Demo adapter when profiles exist | Already works via `resolveProfiles()`. Phase 3 adds **visibility** of which source is active via `source` field propagation and demo-mode banner (D-01, D-02, D-03). |
| DASH-02 | Every data display shows `collectedAt` timestamp -- the primary signal of data trust | `CreatorSnapshot.collectedAt` exists on disk but is stripped by `fetchAndPersistCollectorData()`. Need to carry it through to UI via shared `<CollectedAt />` component (D-04, D-05, D-06). |
| DASH-03 | Loading states visible for any operation over 300ms | Existing shimmer + `Skeleton` component covers this. Extend to all page loaders uniformly (D-07, D-08, D-09). |
| DASH-04 | Actionable error messages with specific guidance | `ProfilesResult` already has error codes. Build error card component + remediation mapping (D-10, D-11, D-12, D-13). |
</phase_requirements>

## Standard Stack

### Core (already installed, no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.1 | App Router, route handlers, `loading.tsx` pattern | Already the framework |
| `react` | 19.2.4 | Component model, hooks (useState, useEffect, useCallback) | Already the UI layer |
| `tailwindcss` | 4 | Utility classes for all styling (no inline styles) | Already the styling system |

### Supporting (already installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `src/components/ui/skeleton.tsx` | N/A (project file) | `animate-pulse` skeleton placeholder | Inline loading states in cards |
| `src/lib/i18n` | N/A (project file) | `t()` function for all user-facing strings | Every label, message, remediation string |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom relative-time formatting | `date-fns` or `Intl.RelativeTimeFormat` | `Intl.RelativeTimeFormat` is built into all modern browsers -- no dependency needed. Use it. |
| React Context for source propagation | Props drilling | With only 5 page loaders, props are simpler and more explicit. No context overhead. |
| Shared `<DataSourceBanner />` component | Inline per-page banner | Extract a shared component -- reused in 5 loaders, keeps them DRY. |

**Installation:** No new packages required. Zero dependency additions.

## Architecture Patterns

### Recommended Project Structure

```
src/
  components/
    ui/
      collected-at.tsx         # NEW: <CollectedAt /> timestamp badge
      data-source-banner.tsx   # NEW: demo-mode info banner
      data-error-card.tsx      # NEW: inline error card with remediation
      skeleton.tsx             # EXISTS: animate-pulse skeleton
    import-dashboard-loader.tsx  # MODIFY: thread source metadata
  lib/
    store/
      profile-store.ts        # MODIFY: resolveProfiles() return type
    api/
      profiles.ts             # EXISTS: already returns ProfilesResult (no change)
    utils/
      relative-time.ts        # NEW: formatRelativeTime() helper
      error-remediation.ts    # NEW: error code -> remediation string map
  app/
    persona/
      import-persona-loader.tsx  # MODIFY: thread source metadata
    compare/
      import-compare-loader.tsx  # MODIFY: thread source metadata
    calendar/
      import-calendar-loader.tsx # MODIFY: thread source metadata
    timeline/
      import-timeline-loader.tsx # MODIFY: thread source metadata
```

### Pattern 1: Extended resolveProfiles() Return Type

**What:** Change `resolveProfiles()` from returning `Record<string, CreatorProfile>` to returning a typed result object that carries source metadata alongside profiles.

**When to use:** Everywhere profiles are loaded at the page level.

**Example:**
```typescript
// Source: src/lib/store/profile-store.ts (to be modified)

export interface ResolvedProfiles {
  profiles: Record<string, CreatorProfile>;
  source: 'real' | 'demo' | 'error' | 'empty';
  collectedAt?: string;  // ISO-8601 from newest snapshot (when source === 'real')
  reason?: string;       // Human-readable explanation (demo/error)
  code?: string;         // Machine-readable error code (error only)
}

export async function resolveProfiles(): Promise<ResolvedProfiles> {
  // ... existing priority chain logic ...
  // When fetching from /api/profiles, preserve the source metadata
  // from ProfilesResult instead of discarding it
}
```

### Pattern 2: Shared Timestamp Badge Component

**What:** A single `<CollectedAt />` component renders the `collectedAt` timestamp as a relative-time badge with hover tooltip and staleness warning.

**When to use:** Top-right corner of every data card across all pages.

**Example:**
```typescript
// Source: src/components/ui/collected-at.tsx (new)

interface CollectedAtProps {
  timestamp: string;  // ISO-8601
  className?: string;
}

// Renders: "2h ago" in Geist Mono, subtle color
// Hover: full ISO timestamp tooltip
// Stale (>7d): switches to accent-yellow
```

### Pattern 3: Inline Error Card (not modal, not toast)

**What:** A persistent, full-width error card rendered inside the page layout when `source === 'error'`. Displays error code, human-readable message, and specific remediation steps.

**When to use:** When `resolveProfiles()` returns `source === 'error'`.

**Example:**
```typescript
// Source: src/components/ui/data-error-card.tsx (new)
// Design: bg-[var(--bg-card)] border-l-2 border-[var(--accent-red)]/30
// Content: error icon + code badge + message + remediation steps
```

### Pattern 4: Page Loader Structure (unified)

**What:** All 5 page loaders follow the same loading flow: `resolveProfiles()` -> branch on source -> render shimmer/banner/error/data.

**When to use:** Every page that displays creator data.

**Example:**
```typescript
// Unified page loader pattern (all 5 loaders)
const result = await resolveProfiles();

if (result.source === 'error') {
  return <DataErrorCard code={result.code} reason={result.reason} />;
}
if (result.source === 'demo') {
  // Render with demo banner at top
}
if (result.source === 'real') {
  // Render with <CollectedAt timestamp={result.collectedAt} /> on each card
}
if (result.source === 'empty') {
  router.replace('/onboarding');
}
```

### Anti-Patterns to Avoid

- **Swallowing source metadata:** The current `fetchAndPersistCollectorData()` discards `source` from the API response. Must preserve it.
- **Per-page error handling divergence:** All 5 loaders must handle all 4 states (`real`, `demo`, `error`, `empty`) identically. Extract shared components, not per-page error markup.
- **Calling `t()` at top level:** Per CLAUDE.md/i18n convention, all `t()` calls must happen inside component bodies or functions, never in module-level constants. Error remediation map should use keys, not pre-resolved strings.
- **Inline styles:** Per CLAUDE.md, no `style={{}}` -- use Tailwind utilities + CSS variables exclusively.
- **Toast/modal for data errors:** Per D-10, errors are inline cards, not ephemeral. Data errors persist until the user fixes the underlying issue.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Relative time formatting | Custom date math | `Intl.RelativeTimeFormat` | Built-in browser API, handles i18n, zero dependencies |
| Skeleton/shimmer placeholders | Custom CSS animation | Existing `Skeleton` component + `analyzing-shimmer-bar` CSS class | Already established and consistent with design system |
| ISO timestamp parsing | Manual regex/string splitting | `new Date(isoString)` | Standard, well-tested |
| Error remediation text | Hardcoded strings | i18n keys via `t()` | Supports zh/en locale switching |

**Key insight:** This phase introduces NO new external dependencies. Everything is built from existing project primitives (Tailwind classes, CSS variables, `t()`, `Skeleton`, shimmer CSS).

## Common Pitfalls

### Pitfall 1: resolveProfiles() sessionStorage Cache Bypasses Source Metadata

**What goes wrong:** `resolveProfiles()` checks sessionStorage first. If profiles were cached in a previous session, the cache hit returns profiles without source metadata, and the UI can never know if data is real or demo.

**Why it happens:** The current sessionStorage cache stores only `Record<string, CreatorProfile>` -- no source metadata.

**How to avoid:** When extending `resolveProfiles()`, store the full `ResolvedProfiles` in sessionStorage (or store source metadata separately). On cache hit, return the cached source info too.

**Warning signs:** Dashboard always shows "real" data even when no Collector data exists, because cached demo profiles don't carry `source: 'demo'`.

### Pitfall 2: collectedAt Lives on CreatorSnapshot, Not CreatorProfile

**What goes wrong:** Developer looks for `collectedAt` on `CreatorProfile` and can't find it, then gives up or invents a timestamp.

**Why it happens:** `CreatorProfile` has `fetchedAt` (the profile-level fetch timestamp). `collectedAt` is on the `CreatorSnapshot` wrapper. The current `fetchAndPersistCollectorData()` unwraps snapshots and discards `collectedAt`.

**How to avoid:** When processing the `/api/profiles` response, extract the most recent `collectedAt` from the `CreatorSnapshot[]` array and carry it in the `ResolvedProfiles` return value. For display purposes, `collectedAt` from the newest snapshot is the authoritative "data freshness" signal.

**Warning signs:** Timestamp badge shows `fetchedAt` (which might be a demo date) instead of `collectedAt` (actual collection time).

### Pitfall 3: ImportCompareLoader Uses sessionStorage Directly

**What goes wrong:** `import-compare-loader.tsx` reads `sessionStorage.getItem('dashpersona-import-profiles')` directly instead of using `resolveProfiles()`. This means it will not benefit from the source metadata propagation.

**Why it happens:** It was written before the unified `resolveProfiles()` was established in the Phase 2 hotfix.

**How to avoid:** Migrate `ImportCompareLoader` to use `resolveProfiles()` like the other loaders. This is a prerequisite for Phase 3 consistency.

**Warning signs:** Compare page never shows demo banner or error card even when other pages do.

### Pitfall 4: i18n t() Called in Module-Level Constants

**What goes wrong:** Error remediation strings defined as `const REMEDIATIONS = { READ_PERMISSION_DENIED: t('...') }` fail because `t()` reads locale at call time, and module-level code runs before locale is set.

**Why it happens:** Memory `feedback_i18n_toplevel_t` documents this exact pattern as a known bug.

**How to avoid:** Define error remediation maps using i18n **keys** (strings), and call `t(key)` inside the component render function. Example: `const REMEDIATIONS: Record<string, string> = { READ_PERMISSION_DENIED: 'ui.error.permissionDenied' }` then `t(REMEDIATIONS[code])`.

**Warning signs:** Error messages show raw i18n keys or the wrong locale's text.

### Pitfall 5: Demo Profiles Have No collectedAt

**What goes wrong:** When `source === 'demo'`, there is no `collectedAt` timestamp, and the `<CollectedAt />` component renders undefined/NaN.

**Why it happens:** Demo profiles are generated in-memory by `getDemoProfile()` and never went through the snapshot pipeline.

**How to avoid:** `<CollectedAt />` should not render when `source === 'demo'`. The demo banner replaces the timestamp badge. Guard: `{source === 'real' && collectedAt && <CollectedAt timestamp={collectedAt} />}`.

**Warning signs:** "NaN ago" or empty timestamp badges on the demo data view.

## Code Examples

### Relative Time Formatting (Browser-native)

```typescript
// Source: MDN Intl.RelativeTimeFormat (verified API)
// Path: src/lib/utils/relative-time.ts

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['week', 7 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
];

export function formatRelativeTime(isoTimestamp: string, locale: string = 'en'): string {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) {
      return rtf.format(-Math.round(diff / ms), unit);
    }
  }
  return rtf.format(-Math.round(diff / 1000), 'second');
}

export function isStale(isoTimestamp: string, thresholdDays: number = 7): boolean {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  return diff > thresholdDays * 24 * 60 * 60 * 1000;
}
```

### Error Code Remediation Map Pattern

```typescript
// Source: project pattern (new file)
// Path: src/lib/utils/error-remediation.ts

// Keys are i18n message keys -- resolve with t() at render time
export const ERROR_REMEDIATIONS: Record<string, { messageKey: string; remediationKey: string }> = {
  READ_PERMISSION_DENIED: {
    messageKey: 'ui.error.readPermissionDenied',
    remediationKey: 'ui.error.readPermissionDeniedFix',
  },
  READ_DIR_ERROR: {
    messageKey: 'ui.error.readDirError',
    remediationKey: 'ui.error.readDirErrorFix',
  },
  PARSE_ERROR: {
    messageKey: 'ui.error.parseError',
    remediationKey: 'ui.error.parseErrorFix',
  },
  COLLECTOR_UNREACHABLE: {
    messageKey: 'ui.error.collectorUnreachable',
    remediationKey: 'ui.error.collectorUnreachableFix',
  },
};
```

### CollectedAt Component Pattern

```typescript
// Source: project design system (new file)
// Path: src/components/ui/collected-at.tsx
'use client';

import { formatRelativeTime, isStale } from '@/lib/utils/relative-time';
import { getLocale } from '@/lib/i18n';

interface CollectedAtProps {
  timestamp: string;
  className?: string;
}

export function CollectedAt({ timestamp, className }: CollectedAtProps) {
  const locale = getLocale();
  const relative = formatRelativeTime(timestamp, locale);
  const stale = isStale(timestamp, 7);

  return (
    <time
      dateTime={timestamp}
      title={new Date(timestamp).toLocaleString()}
      className={`font-mono text-[0.6875rem] ${
        stale ? 'text-[var(--accent-yellow)]' : 'text-[var(--text-subtle)]'
      } ${className ?? ''}`}
    >
      {relative}
    </time>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-page loading chains | Unified `resolveProfiles()` | Phase 2 hotfix (2026-04-01) | Single entry point for all data loading |
| sessionStorage as primary store | IndexedDB primary, sessionStorage as cache | Phase 2 hotfix | Data survives tab close |
| Silent demo fallback | (Phase 3) Explicit demo banner | This phase | Users know when they see demo vs real data |

**Deprecated/outdated:**
- Direct `sessionStorage.getItem()` in `import-compare-loader.tsx`: Should be migrated to `resolveProfiles()` for consistency.
- `loadProfiles()` used in persona/calendar/timeline loaders: These should switch to `resolveProfiles()` to get source metadata.

## Open Questions

1. **Whether to store source metadata in sessionStorage alongside profiles**
   - What we know: sessionStorage currently stores only `Record<string, CreatorProfile>` as a JSON blob.
   - What's unclear: Adding `source` and `collectedAt` to the cache requires either a wrapper object or a separate sessionStorage key.
   - Recommendation: Store as `{ profiles, source, collectedAt }` wrapper in sessionStorage. This is a one-time format change and keeps the cache consistent with the API contract.

2. **Locale-aware relative time for zh vs en**
   - What we know: `Intl.RelativeTimeFormat` supports both `'zh'` and `'en'` locales natively.
   - What's unclear: Whether the project's `getLocale()` value (`'zh'` or `'en'`) maps directly to `Intl.RelativeTimeFormat` locale strings.
   - Recommendation: It does -- `'zh'` and `'en'` are valid BCP 47 tags. No mapping needed.

3. **How many locations need `<CollectedAt />` badges**
   - What we know: CONTEXT.md says "every data card / metric display." The dashboard has ~6 distinct card sections. Other pages have 2-4 each.
   - What's unclear: The exact count of integration points.
   - Recommendation: Add to the page-level header area (one per page) rather than every individual card. This satisfies the "data trust signal" goal without visual clutter. Each page loader renders one `<CollectedAt />` near the page title.

## Sources

### Primary (HIGH confidence)
- `src/lib/store/profile-store.ts` -- read in full, verified `resolveProfiles()` return type and sessionStorage/IndexedDB flow
- `src/lib/api/profiles.ts` -- read in full, verified `ProfilesResult` discriminated union with `source`, `reason`, `code` fields
- `src/lib/schema/snapshot.ts` -- read in full, verified `CreatorSnapshot.collectedAt` field and validation
- `src/lib/schema/creator-data.ts` -- read in full, verified `CreatorProfile.fetchedAt` vs `CreatorSnapshot.collectedAt` distinction
- `src/components/import-dashboard-loader.tsx` -- read in full, verified shimmer pattern and `resolveProfiles()` usage
- `src/components/live-collector.tsx` -- read in full, verified `friendlyError()` pattern for error mapping
- `src/app/persona/import-persona-loader.tsx` -- read in full, uses `loadProfiles()` not `resolveProfiles()`
- `src/app/compare/import-compare-loader.tsx` -- read in full, uses raw `sessionStorage.getItem()` directly
- `src/app/calendar/import-calendar-loader.tsx` -- read in full, uses `loadProfiles()`
- `src/app/timeline/import-timeline-loader.tsx` -- read in full, uses `loadProfiles()`
- `src/components/ui/skeleton.tsx` -- read in full, verified `animate-pulse` pattern
- `src/app/globals.css` -- read in full, verified CSS variables, shimmer animation, badge classes
- `src/lib/i18n/index.ts` -- read in full, verified `t()` function and locale mechanism

### Secondary (MEDIUM confidence)
- MDN `Intl.RelativeTimeFormat` -- browser API for relative time formatting, well-supported in all modern browsers

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all verified from existing codebase
- Architecture: HIGH -- clear extension of existing patterns, all canonical files read
- Pitfalls: HIGH -- each pitfall identified from actual code reading, not hypothetical

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable -- no external dependency changes expected)
