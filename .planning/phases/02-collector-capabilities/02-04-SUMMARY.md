---
phase: 02
plan: 04
title: Batch Queue, Progress UI, and Settings Window
status: complete
started: "2026-03-31T23:30:00Z"
completed: "2026-04-01T00:15:00Z"
---

# Summary: Batch Queue, Progress UI, and Settings Window

## What was built

Integration layer for Phase 2: BatchQueue state machine, three plain HTML UI windows (progress, settings, run log), extended preload IPC bridge, SSE endpoint for web app, extended tray with collection/captcha states and window callbacks, and full wiring in main.ts.

## Key deliverables

1. **BatchQueue** (`collector/src/batch-queue.ts`): Sequential job state machine processing one creator at a time. CAPTCHA detection pauses queue, supports 'manual' vs 'scheduled' context for timeout behavior (Review #8). Single owner of run-log writes (Review #1).

2. **Preload IPC bridge** (`collector/src/preload.ts`): Extended with batch (status-update, batch-complete, captcha-detected, captcha-resolved, cancel), settings (load, save, purge-runlog), runlog (open), and missed-run (respond) channels via contextBridge.

3. **SSE endpoint** (`collector/src/server.ts`): GET /events for real-time collection status streaming to web app. GET /run-log for collection history retrieval. broadcastSSE export for BatchQueue integration.

4. **TrayManager extensions** (`collector/src/tray.ts`): setCollectionState/clearCollectionState with lockStatus/unlockStatus (Review #3). Dynamic menu items for progress window, CAPTCHA browser, settings, collection history, and missed runs (Review #2). Callback slots for all actions.

5. **Progress window** (`collector/ui/progress.html`): 680x480 self-contained HTML with IPC-driven table, status pills (QUEUED/RUNNING/DONE/FAILED/CAPTCHA/SKIPPED), CAPTCHA banner, live elapsed timer, and progress bar.

6. **Settings window** (`collector/ui/settings.html`): 480x520 non-resizable HTML with scheduler toggle, interval/post count dropdowns, retention policy selector, and purge button.

7. **Run log window** (`collector/ui/run-log.html`): 720x560 resizable HTML with platform/status filters, sortable table, error detail expansion, empty state, and 10-second auto-refresh.

8. **main.ts integration**: BatchQueue update callbacks drive IPC to progress window and SSE to web app. Scheduler enqueue replaced with real BatchQueue. Window factories for all three windows. IPC handlers for all channels. Tray callbacks wired.

9. **electron-builder.json**: Added `ui/**` to files array for DMG bundling.

## Key files

### Created
- `collector/src/batch-queue.ts` — 234 lines, sequential job state machine
- `collector/ui/progress.html` — batch progress window
- `collector/ui/settings.html` — collector settings window
- `collector/ui/run-log.html` — collection history window

### Modified
- `collector/src/preload.ts` — full IPC bridge with 5 namespaces
- `collector/src/server.ts` — SSE endpoint + GET /run-log
- `collector/src/tray.ts` — collection states, window/missed-run callbacks
- `collector/src/main.ts` — full integration wiring (190 lines added)
- `collector/electron-builder.json` — ui/** bundling

## Review resolutions applied

| # | Concern | Resolution |
|---|---------|------------|
| 1 | Run-log double-logging | BatchQueue is sole run-log writer |
| 2 | Blocking missed-run dialog | Tray dynamic menu items + callbacks |
| 3 | Tray status clobbering | lockStatus/unlockStatus in set/clearCollectionState |
| 5 | Plan 04 blast radius | Tasks 1-3 verified, then 4-7, then 8, then 9 |
| 8 | CAPTCHA timeout for background | context field propagated through BatchQueue to collectTikTok |

## Verification

- `cd collector && npx tsc --noEmit` — passes (0 errors)
- All structural grep checks pass
- All 3 HTML files exist in collector/ui/
- electron-builder.json is valid JSON
- 9 atomic commits (1 pre-existing + 8 new)

## Self-Check: PASSED
