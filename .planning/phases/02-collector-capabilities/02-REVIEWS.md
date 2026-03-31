---
phase: 2
reviewers: [gemini, codex]
reviewed_at: 2026-03-31T21:15:00.000Z
plans_reviewed: [02-01-PLAN.md, 02-02-PLAN.md, 02-03-PLAN.md, 02-04-PLAN.md]
---

# Cross-AI Plan Review — Phase 2: Collector Capabilities

## Gemini Review

### 1. Summary
The proposed plans represent a logical, well-sequenced approach to fulfilling the Phase 2 requirements while strictly adhering to the project's constraints (local JSON, Electron, no cloud). The division of work into distinct waves (TikTok extraction, Scheduling, Logging, Batch/UI) ensures that complex capabilities build upon stable primitives. The architecture makes smart trade-offs, particularly the choice to process batches sequentially and use plain HTML for Electron windows to avoid build complexity. However, there are notable risks surrounding automation interruptions (CAPTCHAs, sleep cycles) and file I/O concurrency that need refinement.

### 2. Strengths
*   **Anti-Fingerprinting Strategy (Plan 01):** Utilizing `playwright-extra` with the stealth plugin and passive network interception (`page.on('response')`) is the most robust method for bypassing TikTok's rigorous bot detection without triggering immediate blocks.
*   **Proactive Lifecycle Management (Plan 02):** Hooking into Electron's `powerMonitor` to handle macOS App Nap and unlock events is an excellent, necessary detail for a desktop scheduler.
*   **I/O Optimization (Plan 03):** The decision to auto-trim the run log only when it reaches a 2x threshold is a smart performance optimization that reduces disk write churn.
*   **Resource Management (Plan 04):** Enforcing sequential processing for the batch queue prevents CPU/Memory spikes and avoids triggering rate limits that concurrent headless browser instances would likely cause.
*   **Build Simplicity (Plan 04):** Using plain HTML/CSS/JS for the Electron progress and settings windows avoids introducing a secondary React/Tailwind build pipeline into the Electron app.

### 3. Concerns
*   **HIGH - Blocking UI on Missed Runs (Plan 02):** Using `dialog.showMessageBox` for missed runs will block the Electron main process. If a user is away for a weekend and multiple jobs miss their schedules, this could result in overlapping dialogs, freezing the background process, or interrupting the user aggressively upon wake.
*   **HIGH - API Volatility (Plan 01):** Relying on exact interception of `/api/user/detail/` and `/api/post/item_list/` is brittle. If TikTok changes the response schema or route structure, the collector will silently fail or crash if mapping is assumed safe.
*   **MEDIUM - CAPTCHA Handling in Scheduled Jobs (Plan 01/04):** A hardcoded 5-minute CAPTCHA timeout is reasonable for manual runs but problematic for background scheduled runs. If a job hits a CAPTCHA while the user is asleep, it will time out, fail, and potentially flag the IP/session.
*   **MEDIUM - File Read/Write Concurrency (Plan 03):** While `atomicWriteJSON` protects against corruption during writes, the Next.js API route (`/api/run-log`) could attempt to read `run-log.json` at the exact millisecond the Electron app is replacing it, potentially causing a `ENOENT` or JSON parse error in the web app.
*   **MEDIUM - Visual Consistency (Plan 04):** The Next.js app uses Tailwind CSS 4 and is "dark mode only." Plain HTML windows in Electron might look wildly different or default to light mode if not carefully styled to match the main app's design system.
*   **LOW - Event Listener Leaks (Plan 01):** If `page.on('response')` listeners are not explicitly removed after a creator's collection finishes (especially in a reused Playwright context), it will cause memory leaks over time.

