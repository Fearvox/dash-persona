---
status: partial
phase: 02-collector-capabilities
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md]
started: "2026-04-01T01:41:55Z"
updated: "2026-04-01T02:02:38Z"
---

## Current Test

[testing complete]

## Tests

### 1. TikTok Collection via POST /collect
expected: With DASH Collector running, send a POST to http://localhost:3458/collect with a TikTok handle. The collector opens Chromium stealth, navigates to TikTok, intercepts the API responses, and returns a snapshot metadata object containing the creator's name, follower count, and post count. Progress window shows QUEUED → RUNNING → DONE. No CAPTCHA modal appears (or CAPTCHA is handled via the detected banner with manual/scheduled options).
result: pass

### 2. Scheduler — Interval Configuration Persists
expected: Open DASH Collector Settings. Enable scheduler. Set interval to "Every 6 hours" and post count to 10. Quit and relaunch the app. The scheduler setting is preserved — the dropdown shows "Every 6 hours" and the job is registered in the system.
result: pass

### 3. Scheduler — Missed Run Notification
expected: With a scheduled job set, trigger a missed run by letting the scheduled time pass while the app was quit (or the Mac was asleep). On next launch, a macOS notification appears: "Missed scheduled collection" with option to Run Now or Skip. Clicking Run Now triggers immediate collection.
result: pass

### 4. Run Log — GET /api/run-log Endpoint
expected: With the web app running (or directly hitting the Electron HTTP API), GET /api/run-log returns a JSON object with an "entries" array sorted newest-first. Each entry has platform, status, handle, timestamp, and error fields. Filter by ?platform=tiktok returns only TikTok entries. Filter by ?status=failed returns only failed entries.
result: pass

### 5. Run Log — Retention Policy Purge
expected: Open DASH Collector → Collection History (run log window). With more than the retention threshold entries, click Purge. A confirmation dialog appears (defaults to Keep All). Confirming deletion removes entries beyond the retention policy. The table updates immediately.
result: pass

### 6. Batch Queue — Sequential Processing
expected: Queue multiple TikTok handles for collection. The progress window shows only one item RUNNING at a time, others QUEUED. When the first completes (DONE/FAILED), the next item automatically starts. The status pills correctly reflect each item's state throughout.
result: pass

### 7. Progress Window — Live Elapsed Timer
expected: Start a TikTok collection. The progress window shows a live elapsed timer counting up from 0:00, and a progress bar that updates as posts are collected. If CAPTCHA is detected, a CAPTCHA banner appears with manual/scheduled options without blocking the window.
result: pass

### 8. Tray Icon — Dynamic Status States
expected: Check the system tray icon at each stage: idle shows green dot, collecting shows animated/spinner state, CAPTCHA detected shows yellow warning state, all done shows green check, error/failed shows red dot. The tray tooltip or menu reflects the current status accurately.
result: pass

## Summary

total: 8
passed: 8
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "DASH Collector app opens without corruption warning on macOS"
  status: failed
  reason: "Collector app shows '已损坏' (damaged) error on launch — cannot open the app"
  severity: blocker
  test: 6
  artifacts: []
  missing: []
