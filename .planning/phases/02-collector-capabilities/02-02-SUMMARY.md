---
phase: 02
plan: 02
title: Scheduler and Job Persistence
status: complete
started: "2026-03-31T21:45:00Z"
completed: "2026-03-31T22:00:00Z"
---

# Summary: Scheduler and Job Persistence

## What was built

Persistent job scheduler with node-cron, macOS App Nap recovery, and typed config.

## Key deliverables

1. **CollectorConfig upgrade** (`collector/src/config.ts`): Replaced placeholder scheduler fields with typed `SchedulerInterval`, `RetentionPolicy`, `postCount`. Added `runLog.retention` config section. Added `saveConfig()` for persisting mutations.

2. **Scheduler** (`collector/src/scheduler.ts`): 396-line module with ScheduledJob type, node-cron registration via preset interval map, powerMonitor hooks (resume, unlock-screen, user-did-become-active), non-blocking missed-run notifications via OS Notification + tray menu, cold startup missed-run detection. Jobs persisted to `~/.dashpersona/jobs.json` via atomicWriteJSON.

3. **main.ts wiring**: Scheduler initialized after ensureDataDir with placeholder enqueue function. Destroyed in before-quit handler.

## Key files

### Created
- `collector/src/scheduler.ts` — 396 lines, job scheduler with cron + powerMonitor

### Modified
- `collector/src/config.ts` — typed SchedulerInterval, RetentionPolicy, saveConfig()
- `collector/src/main.ts` — scheduler init + destroy wiring
- `collector/package.json` — node-cron + @types/node-cron

## Verification

- `npx tsc --noEmit` — passes (0 errors)
- 4 atomic commits

## Self-Check: PASSED