### 4. Suggestions
*   **Refine Missed Run Notifications (Plan 02):** Replace the blocking `dialog.showMessageBox` with native OS notifications (`new Notification()`). Queue missed runs internally and display a non-blocking banner or list in the Electron UI/Tray when the user returns.
*   **Add Schema Validation (Plan 01):** Implement strict validation (e.g., using Zod) on the intercepted JSON payloads before mapping them to the `CreatorProfile`. This ensures the app fails gracefully and logs a clear error if TikTok changes their API.
*   **Differentiate CAPTCHA Timeouts (Plan 01/04):** Implement different CAPTCHA behaviors based on the run context. For manual runs, a 5-minute timeout is fine. For scheduled background runs, immediately pause the batch queue and wait indefinitely for user interaction, altering the tray icon to alert them.
*   **Ensure True Atomicity & Read Retries (Plan 03):** Ensure `atomicWriteJSON` writes to a `.tmp` file and uses `fs.renameSync` (which is atomic on POSIX systems). Additionally, add a short retry block in the Next.js `/api/run-log` route to catch and retry if the file is momentarily inaccessible.
*   **Share Compiled Styles (Plan 04):** Generate a static, minified build of the Tailwind CSS file from the Next.js app and inject it into the plain HTML Electron windows to guarantee UI consistency.
*   **Cleanup Playwright Contexts (Plan 01):** Ensure all event listeners are cleaned up in a `finally` block, or better yet, spawn a fresh Playwright `BrowserContext` for each creator in the batch queue to guarantee isolation and clean memory.

### 5. Risk Assessment
**Risk Level: MEDIUM**

The architectural foundation is highly aligned with the project's constraints and avoids over-engineering. The isolated use of local JSON and a sequential queue keeps the system predictable. However, building reliable automation on top of third-party web platforms (TikTok) and desktop power states (macOS App Nap) is inherently volatile. Addressing the concerns around blocking dialogs, file concurrency, and CAPTCHA handling during unattended runs will upgrade this from a "Medium Risk" plan to a highly resilient implementation.

---

## Codex Review

### Cross-Plan Themes

- The biggest missing piece across all four plans is a **single runtime owner** for collection, status, and logging. Right now the repo already has a collector HTTP surface in server.ts and a web-app bridge in cdp-collect route. The plans need one canonical contract, or the phase will ship with duplicated behavior.
- The Collector currently has **almost no test surface**. That makes Plan 04 especially risky because it stacks runtime orchestration, UI, IPC, SSE, and packaging in one move.
- There is already config state reserved in config.ts. Any new `jobs.json`, retention config, and run-log config need a clear source-of-truth model or they will drift.
- The current tray status model in tray.ts is simple and periodically recomputed. Plans that add `collecting` and `captcha` need status precedence, or the tray will overwrite transient runtime states.

### Plan 01: TikTok Collection Engine

**Summary**
This is the strongest plan technically. It aligns well with COLL-01/COLL-02 and the hybrid extraction decision, and it uses bounded behaviors instead of open-ended scraping. The main weakness is ownership: it introduces collection, persistence, CAPTCHA flow, and status updates without clearly defining which layer is authoritative.

**Strengths**
- Passive `page.on('response')` interception is lower-risk than request routing and should be more stable against TikTok breakage.
- Anti-fingerprint work is concrete rather than vague.
- CAPTCHA handling is explicit and operationally useful.
- Bounded scroll attempts and jitter reduce runaway collection behavior.
- Atomic snapshot writing matches the local-only durability model.

**Concerns**
- `HIGH`: The plan appears to let `tiktok-collector.ts` write snapshots directly even though server.ts already owns snapshot validation/write behavior. That creates duplicate persistence paths and inconsistent errors.
- `HIGH`: Adding `collecting`/`captcha` to `BrowserStatus` is not enough by itself because tray.ts recomputes status from login state every 30s and can clobber those transient states.
- `MEDIUM`: The DOM fallback is named as a key decision, but the plan does not define when fallback triggers, how partial interception data is merged, or what minimum completeness is required before writing a snapshot.
- `MEDIUM`: `POST /collect` needs explicit input validation for allowed platforms and URLs. The server is localhost-only, but any local process can call it.
- `MEDIUM`: Listener cleanup is not described. In a persistent context, stale response listeners and orphan pages will accumulate across runs.

**Suggestions**
- Make one layer own persistence: either `/collect` returns a `CreatorProfile` and the handler persists, or the collector service persists and `/collect` only orchestrates.
- Define a strict request/response schema for `/collect` that matches the existing web-app bridge expectations.
- Add explicit cleanup rules for page listeners, CAPTCHA observers, and page closure on every success/failure/cancel path.
- Define the fallback contract: trigger conditions, merge rules, and validation threshold.
- Add mocked Playwright tests for interception parsing, CAPTCHA pause/resume, and cleanup behavior.

**Risk Assessment:** MEDIUM

### Plan 02: Scheduler and Job Persistence

