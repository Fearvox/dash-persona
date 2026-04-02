# Phase 3: Real Data Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 03-real-data-integration
**Areas discussed:** Data source switching, Timestamp badge UX, Loading & skeleton states, Error message presentation
**Mode:** --auto (all decisions auto-selected with recommended defaults)

---

## Data Source Switching

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit source awareness | Propagate `ProfilesResult.source` to UI, show info banner for demo mode | ✓ |
| Silent auto-switch | Switch without user notification | |
| User toggle | Manual switch between demo/real data | |

**User's choice:** [auto] Explicit source awareness — propagate source field, persistent banner for demo mode
**Notes:** Aligns with Phase 1 D-02 principle: never silently fall back to demo data.

---

## Timestamp Badge UX

| Option | Description | Selected |
|--------|-------------|----------|
| Relative time + tooltip | "2h ago" with full ISO on hover, staleness warning at 7d, shared component | ✓ |
| Absolute timestamp | Full ISO datetime always visible | |
| No timestamp (metadata only) | Available in detail view but not inline | |

**User's choice:** [auto] Relative time with hover tooltip — Geist Mono, subtle color, 7-day staleness threshold
**Notes:** Reusable `<CollectedAt />` component for all pages.

---

## Loading & Skeleton States

| Option | Description | Selected |
|--------|-------------|----------|
| Existing skeleton pattern | Extend current loading.tsx + 300ms threshold | ✓ |
| Suspense boundaries | React Suspense with streaming | |
| Custom loading library | New loading state management | |

**User's choice:** [auto] Existing skeleton pattern with 300ms threshold
**Notes:** No new dependencies needed. Existing patterns in place.

---

## Error Message Presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error card | Full-width card in layout with code + remediation + red accent | ✓ |
| Toast notification | Dismissible toast for errors | |
| Modal dialog | Blocking modal with error details | |

**User's choice:** [auto] Inline error card — persistent, visible, with remediation guidance
**Notes:** Reuses existing error codes from `api/profiles.ts`. Follows design system.

---

## Claude's Discretion

- Skeleton implementation details (CSS shimmer vs animate-pulse)
- `<CollectedAt />` internal formatting
- Error code mapping table structure
- Shared `<DataSourceBanner />` extraction decision
- Source metadata propagation strategy

## Deferred Ideas

- Live collection progress in dashboard (SSE from Phase 2)
- Auto-refresh when Collector completes
- Manual demo/real data toggle
