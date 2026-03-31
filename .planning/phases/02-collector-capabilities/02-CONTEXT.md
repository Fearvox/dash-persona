# Phase 2: Collector Capabilities - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the Electron Collector with TikTok profile collection, scheduled automation, batch progress UI, and persistent run logging. This phase makes automated multi-creator collection viable and observable. All UI is within the Electron Collector app — no web app UI changes.

</domain>

<decisions>
## Implementation Decisions

### TikTok Collection Strategy
- **D-01:** Hybrid extraction — network interception as primary (intercept `/api/user/detail/` and `/api/post/item_list/` for structured JSON), DOM scraping as fallback for any missing fields. This maximizes reliability.
- **D-02:** Full stealth with playwright-extra + stealth plugin — comprehensive fingerprint masking (WebGL, canvas, fonts, navigator properties) in addition to deleting `cdc_*` and disabling AutomationControlled. Navigation jitter 1.5-3.5s between actions.
- **D-03:** CAPTCHA handling: pause collection, surface the Playwright browser window so user can solve manually, auto-resume after page navigates past the CAPTCHA. In batch mode, current creator pauses while remaining creators continue if possible.
- **D-04:** Post count is configurable per job — users set how many posts to collect (default: 20). Stored in job config. The engine modules accept variable post counts.

### Scheduler
- **D-05:** Preset intervals only (no raw cron) — dropdown with: every 6h, every 12h, daily, weekly. Stored as interval label in `~/.dashpersona/config.json` scheduler section (reserved in Phase 1).
- **D-06:** On macOS wake/unlock (powerMonitor resume), if a job missed its window, **notify the user** with a choice: "Run now" or "Wait for next scheduled time" or "Run later (custom delay)". Do NOT auto-run silently.
- **D-07:** Sequential queue — one creator at a time in a single Playwright context. Reduces memory, detection risk, and simplifies error isolation. Batch status shows queue position.
- **D-08:** Jobs persist to `~/.dashpersona/jobs.json` (per COLL-04). Loaded on app startup, survive restarts.

### Batch Progress UX
- **D-09:** Dedicated Electron BrowserWindow for batch progress — shows a status table with per-creator rows (queued / running / done / failed), elapsed time, and error details. Tray icon color reflects activity state.
- **D-10:** Dual update mechanism (Claude's decision):
  - **IPC** (primary): Electron IPC from main process to BrowserWindow renderer for fast, native updates
  - **SSE** (secondary): Server-Sent Events from Express API so the web app can also consume collection status in Phase 3
- **D-11:** Error details visible inline per creator row — error code, message, and remediation guidance (consistent with Phase 1 error classification pattern).

### Run Log & History
- **D-12:** Run log persists to `~/.dashpersona/run-log.json` with: timestamp, creator uniqueId, platform, status (success/failed/captcha/skipped), duration, error details if failed.
- **D-13:** Retention policy is user-configurable in Collector settings — options: by count (e.g. last 100/500/1000 entries), by days (e.g. last 30/90/180 days), or keep all. Default: last 500 entries. Before any pruning, user is shown what will be removed and must confirm.
- **D-14:** Web app access to run log (Claude's decision): YES — create `/api/run-log` route (same pattern as `/api/profiles`) so Phase 3 can display collection history in the dashboard. Run log is useful for data trust UX.

### Claude's Discretion
- node-cron vs custom interval timer implementation
- BrowserWindow dimensions and layout for batch progress
- SSE event format and endpoint path
- IPC channel naming conventions
- Job queue data structure and state machine
- Stealth plugin configuration specifics

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 Foundation (dependencies)
- `collector/src/storage.ts` — atomicWriteJSON, ensureDataDir, classifyStorageError (reuse for run-log writes)
- `collector/src/config.ts` — CollectorConfig with scheduler reserved fields (populate in this phase)
- `collector/src/snapshot-types.ts` — CreatorSnapshot, snapshotFilename (write snapshots after TikTok collection)
- `collector/src/server.ts` — Express API with POST /snapshot (extend with SSE endpoint)
- `src/lib/schema/snapshot.ts` — Canonical CreatorSnapshot type (web app side)

### Collector Infrastructure
- `collector/src/browser.ts` — BrowserManager singleton, persistent Chromium context, page lifecycle
- `collector/src/main.ts` — Electron startup sequence (config → dataDir → browser → server → tray)
- `collector/src/tray.ts` — System tray with status indicator (extend with collection activity state)
- `collector/src/preload.ts` — IPC bridge for renderer-to-main communication

### Schema & Types
- `src/lib/schema/creator-data.ts` — CreatorProfile, Post, Platform, DataSource types
- `.planning/REQUIREMENTS.md` §COLL — COLL-01 through COLL-08 define exact behaviors

### Phase 1 Context (locked decisions)
- `.planning/phases/01-foundation-storage/01-CONTEXT.md` — D-01 through D-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `atomicWriteJSON` (collector/src/storage.ts): Reuse for run-log writes — same crash-safe pattern
- `classifyStorageError` (collector/src/storage.ts): Extend error classification for collection-specific failures
- `classifyError` (collector/src/server.ts): Express error classification — extend for TikTok-specific errors
- `BrowserManager` (collector/src/browser.ts): Singleton with persistent context — add TikTok collection methods here
- `TrayManager` (collector/src/tray.ts): Has status indicator — extend with collection activity states
- `CollectorConfig.scheduler` (collector/src/config.ts): Reserved fields ready to populate

### Established Patterns
- Express API with typed request/response and error classification
- Electron IPC via preload.ts bridge
- System tray with colored circle status icon
- Browser crash recovery with retry logic (main.ts)

### Integration Points
- BrowserManager: Add TikTok-specific collection flow (navigate, intercept, scrape, snapshot)
- Express server: Add SSE endpoint for real-time status streaming
- Main process: Initialize scheduler after config, register powerMonitor listeners
- Config store: Populate scheduler.jobs and scheduler.enabled fields
- New BrowserWindow: Create progress UI window (HTML/CSS rendered by Electron)

</code_context>

<specifics>
## Specific Ideas

- CAPTCHA handling should surface the browser window — user solves it visually, not programmatically
- Missed-run notification should give 3 choices (run now / wait for next / custom delay) — user stays in control
- Post count per creator is configurable — power users may want 50, casual users want 20
- Run log retention has a confirmation step before any data is deleted
- Error messages continue the Phase 1 pattern: specific codes, actionable remediation, GitHub-issue-friendly

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-collector-capabilities*
*Context gathered: 2026-03-31*