**Summary**
This plan is directionally right and matches the phase requirements well, especially around App Nap recovery. The main issue is data modeling: it currently mixes config persistence and dedicated job persistence in a way that looks under-specified.

**Strengths**
- Preset intervals are the right call and fit D-05.
- Power-monitor hooks are necessary, not optional, for macOS viability.
- The enqueue callback seam is a good abstraction boundary.
- Atomic jobs persistence is appropriate for local JSON storage.

**Concerns**
- `HIGH`: The plan keeps scheduler data in config.ts and also persists jobs to `~/.dashpersona/jobs.json`. That is a dual source of truth unless responsibilities are explicitly separated.
- `HIGH`: Missed-run handling is described for resume/unlock, but not for app startup after downtime. That weakens COLL-04/COLL-05 in the real restart path.
- `MEDIUM`: Missed-run detection needs persisted timestamps like `lastScheduledAt`, `lastStartedAt`, and `lastCompletedAt`. Without that, reconciliation becomes heuristic and non-deterministic.
- `MEDIUM`: The placeholder enqueue function means the scheduler can be "wired" without proving actual collection works end-to-end.
- `MEDIUM`: Multiple missed jobs could trigger stacked dialogs unless prompts are coalesced.

**Suggestions**
- Pick one canonical storage model: `config.json` for global preferences, `jobs.json` for job definitions, and keep runtime metadata separate.
- Reconcile missed runs on both startup and resume/unlock.
- Persist enough job execution metadata to make missed-run logic deterministic.
- Define how the scheduler behaves when the queue is already busy.
- Add fake-clock tests for interval mapping, restart recovery, and missed-run prompting.

**Risk Assessment:** MEDIUM-HIGH

### Plan 03: Run Log System

**Summary**
This is a pragmatic local-first logging design and a good fit for the product constraints. The main risk is not the file format; it is write ownership and concurrency once manual runs, scheduled runs, and batch runs all exist.

**Strengths**
- Append-oriented JSON log is simple and inspectable.
- Retention policy and pruning acknowledge long-term disk growth.
- A Next.js read route is useful for later dashboard integration.
- Newest-first filtering is the right default for operator visibility.

**Concerns**
- `HIGH`: Plan 03 logs in `POST /collect`, while Plan 04 also proposes queue-level logging. That will double-log the same run unless one owner is chosen.
- `HIGH`: Atomic rewrite does not prevent lost updates when two app paths append simultaneously. Read-modify-write needs serialization.
- `MEDIUM`: The `/api/run-log` route needs robust handling for missing file, invalid JSON, concurrent rename windows, and limit abuse.
- `MEDIUM`: Retention is called "configurable," but the plan does not say where the config lives or who enforces it.
- `LOW`: Auto-trimming only at 2x threshold is efficient, but it can still allow significant growth in high-frequency schedules.

**Suggestions**
- Introduce a `runId` and centralize logging in one module with an in-process mutex/queue.
- Define one authoritative place where a run is created, updated, and completed.
- Treat file-not-found as an empty log and validate all query params on the API route.
- Version the run-log schema explicitly.
- Keep pruning separate from normal append flow.

**Risk Assessment:** MEDIUM

### Plan 04: Batch Queue, Progress UI, Settings Window

**Summary**
This plan is the one that makes the phase feel real to users, and its main architecture choices are sensible. It is also the riskiest plan because it bundles too many moving parts into one wave and the current Collector codebase does not have much verification scaffolding.

**Strengths**
- Sequential queueing matches D-07 and reduces browser/session complexity.
- Dedicated progress UI matches D-09 and gives operators concrete visibility.
- IPC primary plus SSE secondary matches the intended architecture.
- Plain HTML windows are a reasonable choice for Electron utility UI.

**Concerns**
- `HIGH`: The current global 30s timeout in server.ts will break long-lived `/events` SSE unless that route is explicitly exempted.
- `HIGH`: This plan mixes queue runtime, IPC contract, SSE, tray changes, three windows, main-process wiring, and packaging. That is a large blast radius for a Collector that currently has no dedicated tests.
- `MEDIUM`: `run-log.html` looks like scope expansion. The requirement asks for persistent run history, not necessarily a dedicated Electron viewer in this phase.
- `MEDIUM`: CAPTCHA pause/resume needs one canonical state machine across queue, tray, window UI, and SSE. Otherwise states will drift.
- `MEDIUM`: IPC channels in preload.ts need a typed contract and allowlist, or the renderer boundary will become ad hoc.
- `MEDIUM`: Asset loading for `ui/` in dev vs packaged app needs explicit path handling, not just builder inclusion.

