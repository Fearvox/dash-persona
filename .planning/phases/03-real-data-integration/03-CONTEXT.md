# Phase 3: Real Data Integration - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire the web app dashboard to real Collector snapshots instead of the Demo adapter, with data-trust timestamps, loading states, and actionable error messages throughout. This phase changes HOW the dashboard consumes data — no new analysis engines, no new pages, no Collector changes.

Requirements: DASH-01, DASH-02, DASH-03, DASH-04.

</domain>

<decisions>
## Implementation Decisions

### Data Source Switching (DASH-01)
- **D-01:** `resolveProfiles()` already implements the priority chain (IndexedDB → /api/profiles → empty). Phase 3 extends this by making the dashboard **aware of the data source** — the `ProfilesResult.source` field (`'real'` | `'demo'` | `'error'`) from `/api/profiles` must propagate to the UI so components can render source-appropriate badges and warnings.
- **D-02:** When `source === 'demo'`, the dashboard shows a persistent **info banner** at the top explaining why demo data is displayed and how to get real data (link to Collector download / import instructions). This replaces the current silent fallback.
- **D-03:** When `source === 'real'`, no banner — clean data display. The `collectedAt` timestamp badge is sufficient to signal data trust.

[auto] Selected recommended: explicit source awareness propagated via `ProfilesResult.source` field, persistent banner for demo mode only.

### Timestamp Badge UX (DASH-02)
- **D-04:** Every data card / metric display shows a subtle `collectedAt` timestamp badge — Geist Mono, `text-[var(--text-subtle)]`, relative time format ("2h ago", "3 days ago") with full ISO timestamp on hover tooltip. Positioned at top-right corner of each card.
- **D-05:** When multiple snapshots exist for a creator, show the **most recent** snapshot's timestamp. If data is older than 7 days, the badge color shifts to `text-[var(--accent-yellow)]` as a staleness warning.
- **D-06:** Timestamp rendering uses a shared `<CollectedAt />` component — reusable across all pages that display data (dashboard, persona, compare, calendar, timeline).

[auto] Selected recommended: relative time with hover tooltip, staleness warning at 7 days, shared component.

### Loading & Skeleton States (DASH-03)
- **D-07:** Any data operation exceeding 300ms shows a loading skeleton. Use the existing `loading.tsx` pattern already in place for each route (dashboard/loading.tsx, persona/loading.tsx, etc.).
- **D-08:** For the `resolveProfiles()` call specifically: show a full-page shimmer (existing pattern in `import-dashboard-loader.tsx` with 2s minimum) on initial load, then inline skeletons for subsequent data refreshes.
- **D-09:** Engine computation (`runAllEngines()`) keeps the existing shimmer pattern — no change needed, already handles >300ms.

[auto] Selected recommended: existing skeleton pattern + 300ms threshold, no new loading library needed.

### Error Message Presentation (DASH-04)
- **D-10:** Errors from `ProfilesResult` (`source === 'error'`) display as a **full-width error card** within the dashboard layout (not a toast, not a modal) — persistent, visible, with: error code, human-readable message, and specific remediation guidance.
- **D-11:** Error card follows existing design system: `bg-[var(--bg-card)]` with `border-[var(--accent-red)]/30` left accent, red error icon, Geist Sans body text.
- **D-12:** Error classification reuses the error codes already defined in `src/lib/api/profiles.ts` (`READ_PERMISSION_DENIED`, `READ_ERROR`, `PARSE_ERROR`, etc.). Each code maps to a specific remediation string.
- **D-13:** Collector connectivity errors (Collector unreachable) display specific guidance: "The DashPersona Collector app is not running. Start it to enable real-time data collection." with a fallback to file import.

[auto] Selected recommended: inline error card with code + remediation, reuse existing error codes, no modal/toast.

### Claude's Discretion
- Exact skeleton component implementation (CSS shimmer vs Tailwind animate-pulse)
- `<CollectedAt />` component internal formatting logic
- Error code → remediation string mapping table structure
- Whether to extract a shared `<DataSourceBanner />` or inline per-page
- How `resolveProfiles()` propagates the `source` field to client components (props vs context)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Layer (core dependency)
- `src/lib/store/profile-store.ts` — `resolveProfiles()` and `saveProfiles()` — the single source of truth for profile data loading
- `src/lib/api/profiles.ts` — `getProfiles()` server-side function, returns `ProfilesResult` with `source` field and error codes
- `src/app/api/profiles/route.ts` — HTTP wrapper around `getProfiles()`
- `src/lib/schema/snapshot.ts` — `CreatorSnapshot` type with `collectedAt` field

### Dashboard Components (must be modified)
- `src/components/import-dashboard-loader.tsx` — Main dashboard data loader, already uses `resolveProfiles()`
- `src/components/dashboard-interactive.tsx` — Dashboard widget container
- `src/components/live-collector.tsx` — Collector status + live updates component (error handling pattern to reuse)

### Other Page Loaders (timestamp badge integration)
- `src/app/persona/import-persona-loader.tsx` — Persona page data loader
- `src/app/compare/import-compare-loader.tsx` — Compare page data loader
- `src/app/calendar/import-calendar-loader.tsx` — Calendar page data loader
- `src/app/timeline/import-timeline-loader.tsx` — Timeline page data loader

### Run Log (data trust context)
- `src/app/api/run-log/route.ts` — Collection history API (useful for showing "last collected" context)

### Design System
- `src/app/globals.css` — CSS variables for colors, fonts
- Existing `loading.tsx` files per route — skeleton pattern to extend

### Phase 1 Foundation
- `collector/src/storage.ts` — Snapshot write path (atomicWriteJSON)
- `collector/src/snapshot-types.ts` — CreatorSnapshot type (collector side)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `resolveProfiles()` in `profile-store.ts` — already the unified data resolver, just needs source metadata propagation
- `ProfilesResult` type in `api/profiles.ts` — already has `source: 'real' | 'demo' | 'error'` discrimination
- `friendlyError()` in `live-collector.tsx` — pattern for mapping raw errors to user-friendly messages
- `loading.tsx` per route — existing skeleton infrastructure
- 2s shimmer pattern in `import-dashboard-loader.tsx` — established loading UX

### Established Patterns
- All page loaders follow the same structure: `resolveProfiles()` → engine run → render
- Error handling uses return-based status objects (not throwing)
- i18n via `t()` function for all user-facing strings (call inside component body, never top-level)
- Tailwind + CSS variables for all styling, no inline styles

### Integration Points
- `resolveProfiles()` return type needs to carry `source` metadata from `/api/profiles`
- Each page loader component is the injection point for timestamp badges and error states
- `globals.css` for any new CSS variable tokens (if needed for error/staleness states)

</code_context>

<specifics>
## Specific Ideas

- Phase 1 D-02 established: "never silently fall back to demo data" — Phase 3 makes this visible in the UI
- Phase 2 D-10 established SSE for collection status — Phase 3 can optionally show live collection progress in the dashboard
- The debug session fix (`data-persistence-regression`) already unified the loading architecture — Phase 3 builds on top of `resolveProfiles()` rather than re-inventing

</specifics>

<deferred>
## Deferred Ideas

- Live collection progress indicator in dashboard (from Phase 2 SSE) — belongs in a polish phase
- Automatic data refresh when Collector finishes a run — requires WebSocket/SSE integration, scope for later
- Data source selector (manual toggle between demo and real) — unnecessary if auto-detection works well

</deferred>

---

*Phase: 03-real-data-integration*
*Context gathered: 2026-04-02*
