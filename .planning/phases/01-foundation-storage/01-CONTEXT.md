# Phase 1: Foundation & Storage - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the `~/.dashpersona/` directory layout, atomic JSON write utilities, and Collector settings store. This is infrastructure only — no new UI surfaces. All subsequent phases depend on this file-system bus being stable and consistent.

</domain>

<decisions>
## Implementation Decisions

### Data Read Pattern
- **D-01:** Web app `/api/profiles` reads `~/.dashpersona/data/` directly via Node.js `fs` — does NOT proxy through Collector HTTP API. Web app must be able to run independently without the Collector process.

### Demo Fallback & Error Handling
- **D-02:** When real data is unavailable or collection fails, UI must explicitly indicate the situation — never silently fall back to demo data. Error messages must:
  - Tell the user the feature is unstable / explain the specific failure reason
  - Guide the user to manual data import as an alternative
  - Cover ALL error types comprehensively so users can file meaningful GitHub issues
- **D-03:** Error classification must be exhaustive — every failure path produces a specific, actionable error code and message (not generic "Something went wrong").

### Snapshot Schema
- **D-04:** Disk format wraps the existing `CreatorProfile` type with metadata — not a new schema. Structure: `{ schemaVersion, collectedAt, platform, uniqueId, profile: CreatorProfile }`. Optimize/extend the existing CreatorProfile as needed, don't fork it.

### Config Structure (electron-store)
- **D-05:** Phase 1 config includes BOTH foundational settings AND pre-reserved fields for Phase 2 scheduler:
  - Phase 1 active: `dataDir` path, `schemaVersion`, app preferences
  - Phase 2 reserved: scheduler intervals, job definitions (empty/defaults until Phase 2 implements them)
  - This avoids config migration between phases

### Claude's Discretion
- Atomic write implementation details (tmp file + rename pattern)
- ISO-8601 timestamp precision in filenames (seconds vs milliseconds)
- Directory creation strategy (on-demand vs startup check)
- Profile listing/sorting logic in `/api/profiles`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Schema
- `src/lib/schema/creator-data.ts` — Defines `CreatorProfile`, `Post`, `Platform`, `DataSource` types that the snapshot format wraps
- `src/lib/schema/validate.ts` — Validation utilities for CreatorProfile

### Collector Infrastructure
- `collector/src/server.ts` — Express HTTP API (currently :3458) — atomic write logic will be added to Collector's collection flow
- `collector/src/browser.ts` — Playwright browser management (page lifecycle)
- `collector/src/main.ts` — Electron main process (app initialization, where electron-store setup goes)

### Adapters (fallback chain)
- `src/lib/adapters/demo-adapter.ts` — Demo data adapter (fallback source)
- `src/lib/adapters/index.ts` — Adapter registry and lookup

### Requirements
- `.planning/REQUIREMENTS.md` §STOR — STOR-01 through STOR-04 define exact file paths and behaviors

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CreatorProfile` type (`src/lib/schema/creator-data.ts`): Complete with Platform, Post, DataSource — snapshot format wraps this directly
- `DemoAdapter` (`src/lib/adapters/demo-adapter.ts`): Existing fallback data source for when no real profiles exist
- Adapter registry (`src/lib/adapters/registry.ts`): Adapter lookup by name with fallback chains
- Error classification pattern (`collector/src/server.ts:16-29`): `classifyError()` pattern with error codes — extend this for collection write errors

### Established Patterns
- Express API with typed request/response and error classification (collector/src/server.ts)
- Next.js route handlers in `src/app/api/` (GET/POST exports with NextRequest/NextResponse)
- TypeScript strict mode with explicit type annotations

### Integration Points
- Collector: Add snapshot write logic after successful collection (currently data stays in memory)
- Web app: New `/api/profiles` route handler reads `~/.dashpersona/data/` filesystem
- electron-store: Initialize in `collector/src/main.ts` during app startup

</code_context>

<specifics>
## Specific Ideas

- Error messages should be comprehensive enough for users to copy-paste into GitHub issues — include error codes, context, and remediation steps
- Manual import should be surfaced as a fallback path when automated collection fails
- The data directory `~/.dashpersona/` is a user-local convention — respect platform conventions (macOS: `~/`, not `/tmp/`)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation-storage*
*Context gathered: 2026-03-31*