**Suggestions**
- Split this into smaller deliverables: queue runtime first, progress window second, settings/run-log UI last.
- Exempt `/events` from request timeout and add disconnect cleanup plus heartbeat.
- Define one shared event/state schema used by IPC and SSE.
- Consider deferring `run-log.html` unless it is necessary for phase acceptance.
- Add smoke tests for Electron startup, queue drain behavior, and SSE lifecycle.

**Risk Assessment:** HIGH

### Overall Verdict

The plans are mostly pointed in the right direction and should achieve the phase goal, but they are missing a few decisions that need to be locked before implementation:

- one owner for collection persistence
- one owner for run-log writes
- one source of truth for scheduler/job state
- one canonical runtime state model for `standby` / `collecting` / `captcha` / `error`

If those four boundaries are clarified first, Plan 01 becomes a solid start, Plans 02 and 03 become manageable, and Plan 04's risk drops materially.

---

## Consensus Summary

### Agreed Strengths
- **Passive network interception** (page.on('response')) is the correct approach for TikTok — both reviewers praise this over page.route()
- **Sequential batch queue** (one creator at a time) is the right trade-off for reliability, memory, and anti-detection
- **powerMonitor hooks** for App Nap recovery are necessary and well-designed
- **Plain HTML windows** for Electron UI avoid build complexity — both reviewers approve
- **Atomic JSON writes** and local-first storage model align well with project constraints
- **Auto-trim at 2x threshold** is a smart I/O optimization for the run log

### Agreed Concerns

| # | Concern | Severity | Plans | Raised By |
|---|---------|----------|-------|-----------|
| 1 | **Run log double-logging**: Plan 03 logs in POST /collect, Plan 04 also logs in BatchQueue — need single write owner | HIGH | 03, 04 | Codex, Gemini (implicit) |
| 2 | **Blocking missed-run dialog**: dialog.showMessageBox blocks main process, stacks on multiple missed jobs | HIGH | 02 | Gemini, Codex |
| 3 | **Tray status clobbering**: periodic tray status recomputation can overwrite transient collecting/captcha states | HIGH | 01, 04 | Codex |
| 4 | **Snapshot persistence ownership**: tiktok-collector.ts writes directly AND server.ts POST /collect also persists — dual paths | HIGH | 01, 03 | Codex |
| 5 | **CAPTCHA timeout in scheduled/background runs**: 5-min hardcoded timeout inappropriate for unattended collection | MEDIUM | 01, 04 | Gemini, Codex |
| 6 | **Event listener leaks**: page.on('response') listeners not cleaned up in persistent browser context | MEDIUM | 01 | Gemini, Codex |
| 7 | **File I/O concurrency**: read-modify-write without serialization risks lost updates under concurrent access | MEDIUM | 03 | Gemini, Codex |
| 8 | **Plan 04 blast radius**: too many moving parts (queue, IPC, SSE, 3 windows, tray, packaging) in one wave with no test surface | HIGH | 04 | Codex |
| 9 | **Missed-run detection on cold startup**: only resume/unlock covered, not app restart after downtime | HIGH | 02 | Codex |
| 10 | **TikTok API volatility**: silent failure if route structure or response schema changes | HIGH | 01 | Gemini |

### Divergent Views

| Topic | Gemini | Codex |
|-------|--------|-------|
| **DOM fallback strategy** | Not raised | Raised as MEDIUM — fallback trigger conditions, merge rules, and minimum completeness undefined |
| **Visual consistency of HTML windows** | Raised as MEDIUM — dark mode styling needs explicit handling | Not raised (accepted plain HTML as reasonable) |
| **run-log.html scope** | Not raised | Raised as MEDIUM — scope expansion beyond COLL-08 requirement |
| **Input validation on POST /collect** | Not raised | Raised as MEDIUM — needs platform/URL validation even on localhost |
| **Overall risk of Plan 04** | MEDIUM (architecture sound) | HIGH (blast radius too large without tests) |
| **Scheduler config dual source of truth** | Not raised | Raised as HIGH — config.ts + jobs.json need explicit separation |

---

*Review completed: 2026-03-31*
*Reviewers: Gemini CLI, Codex CLI*
