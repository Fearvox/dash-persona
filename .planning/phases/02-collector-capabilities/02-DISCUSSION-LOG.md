# Phase 2: Collector Capabilities - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 02-collector-capabilities
**Areas discussed:** TikTok collection strategy, Scheduler design, Batch progress UX, Run log & history

---

## TikTok Collection Strategy

### Data extraction approach

| Option | Description | Selected |
|--------|-------------|----------|
| Network interception | Intercept /api/user/detail/ and /api/post/item_list/ for structured JSON | |
| DOM scraping | Parse rendered page HTML for profile stats and posts | |
| Hybrid | Network intercept primary + DOM scrape fallback | ✓ |

**User's choice:** Hybrid
**Notes:** Maximizes reliability — structured API data when available, DOM fallback for gaps.

### Anti-fingerprint depth

| Option | Description | Selected |
|--------|-------------|----------|
| Standard stealth | Delete cdc_*, disable AutomationControlled, nav jitter | |
| Full stealth plugin | playwright-extra + stealth plugin for comprehensive masking | ✓ |
| Minimal | Only disable AutomationControlled | |

**User's choice:** Full stealth plugin
**Notes:** User wants maximum protection against TikTok detection.

### CAPTCHA handling

| Option | Description | Selected |
|--------|-------------|----------|
| Pause and notify user | Surface browser window for manual CAPTCHA solve, auto-resume | ✓ |
| Fail and retry later | Mark as failed, scheduler retries next interval | |
| Skip and continue batch | Skip CAPTCHA'd creator, continue with remaining | |

**User's choice:** Pause and notify user (Recommended)

### Post collection depth

| Option | Description | Selected |
|--------|-------------|----------|
| Latest 20 posts | Fast, matches engine expectations | |
| Latest 50 posts | Deeper analysis but slower, rate limit risk | |
| Configurable per job | Users set post count in scheduler config | ✓ |

**User's choice:** Configurable per job
**Notes:** Power users want flexibility.

---

## Scheduler Design

### Schedule configuration UI

| Option | Description | Selected |
|--------|-------------|----------|
| Preset intervals | Dropdown: every 6h, 12h, daily, weekly | ✓ |
| Cron expression | Power-user cron input | |
| Both | Presets + advanced cron toggle | |

**User's choice:** Preset intervals (Recommended)

### Missed run handling on wake

| Option | Description | Selected |
|--------|-------------|----------|
| Run immediately on wake | Auto-run missed jobs on resume | |
| Run at next scheduled time | Skip missed runs | |
| Queue missed + next | Run missed AND keep next scheduled | |
| Notify user with choices | Give user option: run now / wait / run later | ✓ |

**User's choice:** Other — "give users option to choose if they want to run now or do it later (scheduled or even later)"
**Notes:** User wants to stay in control. Notification with 3 choices.

### Job concurrency

| Option | Description | Selected |
|--------|-------------|----------|
| Sequential queue | One creator at a time, single context | ✓ |
| Parallel (2-3 tabs) | Multiple creators simultaneously | |
| You decide | Claude picks | |

**User's choice:** Sequential queue (Recommended)

---

## Batch Progress UX

### Progress display location

| Option | Description | Selected |
|--------|-------------|----------|
| Electron BrowserWindow | Dedicated window with status table | ✓ |
| Tray popover | Click tray for progress menu | |
| Web app integration | Progress in Next.js dashboard | |

**User's choice:** Electron BrowserWindow (Recommended)

### Real-time update mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| IPC to renderer | Electron IPC, native, fast | |
| SSE from Express | Server-Sent Events, works for web app too | |
| Polling | Simple but delayed | |

**User's choice:** Other — "我们能做1+2吗 这些选项都是我不熟悉的领域专有名词，你做选择"
**Notes:** User deferred to Claude. Decision: IPC (primary for Electron window) + SSE (secondary for web app consumption).

---

## Run Log & History

### Retention policy

| Option | Description | Selected |
|--------|-------------|----------|
| Last 100 entries | By count, auto-prune oldest | |
| Last 30 days | By time | |
| Keep all | Never delete | |
| User-configurable with confirmation | By count/days/all, confirm before pruning | ✓ |

**User's choice:** Other — "淘汰前需要询问用户意见，给按天数/条数淘汰选项，能选择范围，或全部保留"
**Notes:** User wants full control over retention. Settings panel with count/days/all options, confirmation dialog before any deletion.

### Web app access

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — via /api/run-log | New API route reads run-log.json | |
| No — Collector only | Run log only in Electron window | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide
**Notes:** Claude decision: Yes, create /api/run-log for Phase 3 dashboard integration.

---

## Claude's Discretion

- Real-time update mechanism: IPC + SSE dual approach
- Web app run log access: Yes, via /api/run-log route
- node-cron vs custom timer: Claude decides during planning
- BrowserWindow layout: Claude decides during planning
- SSE event format: Claude decides during planning

## Deferred Ideas

None — discussion stayed within phase scope
